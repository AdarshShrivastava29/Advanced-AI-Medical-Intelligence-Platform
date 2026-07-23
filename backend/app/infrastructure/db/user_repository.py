"""Motor-backed implementation of :class:`UserRepository`."""

from __future__ import annotations

from typing import Any

from motor.motor_asyncio import AsyncIOMotorCollection

from app.domain.entities.user import User
from app.domain.ports.repositories import UserRepository
from app.domain.value_objects.role import Role
from app.infrastructure.db.base_repository import MotorRepository, to_object_id


def _to_document(user: User) -> dict[str, Any]:
    """Map a :class:`User` entity to a MongoDB document (without ``_id``)."""
    return {
        "email": user.email.lower(),
        "full_name": user.full_name,
        "password_hash": user.hashed_password,
        "role": user.role.value,
        "is_active": user.is_active,
        "failed_login_attempts": user.failed_login_attempts,
        "locked_until": user.locked_until,
        "last_login": user.last_login,
        "created_at": user.created_at,
        "updated_at": user.updated_at,
    }


def _from_document(doc: dict[str, Any]) -> User:
    """Map a MongoDB document to a :class:`User` entity."""
    return User(
        id=str(doc["_id"]),
        email=doc["email"],
        full_name=doc["full_name"],
        hashed_password=doc["password_hash"],
        role=Role(doc.get("role", Role.USER.value)),
        is_active=doc.get("is_active", True),
        failed_login_attempts=doc.get("failed_login_attempts", 0),
        locked_until=doc.get("locked_until"),
        last_login=doc.get("last_login"),
        created_at=doc["created_at"],
        updated_at=doc["updated_at"],
    )


class MongoUserRepository(MotorRepository, UserRepository):
    """Persists :class:`User` aggregates in the ``users`` collection."""

    def __init__(self, collection: AsyncIOMotorCollection) -> None:
        super().__init__(collection)

    async def create(self, entity: User) -> User:
        """Insert a new user and return it with its generated id."""
        result = await self._collection.insert_one(_to_document(entity))
        entity.id = str(result.inserted_id)
        return entity

    async def get(self, entity_id: str) -> User | None:
        """Return the user with ``entity_id`` or None."""
        oid = to_object_id(entity_id)
        if oid is None:
            return None
        doc = await self._collection.find_one({"_id": oid})
        return _from_document(doc) if doc else None

    async def get_by_email(self, email: str) -> User | None:
        """Return the user with the given email (case-insensitive) or None."""
        doc = await self._collection.find_one({"email": email.lower()})
        return _from_document(doc) if doc else None

    async def update(self, entity: User) -> User:
        """Persist changes to an existing user and return it."""
        oid = to_object_id(entity.id or "")
        if oid is None:
            return entity
        entity.touch()
        await self._collection.update_one({"_id": oid}, {"$set": _to_document(entity)})
        return entity

    async def delete(self, entity_id: str) -> bool:
        """Delete a user by id; return True if a document was removed."""
        oid = to_object_id(entity_id)
        if oid is None:
            return False
        result = await self._collection.delete_one({"_id": oid})
        return result.deleted_count > 0

    async def list_users(self, *, skip: int = 0, limit: int = 20) -> list[User]:
        """Return a page of users ordered by creation time (newest first)."""
        cursor = self._collection.find().sort("created_at", -1).skip(skip).limit(limit)
        return [_from_document(doc) async for doc in cursor]

    async def count(self) -> int:
        """Return the total number of users."""
        return await self._collection.count_documents({})
