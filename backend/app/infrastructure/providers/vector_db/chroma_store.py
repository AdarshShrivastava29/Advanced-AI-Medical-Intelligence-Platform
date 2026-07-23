"""Chroma vector store adapter (``VECTOR_DB=chroma``).

The ``chromadb`` package is imported lazily. Uses a persistent client rooted at
``VECTOR_INDEX_PATH`` so the collection survives restarts.
"""

from __future__ import annotations

from typing import Any

from app.core.exceptions import ConfigurationError
from app.domain.ports.vector_store import VectorHit, VectorStore


class ChromaVectorStore(VectorStore):
    """A Chroma-backed :class:`VectorStore`."""

    name = "chroma"

    def __init__(self, index_path: str, collection_name: str = "aimip_documents") -> None:
        self._path = index_path
        self._collection_name = collection_name
        self._collection: Any | None = None

    def _get_collection(self) -> Any:
        """Lazily create the persistent client and collection."""
        if self._collection is None:
            try:
                import chromadb
            except ImportError as exc:  # pragma: no cover - exercised in RAG phase
                raise ConfigurationError(
                    "The 'chromadb' package is not installed. Install it to use "
                    "VECTOR_DB=chroma."
                ) from exc
            client = chromadb.PersistentClient(path=self._path)
            self._collection = client.get_or_create_collection(
                self._collection_name, metadata={"hnsw:space": "cosine"}
            )
        return self._collection

    async def add(
        self,
        ids: list[str],
        vectors: list[list[float]],
        metadatas: list[dict[str, Any]],
    ) -> None:
        """Upsert vectors with parallel ids/metadata."""
        collection = self._get_collection()
        collection.upsert(ids=ids, embeddings=vectors, metadatas=metadatas)

    async def search(
        self,
        vector: list[float],
        *,
        k: int = 5,
        filter: dict[str, Any] | None = None,
    ) -> list[VectorHit]:
        """Return the ``k`` nearest neighbours, optionally metadata-filtered."""
        collection = self._get_collection()
        result = collection.query(
            query_embeddings=[vector], n_results=k, where=filter or None
        )
        hits: list[VectorHit] = []
        ids = result.get("ids", [[]])[0]
        distances = result.get("distances", [[]])[0]
        metadatas = result.get("metadatas", [[]])[0]
        for doc_id, distance, metadata in zip(ids, distances, metadatas, strict=False):
            # Chroma returns cosine distance; convert to a [0, 1] similarity score.
            hits.append(
                VectorHit(id=doc_id, score=1.0 - float(distance), metadata=metadata or {})
            )
        return hits

    async def persist(self) -> None:
        """No-op: the persistent client writes through on every mutation."""
        return None

    async def load(self) -> None:
        """No-op: the persistent client loads lazily on first access."""
        return None
