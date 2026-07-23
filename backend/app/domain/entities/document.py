"""Document entity — an ingested medical knowledge-base source (PDF)."""

from __future__ import annotations

from dataclasses import dataclass, field
from datetime import UTC, datetime
from enum import Enum


def _utcnow() -> datetime:
    """Return the current timezone-aware UTC time."""
    return datetime.now(UTC)


class DocumentStatus(str, Enum):
    """Lifecycle status of a knowledge-base document."""

    UPLOADED = "uploaded"
    PROCESSING = "processing"
    INDEXED = "indexed"
    FAILED = "failed"


@dataclass
class Document:
    """A source document in the medical knowledge base.

    Mirrors the ``documents`` collection (see ``docs/17_Database_Design.md``).
    ``content_hash`` enables duplicate detection; ``version`` increments when the
    same filename is re-ingested with different content.
    """

    filename: str
    title: str
    source: str
    mime: str
    uploaded_by: str
    file_path: str
    content_hash: str
    pages: int = 0
    chunk_count: int = 0
    version: int = 1
    status: DocumentStatus = DocumentStatus.UPLOADED
    embedding_provider: str | None = None
    vector_db: str | None = None
    error: str | None = None
    id: str | None = None
    created_at: datetime = field(default_factory=_utcnow)
    updated_at: datetime = field(default_factory=_utcnow)

    def touch(self) -> None:
        """Update the ``updated_at`` timestamp to now."""
        self.updated_at = _utcnow()
