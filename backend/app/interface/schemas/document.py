"""Document (knowledge-base) response schemas."""

from __future__ import annotations

from datetime import datetime

from pydantic import BaseModel, Field

from app.domain.entities.document import Document


class DocumentResponse(BaseModel):
    """A knowledge-base document with its ingestion status."""

    id: str
    filename: str
    title: str
    source: str
    status: str
    pages: int
    chunk_count: int
    version: int
    embedding_provider: str | None = None
    vector_db: str | None = None
    error: str | None = None
    created_at: datetime


def to_document_response(document: Document) -> DocumentResponse:
    """Map a :class:`Document` entity to its response schema."""
    return DocumentResponse(
        id=document.id or "",
        filename=document.filename,
        title=document.title,
        source=document.source,
        status=document.status.value,
        pages=document.pages,
        chunk_count=document.chunk_count,
        version=document.version,
        embedding_provider=document.embedding_provider,
        vector_db=document.vector_db,
        error=document.error,
        created_at=document.created_at,
    )


class UploadAcceptedResponse(BaseModel):
    """202 response acknowledging an async ingestion job."""

    document: DocumentResponse
    message: str = Field(default="Document accepted and queued for ingestion.")
