"""File-storage port (``FileStorage``) for binary artifacts (images, Grad-CAM).

Abstracts *where* image bytes live so business logic never touches the
filesystem, S3 or GridFS directly. Phase 2 ships a local-filesystem adapter;
future adapters (S3, MongoDB GridFS) implement the same port with no change to
callers (see ``docs/17_Database_Design.md`` storage notes).
"""

from __future__ import annotations

from abc import ABC, abstractmethod
from dataclasses import dataclass


@dataclass(frozen=True)
class StoredFile:
    """A stored artifact: its backend path and the URL clients use to fetch it."""

    path: str
    url: str


class FileStorage(ABC):
    """Port for persisting and locating binary artifacts."""

    name: str = "abstract"

    @abstractmethod
    async def save(self, category: str, filename: str, data: bytes) -> StoredFile:
        """Persist ``data`` under ``category`` with ``filename``; return its location.

        Args:
            category: Logical bucket (e.g. ``"uploads"`` or ``"gradcam"``).
            filename: The object filename (should be collision-safe).
            data: The raw bytes to store.
        """
