"""Motor-backed implementation of :class:`ReportRepository`."""

from __future__ import annotations

from typing import Any

from motor.motor_asyncio import AsyncIOMotorCollection

from app.domain.entities.report import Report
from app.domain.ports.repositories import ReportRepository
from app.domain.value_objects.risk_level import RiskLevel
from app.infrastructure.db.base_repository import MotorRepository, to_object_id


def _to_document(report: Report) -> dict[str, Any]:
    """Map a :class:`Report` entity to a MongoDB document (without ``_id``)."""
    return {
        "prediction_id": report.prediction_id,
        "user_id": report.user_id,
        "llm_provider": report.llm_provider,
        "llm_model": report.llm_model,
        "content_markdown": report.content_markdown,
        "risk_level": report.risk_level.value,
        "sections": report.sections,
        "created_at": report.created_at,
    }


def _from_document(doc: dict[str, Any]) -> Report:
    """Map a MongoDB document to a :class:`Report` entity."""
    return Report(
        id=str(doc["_id"]),
        prediction_id=doc["prediction_id"],
        user_id=doc["user_id"],
        llm_provider=doc["llm_provider"],
        llm_model=doc["llm_model"],
        content_markdown=doc["content_markdown"],
        risk_level=RiskLevel(doc.get("risk_level", RiskLevel.LOW.value)),
        sections=doc.get("sections", {}),
        created_at=doc["created_at"],
    )


class MongoReportRepository(MotorRepository, ReportRepository):
    """Persists :class:`Report` aggregates in the ``reports`` collection."""

    def __init__(self, collection: AsyncIOMotorCollection) -> None:
        super().__init__(collection)

    async def create(self, entity: Report) -> Report:
        """Insert a new report and return it with its generated id."""
        result = await self._collection.insert_one(_to_document(entity))
        entity.id = str(result.inserted_id)
        return entity

    async def get(self, entity_id: str) -> Report | None:
        """Return the report with ``entity_id`` or None."""
        oid = to_object_id(entity_id)
        if oid is None:
            return None
        doc = await self._collection.find_one({"_id": oid})
        return _from_document(doc) if doc else None

    async def update(self, entity: Report) -> Report:
        """Persist changes to an existing report and return it."""
        oid = to_object_id(entity.id or "")
        if oid is None:
            return entity
        await self._collection.update_one({"_id": oid}, {"$set": _to_document(entity)})
        return entity

    async def delete(self, entity_id: str) -> bool:
        """Delete a report by id; return True if a document was removed."""
        oid = to_object_id(entity_id)
        if oid is None:
            return False
        result = await self._collection.delete_one({"_id": oid})
        return result.deleted_count > 0

    async def get_by_prediction_id(self, prediction_id: str) -> Report | None:
        """Return the most recent report for a prediction, or None."""
        doc = await self._collection.find_one(
            {"prediction_id": prediction_id}, sort=[("created_at", -1)]
        )
        return _from_document(doc) if doc else None
