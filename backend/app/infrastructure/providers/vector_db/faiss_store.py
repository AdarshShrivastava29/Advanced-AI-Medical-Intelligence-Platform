"""FAISS vector store adapter (``VECTOR_DB=faiss``).

Uses an inner-product index over L2-normalised vectors (equivalent to cosine
similarity), with an id/metadata sidecar persisted next to the index at
``VECTOR_INDEX_PATH``. ``faiss`` and ``numpy`` are imported lazily so the
abstraction loads without them (see ``docs/14_Vector_Database.md``).
"""

from __future__ import annotations

import json
from pathlib import Path
from typing import Any

from app.core.exceptions import ConfigurationError
from app.domain.ports.vector_store import VectorHit, VectorStore


class FaissVectorStore(VectorStore):
    """A local FAISS-backed :class:`VectorStore` with on-disk persistence."""

    name = "faiss"

    def __init__(self, dimension: int, index_path: str) -> None:
        self._dimension = dimension
        self._dir = Path(index_path)
        self._index: Any | None = None
        self._ids: list[str] = []
        self._metadatas: list[dict[str, Any]] = []

    def _require_faiss(self) -> Any:
        """Lazily import faiss, raising a clear error if unavailable."""
        try:
            import faiss
        except ImportError as exc:  # pragma: no cover - exercised in RAG phase
            raise ConfigurationError(
                "The 'faiss-cpu' package is not installed. Install it to use VECTOR_DB=faiss."
            ) from exc
        return faiss

    def _ensure_index(self) -> Any:
        """Create the FAISS index on first use."""
        if self._index is None:
            faiss = self._require_faiss()
            self._index = faiss.IndexFlatIP(self._dimension)
        return self._index

    @staticmethod
    def _normalise(faiss: Any, vectors: list[list[float]]) -> Any:
        """Return an L2-normalised float32 matrix for cosine similarity."""
        import numpy as np

        matrix = np.asarray(vectors, dtype="float32")
        faiss.normalize_L2(matrix)
        return matrix

    async def add(
        self,
        ids: list[str],
        vectors: list[list[float]],
        metadatas: list[dict[str, Any]],
    ) -> None:
        """Add vectors with parallel ids/metadata to the index."""
        faiss = self._require_faiss()
        index = self._ensure_index()
        index.add(self._normalise(faiss, vectors))
        self._ids.extend(ids)
        self._metadatas.extend(metadatas)

    async def search(
        self,
        vector: list[float],
        *,
        k: int = 5,
        filter: dict[str, Any] | None = None,
    ) -> list[VectorHit]:
        """Return the ``k`` nearest neighbours to ``vector``."""
        if self._index is None or not self._ids:
            return []
        faiss = self._require_faiss()
        query = self._normalise(faiss, [vector])
        scores, indices = self._index.search(query, min(k, len(self._ids)))
        hits: list[VectorHit] = []
        for score, idx in zip(scores[0], indices[0], strict=False):
            if idx < 0:
                continue
            metadata = self._metadatas[idx]
            if filter and not all(metadata.get(kk) == vv for kk, vv in filter.items()):
                continue
            hits.append(VectorHit(id=self._ids[idx], score=float(score), metadata=metadata))
        return hits

    async def persist(self) -> None:
        """Write the index and id/metadata sidecar to ``VECTOR_INDEX_PATH``."""
        if self._index is None:
            return
        faiss = self._require_faiss()
        self._dir.mkdir(parents=True, exist_ok=True)
        faiss.write_index(self._index, str(self._dir / "index.faiss"))
        (self._dir / "sidecar.json").write_text(
            json.dumps({"ids": self._ids, "metadatas": self._metadatas}),
            encoding="utf-8",
        )

    async def load(self) -> None:
        """Load a previously persisted index if one exists at ``VECTOR_INDEX_PATH``."""
        index_file = self._dir / "index.faiss"
        sidecar_file = self._dir / "sidecar.json"
        if not index_file.exists() or not sidecar_file.exists():
            return
        faiss = self._require_faiss()
        self._index = faiss.read_index(str(index_file))
        sidecar = json.loads(sidecar_file.read_text(encoding="utf-8"))
        self._ids = sidecar["ids"]
        self._metadatas = sidecar["metadatas"]
