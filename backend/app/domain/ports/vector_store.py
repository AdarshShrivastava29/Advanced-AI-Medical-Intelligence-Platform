"""Vector store port (``VectorStore``).

Selected by ``VECTOR_DB`` (faiss | chroma | pinecone). Uniform ``add`` / ``search``
/ ``persist`` / ``load`` semantics let the RAG pipeline stay store-agnostic
(see ``docs/14_Vector_Database.md``).
"""

from __future__ import annotations

from abc import ABC, abstractmethod
from dataclasses import dataclass
from typing import Any


@dataclass(frozen=True)
class VectorHit:
    """A single search result: id, similarity score in [0, 1] and metadata."""

    id: str
    score: float
    metadata: dict[str, Any]


class VectorStore(ABC):
    """Port for vector similarity storage and retrieval."""

    name: str = "abstract"

    @abstractmethod
    async def add(
        self,
        ids: list[str],
        vectors: list[list[float]],
        metadatas: list[dict[str, Any]],
    ) -> None:
        """Insert or upsert vectors with parallel ids and metadata."""

    @abstractmethod
    async def search(
        self,
        vector: list[float],
        *,
        k: int = 5,
        filter: dict[str, Any] | None = None,
    ) -> list[VectorHit]:
        """Return the ``k`` nearest neighbours to ``vector``, optionally filtered."""

    @abstractmethod
    async def persist(self) -> None:
        """Flush the index to durable storage."""

    @abstractmethod
    async def load(self) -> None:
        """Load a previously persisted index, if any."""
