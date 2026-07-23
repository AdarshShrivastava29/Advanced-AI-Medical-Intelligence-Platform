"""Unit tests for the provider factories and the provider-swap guarantee.

Verifies each factory returns the adapter selected by ENV and that switching the
selector changes the concrete type with no other change — the core promise of the
provider-abstraction layer (see docs/16_AI_Providers.md).
"""

from __future__ import annotations

import pytest

from app.core.config import Settings
from app.core.exceptions import ConfigurationError
from app.domain.ports.cache_provider import CacheProvider
from app.domain.ports.llm_provider import AIProvider
from app.domain.ports.task_queue import TaskQueue
from app.infrastructure.providers.cache.factory import get_cache_provider
from app.infrastructure.providers.embeddings.factory import get_embedding_provider
from app.infrastructure.providers.llm.factory import get_llm_provider
from app.infrastructure.providers.task_queue.factory import get_task_queue
from app.infrastructure.providers.vector_db.factory import get_vector_store


def _settings(**overrides: object) -> Settings:
    base: dict[str, object] = {
        "_env_file": None,
        "llm_provider": "mock",
        "embedding_provider": "sentence_transformer",
        "jwt_secret": "x" * 40,
    }
    base.update(overrides)
    return Settings(**base)  # type: ignore[arg-type]


def test_llm_factory_returns_mock_by_default() -> None:
    provider = get_llm_provider(_settings())
    assert isinstance(provider, AIProvider)
    assert provider.name == "mock"


def test_llm_swap_to_openai_changes_adapter_only() -> None:
    openai_provider = get_llm_provider(
        _settings(llm_provider="openai", openai_api_key="sk-test")
    )
    assert openai_provider.name == "openai"
    gemini_provider = get_llm_provider(
        _settings(llm_provider="gemini", gemini_api_key="g-test")
    )
    assert gemini_provider.name == "gemini"


def test_cache_factory_selects_memory() -> None:
    provider = get_cache_provider(_settings(cache_provider="memory"))
    assert isinstance(provider, CacheProvider)
    assert provider.name == "memory"


def test_task_queue_factory_selects_inprocess() -> None:
    queue = get_task_queue(_settings(task_queue="inprocess"))
    assert isinstance(queue, TaskQueue)
    assert queue.name == "inprocess"


def test_embedding_factory_selects_sentence_transformer() -> None:
    provider = get_embedding_provider(_settings(embedding_provider="sentence_transformer"))
    assert provider.name == "sentence_transformer"
    assert provider.dimension == 384


def test_vector_store_factory_selects_faiss() -> None:
    store = get_vector_store(_settings(vector_db="faiss"), dimension=384)
    assert store.name == "faiss"


def test_unsupported_llm_selector_raises() -> None:
    settings = _settings()
    # Bypass the Literal validator to simulate an unknown selector reaching the factory.
    object.__setattr__(settings, "llm_provider", "bogus")
    with pytest.raises(ConfigurationError):
        get_llm_provider(settings)


@pytest.mark.asyncio
async def test_mock_llm_generates_deterministic_text() -> None:
    provider = get_llm_provider(_settings())
    result = await provider.generate("Hello world")
    assert result.startswith("[MOCK LLM RESPONSE]")
    assert "Hello world" in result
