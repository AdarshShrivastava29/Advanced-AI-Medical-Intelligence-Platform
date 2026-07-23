"""Motor-backed implementation of :class:`PredictionRepository`."""

from __future__ import annotations

from typing import Any

from motor.motor_asyncio import AsyncIOMotorCollection

from app.domain.entities.prediction import GradCamPaths, Prediction, PredictionStatus
from app.domain.ports.repositories import PredictionRepository
from app.infrastructure.db.base_repository import MotorRepository, to_object_id


def _to_document(prediction: Prediction) -> dict[str, Any]:
    """Map a :class:`Prediction` entity to a MongoDB document (without ``_id``)."""
    return {
        "user_id": prediction.user_id,
        "image_path": prediction.image_path,
        "image_url": prediction.image_url,
        "model_arch": prediction.model_arch,
        "model_version": prediction.model_version,
        "predicted_class": prediction.predicted_class,
        "confidence": prediction.confidence,
        "probabilities": prediction.probabilities,
        "gradcam": {
            "original": prediction.gradcam.original,
            "heatmap": prediction.gradcam.heatmap,
            "overlay": prediction.gradcam.overlay,
        },
        "ood_flag": prediction.ood_flag,
        "status": prediction.status.value,
        "idempotency_key": prediction.idempotency_key,
        "created_at": prediction.created_at,
    }


def _from_document(doc: dict[str, Any]) -> Prediction:
    """Map a MongoDB document to a :class:`Prediction` entity."""
    gradcam = doc.get("gradcam", {})
    return Prediction(
        id=str(doc["_id"]),
        user_id=doc["user_id"],
        image_path=doc["image_path"],
        image_url=doc.get("image_url"),
        model_arch=doc["model_arch"],
        model_version=doc["model_version"],
        predicted_class=doc["predicted_class"],
        confidence=doc["confidence"],
        probabilities=doc.get("probabilities", {}),
        gradcam=GradCamPaths(
            original=gradcam.get("original", ""),
            heatmap=gradcam.get("heatmap", ""),
            overlay=gradcam.get("overlay", ""),
        ),
        ood_flag=doc.get("ood_flag", False),
        status=PredictionStatus(doc.get("status", PredictionStatus.COMPLETED.value)),
        idempotency_key=doc.get("idempotency_key"),
        created_at=doc["created_at"],
    )


class MongoPredictionRepository(MotorRepository, PredictionRepository):
    """Persists :class:`Prediction` aggregates in the ``predictions`` collection."""

    def __init__(self, collection: AsyncIOMotorCollection) -> None:
        super().__init__(collection)

    async def create(self, entity: Prediction) -> Prediction:
        """Insert a new prediction and return it with its generated id."""
        result = await self._collection.insert_one(_to_document(entity))
        entity.id = str(result.inserted_id)
        return entity

    async def get(self, entity_id: str) -> Prediction | None:
        """Return the prediction with ``entity_id`` or None."""
        oid = to_object_id(entity_id)
        if oid is None:
            return None
        doc = await self._collection.find_one({"_id": oid})
        return _from_document(doc) if doc else None

    async def update(self, entity: Prediction) -> Prediction:
        """Persist changes to an existing prediction and return it."""
        oid = to_object_id(entity.id or "")
        if oid is None:
            return entity
        await self._collection.update_one({"_id": oid}, {"$set": _to_document(entity)})
        return entity

    async def delete(self, entity_id: str) -> bool:
        """Delete a prediction by id; return True if a document was removed."""
        oid = to_object_id(entity_id)
        if oid is None:
            return False
        result = await self._collection.delete_one({"_id": oid})
        return result.deleted_count > 0

    async def list_for_user(
        self, user_id: str, *, skip: int = 0, limit: int = 20
    ) -> list[Prediction]:
        """Return a page of a user's predictions, newest first."""
        cursor = (
            self._collection.find({"user_id": user_id})
            .sort("created_at", -1)
            .skip(skip)
            .limit(limit)
        )
        return [_from_document(doc) async for doc in cursor]

    async def count_for_user(self, user_id: str) -> int:
        """Return the total number of predictions for a user."""
        return await self._collection.count_documents({"user_id": user_id})

    async def get_by_idempotency_key(
        self, user_id: str, idempotency_key: str
    ) -> Prediction | None:
        """Return a user's prediction stored under ``idempotency_key`` or None."""
        doc = await self._collection.find_one(
            {"user_id": user_id, "idempotency_key": idempotency_key}
        )
        return _from_document(doc) if doc else None
