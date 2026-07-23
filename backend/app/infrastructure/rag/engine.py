"""RAG engine — the concrete :class:`RagEngine` composing all abstractions.

Ingestion: load -> clean -> chunk -> embed (``EmbeddingProvider``) -> index
(``VectorStore``) -> persist chunk metadata. Answering: embed query -> dense
recall (``VectorStore``) + BM25 -> RRF fuse -> MMR rerank -> compress -> grounded
generation via ``AIProvider`` with citations and refusal-on-insufficiency.

Every provider is injected via its port, so ``LLM_PROVIDER`` / ``EMBEDDING_PROVIDER``
/ ``VECTOR_DB`` are honoured with no change here (see ``docs/16_AI_Providers.md``).
"""

from __future__ import annotations

import asyncio

from app.core.config import Settings
from app.core.logging import get_logger
from app.domain.entities.document import Document, DocumentStatus
from app.domain.entities.document_chunk import DocumentChunk
from app.domain.ports.embedding_provider import EmbeddingProvider
from app.domain.ports.llm_provider import AIProvider
from app.domain.ports.rag import RagEngine
from app.domain.ports.repositories import DocumentChunkRepository, DocumentRepository
from app.domain.ports.vector_store import VectorStore
from app.domain.value_objects.rag import ChatAnswer, IngestResult
from app.infrastructure.rag.chunker import chunk_document
from app.infrastructure.rag.context import build_citations, compress_context, format_context
from app.infrastructure.rag.loader import load_pdf
from app.infrastructure.rag.prompt import (
    REFUSAL_MESSAGE,
    SYSTEM_PROMPT,
    build_user_prompt,
    preprocess_query,
    rewrite_query,
)
from app.infrastructure.rag.reranker import mmr_rerank
from app.infrastructure.rag.retriever import hybrid_retrieve

logger = get_logger(__name__)

_CONTEXT_BUDGET_CHARS = 4000


class RagRetrievalEngine(RagEngine):
    """Provider-agnostic ingestion + grounded retrieval engine."""

    def __init__(
        self,
        embedding_provider: EmbeddingProvider,
        vector_store: VectorStore,
        llm_provider: AIProvider,
        document_repository: DocumentRepository,
        chunk_repository: DocumentChunkRepository,
        settings: Settings,
    ) -> None:
        self._embeddings = embedding_provider
        self._vectors = vector_store
        self._llm = llm_provider
        self._documents = document_repository
        self._chunks = chunk_repository
        self._settings = settings
        self._index_lock = asyncio.Lock()

    async def load(self) -> None:
        """Restore a previously persisted vector index at startup (best-effort)."""
        try:
            await self._vectors.load()
        except Exception:
            logger.warning("rag.index.load_skipped")

    # ------------------------------------------------------------------ #
    # Ingestion
    # ------------------------------------------------------------------ #
    async def ingest(self, document: Document, raw_bytes: bytes) -> IngestResult:
        """Run the full ingestion pipeline and persist the document's chunks."""
        assert document.id is not None
        document.status = DocumentStatus.PROCESSING
        document.touch()
        await self._documents.update(document)

        loaded = load_pdf(raw_bytes, fallback_title=document.filename)
        chunks = chunk_document(
            loaded.pages,
            chunk_size=self._settings.rag_chunk_size,
            overlap=self._settings.rag_chunk_overlap,
        )
        if not chunks:
            document.status = DocumentStatus.FAILED
            document.error = "No extractable text found in the document."
            document.pages = loaded.page_count
            document.touch()
            await self._documents.update(document)
            logger.warning("rag.ingest.empty", document_id=document.id)
            return IngestResult(document_id=document.id, chunk_count=0, pages=loaded.page_count)

        texts = [c.text for c in chunks]
        vectors = await self._embeddings.embed(texts)
        vector_ids = [f"{document.id}:{c.index}" for c in chunks]
        metadatas = [{"document_id": document.id, "chunk_id": vid} for vid in vector_ids]

        async with self._index_lock:
            await self._vectors.add(vector_ids, vectors, metadatas)
            await self._vectors.persist()

        records = [
            DocumentChunk(
                document_id=document.id,
                filename=document.filename,
                chunk_index=chunk.index,
                text=chunk.text,
                vector_id=vector_ids[i],
                embedding_provider=self._embeddings.name,
                dimension=self._embeddings.dimension,
                page=chunk.page,
            )
            for i, chunk in enumerate(chunks)
        ]
        await self._chunks.add_many(records)

        document.status = DocumentStatus.INDEXED
        document.pages = loaded.page_count
        document.chunk_count = len(chunks)
        document.title = loaded.title
        document.embedding_provider = self._embeddings.name
        document.vector_db = self._vectors.name
        document.error = None
        document.touch()
        await self._documents.update(document)

        logger.info("rag.ingest.ok", document_id=document.id, chunks=len(chunks))
        return IngestResult(
            document_id=document.id, chunk_count=len(chunks), pages=loaded.page_count
        )

    async def remove_document(self, document_id: str) -> None:
        """Remove a document's chunks so it no longer surfaces in retrieval."""
        removed = await self._chunks.delete_by_document(document_id)
        logger.info("rag.document.removed", document_id=document_id, chunks=removed)

    # ------------------------------------------------------------------ #
    # Answering
    # ------------------------------------------------------------------ #
    async def answer(self, query: str, *, top_k: int | None = None) -> ChatAnswer:
        """Answer a query grounded strictly in retrieved context, with citations."""
        k = top_k or self._settings.rag_top_k
        clean_query = preprocess_query(query)
        corpus = await self._chunks.list_all()
        if not corpus:
            return ChatAnswer(answer=REFUSAL_MESSAGE, grounded=False)

        query_vector = await self._embeddings.embed_one(clean_query)
        dense_hits = await self._vectors.search(query_vector, k=k * 3)
        top_score = dense_hits[0].score if dense_hits else 0.0
        if not dense_hits or top_score < self._settings.rag_min_score:
            logger.info("rag.answer.refused", top_score=round(top_score, 4))
            return ChatAnswer(answer=REFUSAL_MESSAGE, grounded=False)

        candidates = hybrid_retrieve(
            rewrite_query(query),
            corpus,
            [hit.id for hit in dense_hits],
            k=k * 2,
        )
        reranked = mmr_rerank(candidates, k=k)
        selected = compress_context(reranked, max_chars=_CONTEXT_BUDGET_CHARS)
        if not selected:
            return ChatAnswer(answer=REFUSAL_MESSAGE, grounded=False)

        context = format_context(selected)
        citations = build_citations(selected)
        answer_text = await self._llm.generate(
            build_user_prompt(clean_query, context), system=SYSTEM_PROMPT, temperature=0.1
        )
        logger.info("rag.answer.ok", citations=len(citations), top_score=round(top_score, 4))
        return ChatAnswer(answer=answer_text, grounded=True, citations=citations)
