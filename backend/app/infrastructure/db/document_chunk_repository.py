"""Motor-backed implementation of :class:`DocumentChunkRepository`."""

from __future__ import annotations

from typing import Any

from motor.motor_asyncio import AsyncIOMotorCollection

from app.domain.entities.document_chunk import DocumentChunk
from app.domain.ports.repositories import DocumentChunkRepository
from app.infrastructure.db.base_repository import MotorRepository, to_object_id


def _to_document(chunk: DocumentChunk) -> dict[str, Any]:
    """Map a :class:`DocumentChunk` entity to a MongoDB document (without ``_id``)."""
    return {
        "document_id": chunk.document_id,
        "filename": chunk.filename,
        "chunk_index": chunk.chunk_index,
        "text": chunk.text,
        "vector_id": chunk.vector_id,
        "embedding_provider": chunk.embedding_provider,
        "dimension": chunk.dimension,
        "page": chunk.page,
        "created_at": chunk.created_at,
    }


def _from_document(raw: dict[str, Any]) -> DocumentChunk:
    """Map a MongoDB document to a :class:`DocumentChunk` entity."""
    return DocumentChunk(
        id=str(raw["_id"]),
        document_id=raw["document_id"],
        filename=raw["filename"],
        chunk_index=raw["chunk_index"],
        text=raw["text"],
        vector_id=raw["vector_id"],
        embedding_provider=raw["embedding_provider"],
        dimension=raw["dimension"],
        page=raw.get("page", 0),
        created_at=raw["created_at"],
    )


class MongoDocumentChunkRepository(MotorRepository, DocumentChunkRepository):
    """Persists chunk metadata in the ``embeddings_metadata`` collection."""

    def __init__(self, collection: AsyncIOMotorCollection) -> None:
        super().__init__(collection)

    async def create(self, entity: DocumentChunk) -> DocumentChunk:
        result = await self._collection.insert_one(_to_document(entity))
        entity.id = str(result.inserted_id)
        return entity

    async def get(self, entity_id: str) -> DocumentChunk | None:
        oid = to_object_id(entity_id)
        if oid is None:
            return None
        raw = await self._collection.find_one({"_id": oid})
        return _from_document(raw) if raw else None

    async def update(self, entity: DocumentChunk) -> DocumentChunk:
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

    async def add_many(self, chunks: list[DocumentChunk]) -> None:
        if not chunks:
            return
        await self._collection.insert_many([_to_document(c) for c in chunks])

    async def list_all(self) -> list[DocumentChunk]:
        cursor = self._collection.find().sort("created_at", 1)
        return [_from_document(raw) async for raw in cursor]

    async def get_by_vector_ids(self, vector_ids: list[str]) -> dict[str, DocumentChunk]:
        cursor = self._collection.find({"vector_id": {"$in": vector_ids}})
        return {raw["vector_id"]: _from_document(raw) async for raw in cursor}

    async def delete_by_document(self, document_id: str) -> int:
        result = await self._collection.delete_many({"document_id": document_id})
        return result.deleted_count
