"""Pinecone vector store adapter (``VECTOR_DB=pinecone``) — optional.

Provided for production/cloud deployments. The ``pinecone`` package is imported
lazily and this adapter is only constructed when ``VECTOR_DB=pinecone`` with a
configured ``PINECONE_API_KEY`` (see ``docs/14_Vector_Database.md``).
"""

from __future__ import annotations

from typing import Any

from app.core.exceptions import ConfigurationError
from app.domain.ports.vector_store import VectorHit, VectorStore


class PineconeVectorStore(VectorStore):
    """A Pinecone-backed :class:`VectorStore` for managed cloud indexing."""

    name = "pinecone"

    def __init__(self, api_key: str, index_name: str = "aimip") -> None:
        if not api_key:
            raise ConfigurationError("Pinecone provider requires PINECONE_API_KEY.")
        self._api_key = api_key
        self._index_name = index_name
        self._index: Any | None = None

    def _get_index(self) -> Any:
        """Lazily construct the Pinecone client and index handle."""
        if self._index is None:
            try:
                from pinecone import Pinecone
            except ImportError as exc:  # pragma: no cover - optional adapter
                raise ConfigurationError(
                    "The 'pinecone' package is not installed. Install it to use "
                    "VECTOR_DB=pinecone."
                ) from exc
            client = Pinecone(api_key=self._api_key)
            self._index = client.Index(self._index_name)
        return self._index

    async def add(
        self,
        ids: list[str],
        vectors: list[list[float]],
        metadatas: list[dict[str, Any]],
    ) -> None:
        """Upsert vectors with parallel ids/metadata into the index."""
        index = self._get_index()
        payload = [
            {"id": doc_id, "values": vector, "metadata": metadata}
            for doc_id, vector, metadata in zip(ids, vectors, metadatas, strict=False)
        ]
        index.upsert(vectors=payload)

    async def search(
        self,
        vector: list[float],
        *,
        k: int = 5,
        filter: dict[str, Any] | None = None,
    ) -> list[VectorHit]:
        """Return the ``k`` nearest neighbours, optionally metadata-filtered."""
        index = self._get_index()
        result = index.query(
            vector=vector, top_k=k, include_metadata=True, filter=filter or None
        )
        return [
            VectorHit(
                id=match["id"],
                score=float(match["score"]),
                metadata=match.get("metadata", {}),
            )
            for match in result.get("matches", [])
        ]

    async def persist(self) -> None:
        """No-op: Pinecone is a managed service that persists on upsert."""
        return None

    async def load(self) -> None:
        """No-op: Pinecone indexes are always available server-side."""
        return None
