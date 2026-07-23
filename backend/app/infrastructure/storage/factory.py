"""Factory selecting the :class:`FileStorage` adapter.

Phase 2 ships the local-filesystem adapter. Future object stores (S3, MongoDB
GridFS) register here behind the same port; the ``STORAGE_PROVIDER`` selector is
reserved for that expansion (see ``docs/17_Database_Design.md``).
"""

from __future__ import annotations

from app.core.config import Settings
from app.domain.ports.file_storage import FileStorage
from app.infrastructure.storage.local_storage import LocalFileStorage

UPLOAD_CATEGORY = "uploads"
GRADCAM_CATEGORY = "gradcam"
DOCUMENTS_CATEGORY = "documents"


def get_file_storage(settings: Settings) -> FileStorage:
    """Return the configured :class:`FileStorage` (local filesystem)."""
    return LocalFileStorage(
        {
            UPLOAD_CATEGORY: settings.upload_path,
            GRADCAM_CATEGORY: settings.gradcam_path,
            DOCUMENTS_CATEGORY: settings.pdf_path,
        }
    )
