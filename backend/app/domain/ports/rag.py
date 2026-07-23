"""RAG engine port (``RagEngine``).

The application (chat + document services) depends only on this port. The
concrete engine in ``app.infrastructure.rag`` composes the ENV-selected
``EmbeddingProvider``, ``VectorStore`` and ``AIProvider`` — so business logic
never knows which embedding model, vector database or LLM is in use
(see ``docs/13_RAG_Architecture.md``, ``docs/16_AI_Providers.md``).
"""

from __future__ import annotations

from abc import ABC, abstractmethod

from app.domain.entities.document import Document
from app.domain.value_objects.rag import ChatAnswer, IngestResult


class RagEngine(ABC):
    """Port for document ingestion and grounded question answering."""

    @abstractmethod
    async def ingest(self, document: Document, raw_bytes: bytes) -> IngestResult:
        """Load, clean, chunk, embed and index a document; persist its chunks."""

    @abstractmethod
    async def answer(self, query: str, *, top_k: int | None = None) -> ChatAnswer:
        """Answer ``query`` grounded only in retrieved context, with citations.

        Must refuse gracefully when retrieval does not surface sufficiently
        relevant context.
        """

    @abstractmethod
    async def remove_document(self, document_id: str) -> None:
        """Delete a document's chunks/vectors from the index."""

    @abstractmethod
    async def load(self) -> None:
        """Restore any persisted vector index at startup."""
