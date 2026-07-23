"""Local-filesystem :class:`FileStorage` adapter.

Writes artifacts under per-category directories (``UPLOAD_PATH`` / ``GRADCAM_PATH``)
and returns a ``/media/<category>/<filename>`` URL served by the static mount.
Filenames are confined to their category directory to prevent path traversal
(see ``docs/23_Security.md``).
"""

from __future__ import annotations

import asyncio
from pathlib import Path

from app.core.exceptions import ValidationError
from app.domain.ports.file_storage import FileStorage, StoredFile


class LocalFileStorage(FileStorage):
    """Stores artifacts on the local filesystem, one directory per category."""

    name = "local"

    def __init__(self, category_dirs: dict[str, str], *, url_prefix: str = "/media") -> None:
        self._dirs = {category: Path(path) for category, path in category_dirs.items()}
        self._url_prefix = url_prefix.rstrip("/")
        for directory in self._dirs.values():
            directory.mkdir(parents=True, exist_ok=True)

    async def save(self, category: str, filename: str, data: bytes) -> StoredFile:
        """Write ``data`` to ``<category>/<filename>`` and return its path + URL."""
        base = self._dirs.get(category)
        if base is None:
            raise ValidationError(f"Unknown storage category: {category!r}")
        safe_name = Path(filename).name  # strip any directory components
        destination = base / safe_name
        # Confine the resolved path within the category directory.
        if base.resolve() not in destination.resolve().parents:
            raise ValidationError("Invalid filename.")
        await asyncio.to_thread(destination.write_bytes, data)
        return StoredFile(
            path=str(destination),
            url=f"{self._url_prefix}/{category}/{safe_name}",
        )
