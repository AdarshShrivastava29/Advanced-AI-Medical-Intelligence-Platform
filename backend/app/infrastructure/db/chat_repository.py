"""Motor-backed implementation of :class:`ChatMessageRepository`."""

from __future__ import annotations

from typing import Any

from motor.motor_asyncio import AsyncIOMotorCollection

from app.domain.entities.chat import ChatMessage, MessageRole
from app.domain.ports.repositories import ChatMessageRepository
from app.infrastructure.db.base_repository import MotorRepository, to_object_id


def _to_document(message: ChatMessage) -> dict[str, Any]:
    """Map a :class:`ChatMessage` entity to a MongoDB document (without ``_id``)."""
    return {
        "session_id": message.session_id,
        "user_id": message.user_id,
        "role": message.role.value,
        "message": message.message,
        "citations": message.citations,
        "grounded": message.grounded,
        "created_at": message.created_at,
    }


def _from_document(raw: dict[str, Any]) -> ChatMessage:
    """Map a MongoDB document to a :class:`ChatMessage` entity."""
    return ChatMessage(
        id=str(raw["_id"]),
        session_id=raw.get("session_id", ""),
        user_id=raw["user_id"],
        role=MessageRole(raw["role"]),
        message=raw["message"],
        citations=raw.get("citations", []),
        grounded=raw.get("grounded", True),
        created_at=raw["created_at"],
    )


class MongoChatMessageRepository(MotorRepository, ChatMessageRepository):
    """Persists chat messages in the ``chat_history`` collection."""

    def __init__(self, collection: AsyncIOMotorCollection) -> None:
        super().__init__(collection)

    async def create(self, entity: ChatMessage) -> ChatMessage:
        return await self.add(entity)

    async def add(self, message: ChatMessage) -> ChatMessage:
        result = await self._collection.insert_one(_to_document(message))
        message.id = str(result.inserted_id)
        return message

    async def get(self, entity_id: str) -> ChatMessage | None:
        oid = to_object_id(entity_id)
        if oid is None:
            return None
        raw = await self._collection.find_one({"_id": oid})
        return _from_document(raw) if raw else None

    async def update(self, entity: ChatMessage) -> ChatMessage:
        oid = to_object_id(entity.id or "")
        if oid is None:
            return entity
        await self._collection.update_one({"_id": oid}, {"$set": _to_document(entity)})
        return entity

    async def delete(self, entity_id: str) -> bool:
        oid = to_object_id(entity_id)
        if oid is None:
            return False
        result = await self._collection.delete_one({"_id": oid})
        return result.deleted_count > 0

    async def list_for_user(self, user_id: str, *, limit: int = 100) -> list[ChatMessage]:
        cursor = self._collection.find({"user_id": user_id}).sort("created_at", 1).limit(limit)
        return [_from_document(raw) async for raw in cursor]

    async def delete_for_user(self, user_id: str) -> int:
        result = await self._collection.delete_many({"user_id": user_id})
        return result.deleted_count
