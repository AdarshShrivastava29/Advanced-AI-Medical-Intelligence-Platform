"""DocumentChunk entity — one embedded text chunk of a document.

Backs the ``embeddings_metadata`` collection: it stores the chunk text and
locator so retrieval can return grounded citations, while the vector itself lives
in the vector store keyed by ``vector_id`` (see ``docs/13_RAG_Architecture.md``).
"""

from __future__ import annotations

from dataclasses import dataclass, field
from datetime import UTC, datetime


def _utcnow() -> datetime:
    """Return the current timezone-aware UTC time."""
    return datetime.now(UTC)


@dataclass
class DocumentChunk:
    """A single chunk of a document, aligned to its stored vector."""

    document_id: str
    filename: str
    chunk_index: int
    text: str
    vector_id: str
    embedding_provider: str
    dimension: int
    page: int = 0
    id: str | None = None
    created_at: datetime = field(default_factory=_utcnow)
