"""Motor-backed implementation of :class:`DocumentRepository`."""

from __future__ import annotations

from typing import Any

from motor.motor_asyncio import AsyncIOMotorCollection

from app.domain.entities.document import Document, DocumentStatus
from app.domain.ports.repositories import DocumentRepository
from app.infrastructure.db.base_repository import MotorRepository, to_object_id


def _to_document(doc: Document) -> dict[str, Any]:
    """Map a :class:`Document` entity to a MongoDB document (without ``_id``)."""
    return {
        "filename": doc.filename,
        "title": doc.title,
        "source": doc.source,
        "mime": doc.mime,
        "uploaded_by": doc.uploaded_by,
        "file_path": doc.file_path,
        "content_hash": doc.content_hash,
        "pages": doc.pages,
        "chunk_count": doc.chunk_count,
        "version": doc.version,
        "status": doc.status.value,
        "embedding_provider": doc.embedding_provider,
        "vector_db": doc.vector_db,
        "error": doc.error,
        "created_at": doc.created_at,
        "updated_at": doc.updated_at,
    }


def _from_document(raw: dict[str, Any]) -> Document:
    """Map a MongoDB document to a :class:`Document` entity."""
    return Document(
        id=str(raw["_id"]),
        filename=raw["filename"],
        title=raw["title"],
        source=raw["source"],
        mime=raw["mime"],
        uploaded_by=raw["uploaded_by"],
        file_path=raw["file_path"],
        content_hash=raw["content_hash"],
        pages=raw.get("pages", 0),
        chunk_count=raw.get("chunk_count", 0),
        version=raw.get("version", 1),
        status=DocumentStatus(raw.get("status", DocumentStatus.UPLOADED.value)),
        embedding_provider=raw.get("embedding_provider"),
        vector_db=raw.get("vector_db"),
        error=raw.get("error"),
        created_at=raw["created_at"],
        updated_at=raw["updated_at"],
    )


class MongoDocumentRepository(MotorRepository, DocumentRepository):
    """Persists :class:`Document` aggregates in the ``documents`` collection."""

    def __init__(self, collection: AsyncIOMotorCollection) -> None:
        super().__init__(collection)

    async def create(self, entity: Document) -> Document:
        result = await self._collection.insert_one(_to_document(entity))
        entity.id = str(result.inserted_id)
        return entity

    async def get(self, entity_id: str) -> Document | None:
        oid = to_object_id(entity_id)
        if oid is None:
            return None
        raw = await self._collection.find_one({"_id": oid})
        return _from_document(raw) if raw else None

    async def update(self, entity: Document) -> Document:
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

    async def get_by_hash(self, content_hash: str) -> Document | None:
        raw = await self._collection.find_one({"content_hash": content_hash})
        return _from_document(raw) if raw else None

    async def latest_version(self, filename: str) -> int:
        raw = await self._collection.find_one(
            {"filename": filename}, sort=[("version", -1)]
        )
        return int(raw["version"]) if raw else 0

    async def list_all(self, *, skip: int = 0, limit: int = 50) -> list[Document]:
        cursor = self._collection.find().sort("created_at", -1).skip(skip).limit(limit)
        return [_from_document(raw) async for raw in cursor]

    async def count(self) -> int:
        return await self._collection.count_documents({})
