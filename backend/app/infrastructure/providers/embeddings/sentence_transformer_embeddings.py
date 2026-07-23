"""Local SentenceTransformers embedding adapter (``EMBEDDING_PROVIDER=sentence_transformer``).

Runs fully offline with no API key. The ``sentence-transformers`` package and the
model are loaded lazily on first use; encoding runs in a threadpool so it never
blocks the event loop.
"""

from __future__ import annotations

import asyncio

from app.core.exceptions import ConfigurationError
from app.domain.ports.embedding_provider import EmbeddingProvider

_MODEL_DIMENSIONS: dict[str, int] = {
    "all-MiniLM-L6-v2": 384,
    "all-mpnet-base-v2": 768,
}


class SentenceTransformerEmbeddingProvider(EmbeddingProvider):
    """:class:`EmbeddingProvider` backed by a local SentenceTransformers model."""

    name = "sentence_transformer"

    def __init__(self, model: str = "all-MiniLM-L6-v2") -> None:
        self._model_name = model
        self._dimension = _MODEL_DIMENSIONS.get(model, 384)
        self._model: object | None = None

    @property
    def dimension(self) -> int:
        """Vector dimensionality for the configured model."""
        return self._dimension

    def _get_model(self) -> object:
        """Lazily load the SentenceTransformer model, importing the package on demand."""
        if self._model is None:
            try:
                from sentence_transformers import SentenceTransformer
            except ImportError as exc:  # pragma: no cover - exercised in RAG phase
                raise ConfigurationError(
                    "The 'sentence-transformers' package is not installed. Install it "
                    "to use EMBEDDING_PROVIDER=sentence_transformer."
                ) from exc
            self._model = SentenceTransformer(self._model_name)
        return self._model

    async def embed(self, texts: list[str]) -> list[list[float]]:
        """Embed a batch of texts locally, off the event loop."""
        model = self._get_model()

        def _encode() -> list[list[float]]:
            vectors = model.encode(texts, convert_to_numpy=True, normalize_embeddings=True)  # type: ignore[attr-defined]
            return [vector.tolist() for vector in vectors]

        return await asyncio.to_thread(_encode)
