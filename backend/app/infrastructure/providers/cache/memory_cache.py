"""In-memory cache adapter (``CACHE_PROVIDER=memory``).

Process-local, TTL-aware and dependency-free — the default for local development
and tests. Not shared across processes; use the Redis adapter for multi-instance
deployments.
"""

from __future__ import annotations

import time
from typing import Any

from app.domain.ports.cache_provider import CacheProvider


class MemoryCacheProvider(CacheProvider):
    """A simple thread-unsafe-but-async-safe in-memory TTL cache."""

    name = "memory"

    def __init__(self) -> None:
        # key -> (value, expires_at_epoch or None)
        self._store: dict[str, tuple[Any, float | None]] = {}

    async def get(self, key: str) -> Any | None:
        """Return the cached value for ``key`` or None if absent/expired."""
        entry = self._store.get(key)
        if entry is None:
            return None
        value, expires_at = entry
        if expires_at is not None and time.monotonic() >= expires_at:
            self._store.pop(key, None)
            return None
        return value

    async def set(self, key: str, value: Any, *, ttl_seconds: int | None = None) -> None:
        """Store ``value`` under ``key`` with an optional TTL in seconds."""
        expires_at = time.monotonic() + ttl_seconds if ttl_seconds else None
        self._store[key] = (value, expires_at)

    async def delete(self, key: str) -> None:
        """Remove ``key`` from the cache if present."""
        self._store.pop(key, None)
