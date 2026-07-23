"""Unit tests for the RAG engine: ingestion, grounded answering and refusal."""

from __future__ import annotations

import pytest

from app.domain.entities.document import Document, DocumentStatus
from app.infrastructure.rag.engine import RagRetrievalEngine
from app.infrastructure.rag.prompt import REFUSAL_MESSAGE
from tests.fakes import InMemoryDocumentChunkRepository, InMemoryDocumentRepository
from tests.helpers import make_pdf

pytestmark = pytest.mark.asyncio

_PNEUMONIA_TEXT = (
    "Pneumonia is a lung infection causing cough, fever and difficulty breathing. "
    "Treatment includes antibiotics, rest and hydration. Chest X-rays help diagnosis."
)


async def _ingest(
    engine: RagRetrievalEngine, documents: InMemoryDocumentRepository, text: str
) -> Document:
    doc = Document(
        filename="guide.pdf",
        title="guide.pdf",
        source="test",
        mime="application/pdf",
        uploaded_by="u1",
        file_path="/tmp/guide.pdf",
        content_hash="hash-1",
    )
    doc = await documents.create(doc)
    await engine.ingest(doc, make_pdf(text))
    return doc


async def test_empty_corpus_refuses(rag_engine: RagRetrievalEngine) -> None:
    answer = await rag_engine.answer("What causes pneumonia?")
    assert answer.grounded is False
    assert answer.answer == REFUSAL_MESSAGE


async def test_ingest_indexes_chunks(
    rag_engine: RagRetrievalEngine,
    rag_document_repo: InMemoryDocumentRepository,
    rag_chunk_repo: InMemoryDocumentChunkRepository,
) -> None:
    doc = await _ingest(rag_engine, rag_document_repo, _PNEUMONIA_TEXT)
    assert doc.status is DocumentStatus.INDEXED
    assert doc.chunk_count > 0
    assert len(await rag_chunk_repo.list_all()) == doc.chunk_count


async def test_answer_grounded_with_citations(
    rag_engine: RagRetrievalEngine, rag_document_repo: InMemoryDocumentRepository
) -> None:
    await _ingest(rag_engine, rag_document_repo, _PNEUMONIA_TEXT)
    answer = await rag_engine.answer("What are the symptoms and treatment of pneumonia?")
    assert answer.grounded is True
    assert answer.citations
    assert answer.citations[0].filename == "guide.pdf"
    assert answer.answer != REFUSAL_MESSAGE


async def test_answer_refuses_off_topic(
    rag_engine: RagRetrievalEngine, rag_document_repo: InMemoryDocumentRepository
) -> None:
    await _ingest(rag_engine, rag_document_repo, _PNEUMONIA_TEXT)
    answer = await rag_engine.answer("Explain quantum entanglement in distributed ledgers.")
    assert answer.grounded is False
    assert answer.answer == REFUSAL_MESSAGE


async def test_remove_document_clears_chunks(
    rag_engine: RagRetrievalEngine,
    rag_document_repo: InMemoryDocumentRepository,
    rag_chunk_repo: InMemoryDocumentChunkRepository,
) -> None:
    doc = await _ingest(rag_engine, rag_document_repo, _PNEUMONIA_TEXT)
    await rag_engine.remove_document(doc.id or "")
    assert await rag_chunk_repo.list_all() == []
