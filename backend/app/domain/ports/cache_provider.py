"""Cache provider port (``CacheProvider``).

Selected by ``CACHE_PROVIDER`` (memory | redis). Used for cache-aside on
expensive embedding/LLM/retrieval calls in later phases (see ``docs/25_Monitoring.md``
and ``docs/15_Embedding_System.md``).
"""

from __future__ import annotations

from abc import ABC, abstractmethod
from typing import Any


class CacheProvider(ABC):
    """Port for a simple key/value cache with optional TTL."""

    name: str = "abstract"

    @abstractmethod
    async def get(self, key: str) -> Any | None:
        """Return the cached value for ``key`` or None if absent/expired."""

    @abstractmethod
    async def set(self, key: str, value: Any, *, ttl_seconds: int | None = None) -> None:
        """Store ``value`` under ``key`` with an optional time-to-live."""

    @abstractmethod
    async def delete(self, key: str) -> None:
        """Remove ``key`` from the cache if present."""

    async def health(self) -> bool:
        """Lightweight readiness check. Adapters may override; default True."""
        return True
