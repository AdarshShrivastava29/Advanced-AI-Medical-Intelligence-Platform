"""OpenAI embedding adapter (``EMBEDDING_PROVIDER=openai``).

The ``openai`` SDK is imported lazily. Default model dimensions follow the
canonical ``text-embedding-3-small`` (1536); other models can be supplied via
``EMBEDDING_MODEL`` with a matching ``dimension``.
"""

from __future__ import annotations

from app.core.exceptions import ConfigurationError
from app.domain.ports.embedding_provider import EmbeddingProvider

_MODEL_DIMENSIONS: dict[str, int] = {
    "text-embedding-3-small": 1536,
    "text-embedding-3-large": 3072,
    "text-embedding-ada-002": 1536,
}


class OpenAIEmbeddingProvider(EmbeddingProvider):
    """:class:`EmbeddingProvider` backed by the OpenAI embeddings API."""

    name = "openai"

    def __init__(self, api_key: str, model: str) -> None:
        if not api_key:
            raise ConfigurationError("OpenAI embeddings require a non-empty API key.")
        self._api_key = api_key
        self._model = model
        self._dimension = _MODEL_DIMENSIONS.get(model, 1536)
        self._client: object | None = None

    @property
    def dimension(self) -> int:
        """Vector dimensionality for the configured model."""
        return self._dimension

    def _get_client(self) -> object:
        """Lazily construct the async OpenAI client."""
        if self._client is None:
            try:
                from openai import AsyncOpenAI
            except ImportError as exc:  # pragma: no cover - exercised in RAG phase
                raise ConfigurationError(
                    "The 'openai' package is not installed. Install it to use "
                    "EMBEDDING_PROVIDER=openai."
                ) from exc
            self._client = AsyncOpenAI(api_key=self._api_key)
        return self._client

    async def embed(self, texts: list[str]) -> list[list[float]]:
        """Embed a batch of texts via the OpenAI embeddings API."""
        client = self._get_client()
        response = await client.embeddings.create(model=self._model, input=texts)  # type: ignore[attr-defined]
        return [item.embedding for item in response.data]
