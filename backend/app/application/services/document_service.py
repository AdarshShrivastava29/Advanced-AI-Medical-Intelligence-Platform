"""Document ingestion service.

Handles PDF upload validation, duplicate detection, versioning, storage and
enqueuing asynchronous ingestion through the ``TaskQueue`` abstraction. The heavy
work (extraction/chunking/embedding/indexing) runs in the background job, not the
request path (see ``docs/26_Background_Jobs.md``).
"""

from __future__ import annotations

import hashlib

from app.core.config import Settings
from app.core.exceptions import ConflictError, NotFoundError, ValidationError
from app.core.logging import get_logger
from app.domain.entities.document import Document, DocumentStatus
from app.domain.ports.file_storage import FileStorage
from app.domain.ports.rag import RagEngine
from app.domain.ports.repositories import DocumentRepository
from app.domain.ports.task_queue import TaskQueue
from app.infrastructure.storage.factory import DOCUMENTS_CATEGORY

logger = get_logger(__name__)

INGEST_JOB = "ingest_document"
_PDF_MAGIC = b"%PDF-"


class DocumentService:
    """Coordinates knowledge-base document uploads and lifecycle."""

    def __init__(
        self,
        document_repository: DocumentRepository,
        rag_engine: RagEngine,
        file_storage: FileStorage,
        task_queue: TaskQueue,
        settings: Settings,
    ) -> None:
        self._documents = document_repository
        self._rag = rag_engine
        self._storage = file_storage
        self._queue = task_queue
        self._settings = settings

    async def upload(
        self, *, user_id: str, filename: str, content_type: str, data: bytes, source: str = "upload"
    ) -> Document:
        """Validate, store and enqueue a PDF for asynchronous ingestion.

        Raises:
            ValidationError: If the file is empty, too large, or not a PDF.
            ConflictError: If an identical document was already uploaded.
        """
        self._validate(data, content_type)
        content_hash = hashlib.sha256(data).hexdigest()

        duplicate = await self._documents.get_by_hash(content_hash)
        if duplicate is not None:
            raise ConflictError("This document has already been uploaded.")

        version = await self._documents.latest_version(filename) + 1
        token = content_hash[:16]
        stored = await self._storage.save(DOCUMENTS_CATEGORY, f"{token}.pdf", data)

        document = Document(
            filename=filename,
            title=filename,
            source=source,
            mime="application/pdf",
            uploaded_by=user_id,
            file_path=stored.path,
            content_hash=content_hash,
            version=version,
            status=DocumentStatus.UPLOADED,
        )
        document = await self._documents.create(document)

        await self._queue.enqueue(INGEST_JOB, {"document_id": document.id})
        logger.info("document.uploaded", document_id=document.id, version=version)
        return document

    async def list_documents(
        self, *, page: int = 1, size: int = 20
    ) -> tuple[list[Document], int]:
        """Return a page of documents and the total count."""
        page = max(page, 1)
        size = max(min(size, 100), 1)
        docs = await self._documents.list_all(skip=(page - 1) * size, limit=size)
        total = await self._documents.count()
        return docs, total

    async def get(self, document_id: str) -> Document:
        """Return a document by id.

        Raises:
            NotFoundError: If it does not exist.
        """
        document = await self._documents.get(document_id)
        if document is None:
            raise NotFoundError("Document not found.")
        return document

    async def delete(self, document_id: str) -> None:
        """Delete a document and remove its chunks from the index."""
        document = await self._documents.get(document_id)
        if document is None:
            raise NotFoundError("Document not found.")
        await self._rag.remove_document(document_id)
        await self._documents.delete(document_id)
        logger.info("document.deleted", document_id=document_id)

    def _validate(self, data: bytes, content_type: str) -> None:
        """Validate an uploaded PDF (size, declared type, magic bytes)."""
        if not data:
            raise ValidationError("Uploaded file is empty.")
        if len(data) > self._settings.max_upload_size:
            raise ValidationError(
                f"File exceeds the maximum size of {self._settings.max_upload_size} bytes."
            )
        declared = (content_type or "").split(";")[0].strip().lower()
        if declared not in {"application/pdf", "application/x-pdf"}:
            raise ValidationError("Only PDF documents are supported.")
        if not data.startswith(_PDF_MAGIC):
            raise ValidationError("File content is not a valid PDF.")
