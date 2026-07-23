"""Motor-backed implementation of :class:`RefreshTokenRepository`."""

from __future__ import annotations

from typing import Any

from motor.motor_asyncio import AsyncIOMotorCollection

from app.domain.entities.refresh_token import RefreshToken
from app.domain.ports.repositories import RefreshTokenRepository
from app.infrastructure.db.base_repository import MotorRepository, to_object_id


def _to_document(token: RefreshToken) -> dict[str, Any]:
    """Map a :class:`RefreshToken` entity to a MongoDB document (without ``_id``)."""
    return {
        "user_id": token.user_id,
        "jti": token.jti,
        "token_hash": token.token_hash,
        "user_agent": token.user_agent,
        "ip": token.ip,
        "expires_at": token.expires_at,
        "revoked": token.revoked,
        "created_at": token.created_at,
    }


def _from_document(doc: dict[str, Any]) -> RefreshToken:
    """Map a MongoDB document to a :class:`RefreshToken` entity."""
    return RefreshToken(
        id=str(doc["_id"]),
        user_id=doc["user_id"],
        jti=doc["jti"],
        token_hash=doc["token_hash"],
        user_agent=doc.get("user_agent"),
        ip=doc.get("ip"),
        expires_at=doc["expires_at"],
        revoked=doc.get("revoked", False),
        created_at=doc["created_at"],
    )


class MongoRefreshTokenRepository(MotorRepository, RefreshTokenRepository):
    """Persists refresh-token records in the ``refresh_tokens`` collection."""

    def __init__(self, collection: AsyncIOMotorCollection) -> None:
        super().__init__(collection)

    async def create(self, entity: RefreshToken) -> RefreshToken:
        """Insert a new refresh-token record and return it with its id."""
        result = await self._collection.insert_one(_to_document(entity))
        entity.id = str(result.inserted_id)
        return entity

    async def get(self, entity_id: str) -> RefreshToken | None:
        """Return the record with ``entity_id`` or None."""
        oid = to_object_id(entity_id)
        if oid is None:
            return None
        doc = await self._collection.find_one({"_id": oid})
        return _from_document(doc) if doc else None

    async def get_by_jti(self, jti: str) -> RefreshToken | None:
        """Return the refresh-token record for a ``jti`` or None."""
        doc = await self._collection.find_one({"jti": jti})
        return _from_document(doc) if doc else None

    async def update(self, entity: RefreshToken) -> RefreshToken:
        """Persist changes to an existing record and return it."""
        oid = to_object_id(entity.id or "")
        if oid is None:
            return entity
        await self._collection.update_one({"_id": oid}, {"$set": _to_document(entity)})
        return entity

    async def delete(self, entity_id: str) -> bool:
        """Delete a record by id; return True if a document was removed."""
        oid = to_object_id(entity_id)
        if oid is None:
            return False
        result = await self._collection.delete_one({"_id": oid})
        return result.deleted_count > 0

    async def revoke(self, jti: str) -> bool:
        """Mark the token with ``jti`` as revoked; return True if updated."""
        result = await self._collection.update_one(
            {"jti": jti}, {"$set": {"revoked": True}}
        )
        return result.modified_count > 0

    async def revoke_all_for_user(self, user_id: str) -> int:
        """Revoke every active token for a user; return the number revoked."""
        result = await self._collection.update_many(
            {"user_id": user_id, "revoked": False}, {"$set": {"revoked": True}}
        )
        return result.modified_count
