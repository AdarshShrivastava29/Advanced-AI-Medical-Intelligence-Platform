"""Factory selecting the embedding adapter from ``EMBEDDING_PROVIDER``."""

from __future__ import annotations

from app.core.config import Settings
from app.core.exceptions import ConfigurationError
from app.domain.ports.embedding_provider import EmbeddingProvider
from app.infrastructure.providers.embeddings.gemini_embeddings import GeminiEmbeddingProvider
from app.infrastructure.providers.embeddings.openai_embeddings import OpenAIEmbeddingProvider
from app.infrastructure.providers.embeddings.sentence_transformer_embeddings import (
    SentenceTransformerEmbeddingProvider,
)


def get_embedding_provider(settings: Settings) -> EmbeddingProvider:
    """Return the :class:`EmbeddingProvider` selected by ``settings.embedding_provider``.

    Raises:
        ConfigurationError: If the selector value is unsupported.
    """
    provider = settings.embedding_provider
    if provider == "openai":
        return OpenAIEmbeddingProvider(
            api_key=settings.openai_api_key, model=settings.embedding_model
        )
    if provider == "gemini":
        return GeminiEmbeddingProvider(
            api_key=settings.gemini_api_key, model=settings.embedding_model
        )
    if provider == "sentence_transformer":
        return SentenceTransformerEmbeddingProvider()
    raise ConfigurationError(f"Unsupported EMBEDDING_PROVIDER: {provider!r}")
