"""Document-ingestion background job.

Reads the stored PDF and runs the :class:`RagEngine` ingestion pipeline. On
failure the document is marked ``FAILED`` with an error message so progress is
observable via ``GET /documents`` (see ``docs/26_Background_Jobs.md``).
"""

from __future__ import annotations

from collections.abc import Awaitable, Callable
from pathlib import Path
from typing import Any

from app.core.logging import get_logger
from app.domain.entities.document import DocumentStatus
from app.domain.ports.rag import RagEngine
from app.domain.ports.repositories import DocumentRepository

logger = get_logger(__name__)

IngestHandler = Callable[[dict[str, Any]], Awaitable[None]]


def make_ingest_handler(
    document_repository: DocumentRepository, rag_engine: RagEngine
) -> IngestHandler:
    """Build the ingest job handler bound to its dependencies.

    Returns a coroutine suitable for registration on the in-process TaskQueue.
    """

    async def handle(payload: dict[str, Any]) -> None:
        document_id = payload.get("document_id")
        if not document_id:
            logger.warning("ingest.missing_document_id")
            return
        document = await document_repository.get(document_id)
        if document is None:
            logger.warning("ingest.document_not_found", document_id=document_id)
            return
        try:
            raw_bytes = Path(document.file_path).read_bytes()
            result = await rag_engine.ingest(document, raw_bytes)
            logger.info("ingest.done", document_id=document_id, chunks=result.chunk_count)
        except Exception as exc:
            logger.exception("ingest.failed", document_id=document_id)
            document.status = DocumentStatus.FAILED
            document.error = str(exc)[:500]
            document.touch()
            await document_repository.update(document)

    return handle
