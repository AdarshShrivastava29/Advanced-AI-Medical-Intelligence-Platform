"""Factory selecting the LLM adapter from ``LLM_PROVIDER``.

This is the *only* place that knows the mapping from selector string to concrete
class. Business logic depends on :class:`AIProvider`; changing ``LLM_PROVIDER``
in the environment swaps the implementation with no code change.
"""

from __future__ import annotations

from app.core.config import Settings
from app.core.exceptions import ConfigurationError
from app.domain.ports.llm_provider import AIProvider
from app.infrastructure.providers.llm.gemini_provider import GeminiLLMProvider
from app.infrastructure.providers.llm.mock_provider import MockLLMProvider
from app.infrastructure.providers.llm.openai_provider import OpenAILLMProvider


def get_llm_provider(settings: Settings) -> AIProvider:
    """Return the :class:`AIProvider` selected by ``settings.llm_provider``.

    Raises:
        ConfigurationError: If the selector value is unsupported.
    """
    provider = settings.llm_provider
    if provider == "openai":
        return OpenAILLMProvider(api_key=settings.openai_api_key, model=settings.llm_model)
    if provider == "gemini":
        return GeminiLLMProvider(api_key=settings.gemini_api_key, model=settings.llm_model)
    if provider == "mock":
        return MockLLMProvider()
    raise ConfigurationError(f"Unsupported LLM_PROVIDER: {provider!r}")
