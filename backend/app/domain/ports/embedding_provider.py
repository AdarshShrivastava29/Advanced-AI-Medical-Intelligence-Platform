"""Embedding provider port (``EmbeddingProvider``).

Selected by ``EMBEDDING_PROVIDER``. The same provider must be used for ingest
and query so vector dimensions stay compatible (see ``docs/15_Embedding_System.md``).
"""

from __future__ import annotations

from abc import ABC, abstractmethod


class EmbeddingProvider(ABC):
    """Port for turning text into dense vectors."""

    name: str = "abstract"

    @property
    @abstractmethod
    def dimension(self) -> int:
        """The dimensionality of vectors produced by this provider."""

    @abstractmethod
    async def embed(self, texts: list[str]) -> list[list[float]]:
        """Embed a batch of texts, returning one vector per input text."""

    async def embed_one(self, text: str) -> list[float]:
        """Convenience wrapper to embed a single string."""
        vectors = await self.embed([text])
        return vectors[0]
