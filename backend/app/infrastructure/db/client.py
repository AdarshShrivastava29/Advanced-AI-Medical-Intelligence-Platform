"""MongoDB client lifecycle and index management.

Wraps the Motor async client so the rest of the app depends on a small, testable
surface. ``connect`` is called from the application lifespan; ``ping`` backs the
readiness probe (see ``docs/07_Backend_Architecture.md``, ``docs/25_Monitoring.md``).
"""

from __future__ import annotations

from motor.motor_asyncio import AsyncIOMotorClient, AsyncIOMotorDatabase

from app.core.exceptions import DependencyUnavailableError
from app.core.logging import get_logger

logger = get_logger(__name__)


class MongoDatabase:
    """Owns the Motor client and exposes the application database.

    Args:
        uri: MongoDB connection string.
        db_name: Logical database name.
        server_selection_timeout_ms: How long ``ping`` waits before failing.
    """

    def __init__(
        self,
        uri: str,
        db_name: str,
        *,
        server_selection_timeout_ms: int = 3000,
    ) -> None:
        self._uri = uri
        self._db_name = db_name
        self._timeout = server_selection_timeout_ms
        self._client: AsyncIOMotorClient | None = None

    @property
    def database(self) -> AsyncIOMotorDatabase:
        """Return the active database handle.

        Raises:
            DependencyUnavailableError: If the client has not been connected.
        """
        if self._client is None:
            raise DependencyUnavailableError("Database is not connected.")
        return self._client[self._db_name]

    async def connect(self) -> None:
        """Create the client and verify connectivity, then ensure indexes."""
        logger.info("db.connect.start", db=self._db_name)
        self._client = AsyncIOMotorClient(
            self._uri,
            serverSelectionTimeoutMS=self._timeout,
            uuidRepresentation="standard",
        )
        await self.ping()
        await self._ensure_indexes()
        logger.info("db.connect.ok", db=self._db_name)

    async def disconnect(self) -> None:
        """Close the client and release resources."""
        if self._client is not None:
            self._client.close()
            self._client = None
            logger.info("db.disconnect.ok")

    async def ping(self) -> bool:
        """Ping the server; raise :class:`DependencyUnavailableError` on failure."""
        if self._client is None:
            raise DependencyUnavailableError("Database is not connected.")
        try:
            await self._client.admin.command("ping")
            return True
        except Exception as exc:
            raise DependencyUnavailableError(f"Database ping failed: {exc}") from exc

    async def _ensure_indexes(self) -> None:
        """Create the indexes required by Phase 1 collections (idempotent)."""
        db = self.database
        await db["users"].create_index("email", unique=True)
        await db["refresh_tokens"].create_index("jti", unique=True)
        await db["refresh_tokens"].create_index("user_id")
        # TTL index: expired refresh tokens are purged automatically.
        await db["refresh_tokens"].create_index("expires_at", expireAfterSeconds=0)
        logger.info("db.indexes.ensured")
