"""Redis cache adapter (``CACHE_PROVIDER=redis``).

The ``redis`` package is imported lazily so the abstraction loads without it.
Values are JSON-serialised for language-neutral storage.
"""

from __future__ import annotations

import json
from typing import Any

from app.core.exceptions import ConfigurationError
from app.domain.ports.cache_provider import CacheProvider


class RedisCacheProvider(CacheProvider):
    """A Redis-backed :class:`CacheProvider` for shared, multi-instance caching."""

    name = "redis"

    def __init__(self, url: str) -> None:
        self._url = url
        self._client: object | None = None

    def _get_client(self) -> object:
        """Lazily construct the async Redis client, importing the package on demand."""
        if self._client is None:
            try:
                from redis.asyncio import Redis  # type: ignore[import-untyped]
            except ImportError as exc:  # pragma: no cover - exercised when redis enabled
                raise ConfigurationError(
                    "The 'redis' package is not installed. Install it to use "
                    "CACHE_PROVIDER=redis."
                ) from exc
            self._client = Redis.from_url(self._url, decode_responses=True)
        return self._client

    async def get(self, key: str) -> Any | None:
        """Return the JSON-decoded cached value for ``key`` or None."""
        client = self._get_client()
        raw = await client.get(key)  # type: ignore[attr-defined]
        return json.loads(raw) if raw is not None else None

    async def set(self, key: str, value: Any, *, ttl_seconds: int | None = None) -> None:
        """Store the JSON-encoded ``value`` under ``key`` with an optional TTL."""
        client = self._get_client()
        await client.set(key, json.dumps(value), ex=ttl_seconds)  # type: ignore[attr-defined]

    async def delete(self, key: str) -> None:
        """Remove ``key`` from Redis if present."""
        client = self._get_client()
        await client.delete(key)  # type: ignore[attr-defined]

    async def health(self) -> bool:
        """Ping Redis; return False if unreachable."""
        try:
            client = self._get_client()
            return bool(await client.ping())  # type: ignore[attr-defined]
        except Exception:
            return False
