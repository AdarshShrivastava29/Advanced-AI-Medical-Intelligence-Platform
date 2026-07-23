"""Google Gemini embedding adapter (``EMBEDDING_PROVIDER=gemini``).

The ``google-generativeai`` SDK is imported lazily. Default dimensions follow
``models/embedding-001`` (768).
"""

from __future__ import annotations

from app.core.exceptions import ConfigurationError
from app.domain.ports.embedding_provider import EmbeddingProvider


class GeminiEmbeddingProvider(EmbeddingProvider):
    """:class:`EmbeddingProvider` backed by the Gemini embeddings API."""

    name = "gemini"

    def __init__(self, api_key: str, model: str, *, dimension: int = 768) -> None:
        if not api_key:
            raise ConfigurationError("Gemini embeddings require a non-empty API key.")
        self._api_key = api_key
        self._model = model if model.startswith("models/") else "models/embedding-001"
        self._dimension = dimension
        self._configured = False

    @property
    def dimension(self) -> int:
        """Vector dimensionality for the configured model."""
        return self._dimension

    def _ensure_configured(self) -> object:
        """Lazily import and configure the Gemini SDK."""
        try:
            import google.generativeai as genai
        except ImportError as exc:  # pragma: no cover - exercised in RAG phase
            raise ConfigurationError(
                "The 'google-generativeai' package is not installed. Install it to "
                "use EMBEDDING_PROVIDER=gemini."
            ) from exc
        if not self._configured:
            genai.configure(api_key=self._api_key)
            self._configured = True
        return genai

    async def embed(self, texts: list[str]) -> list[list[float]]:
        """Embed a batch of texts via the Gemini embeddings API."""
        genai = self._ensure_configured()
        vectors: list[list[float]] = []
        for text in texts:
            result = genai.embed_content(model=self._model, content=text)  # type: ignore[attr-defined]
            vectors.append(result["embedding"])
        return vectors
