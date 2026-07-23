"""Factory selecting the cache adapter from ``CACHE_PROVIDER``."""

from __future__ import annotations

from app.core.config import Settings
from app.core.exceptions import ConfigurationError
from app.domain.ports.cache_provider import CacheProvider
from app.infrastructure.providers.cache.memory_cache import MemoryCacheProvider
from app.infrastructure.providers.cache.redis_cache import RedisCacheProvider


def get_cache_provider(settings: Settings) -> CacheProvider:
    """Return the :class:`CacheProvider` selected by ``settings.cache_provider``.

    Raises:
        ConfigurationError: If the selector value is unsupported.
    """
    provider = settings.cache_provider
    if provider == "memory":
        return MemoryCacheProvider()
    if provider == "redis":
        return RedisCacheProvider(url=settings.redis_url)
    raise ConfigurationError(f"Unsupported CACHE_PROVIDER: {provider!r}")
