"""Motor-backed implementation of :class:`AnalyticsRepository`.

Uses MongoDB aggregation pipelines over the ``predictions`` collection so
counting/grouping happens in the database, not the application.
"""

from __future__ import annotations

from datetime import UTC, datetime, timedelta
from typing import Any

from motor.motor_asyncio import AsyncIOMotorCollection

from app.domain.ports.analytics import AnalyticsRepository
from app.domain.value_objects.analytics import (
    AnalyticsOverview,
    DistributionBucket,
    TrendPoint,
)

_CONFIDENCE_BOUNDARIES = [0.0, 0.5, 0.7, 0.85, 1.01]
_CONFIDENCE_LABELS = ["0-50%", "50-70%", "70-85%", "85-100%"]


class MongoAnalyticsRepository(AnalyticsRepository):
    """Aggregations over the ``predictions`` collection, scoped per user."""

    def __init__(self, collection: AsyncIOMotorCollection) -> None:
        self._collection = collection

    async def overview(self, user_id: str) -> AnalyticsOverview:
        """Return counts and average confidence via a single ``$group`` stage."""
        pipeline: list[dict[str, Any]] = [
            {"$match": {"user_id": user_id}},
            {
                "$group": {
                    "_id": None,
                    "total": {"$sum": 1},
                    "avg_conf": {"$avg": "$confidence"},
                    "pneumonia": {
                        "$sum": {"$cond": [{"$eq": ["$predicted_class", "PNEUMONIA"]}, 1, 0]}
                    },
                    "normal": {
                        "$sum": {"$cond": [{"$eq": ["$predicted_class", "NORMAL"]}, 1, 0]}
                    },
                    "ood": {"$sum": {"$cond": ["$ood_flag", 1, 0]}},
                }
            },
        ]
        docs = await self._collection.aggregate(pipeline).to_list(length=1)
        if not docs:
            return AnalyticsOverview()
        doc = docs[0]
        return AnalyticsOverview(
            total_predictions=doc.get("total", 0),
            pneumonia_count=doc.get("pneumonia", 0),
            normal_count=doc.get("normal", 0),
            ood_count=doc.get("ood", 0),
            average_confidence=round(doc.get("avg_conf") or 0.0, 4),
        )

    async def trends(self, user_id: str, *, days: int = 30) -> list[TrendPoint]:
        """Return per-day counts for the last ``days`` days (dense, zero-filled)."""
        since = datetime.now(UTC) - timedelta(days=days - 1)
        pipeline: list[dict[str, Any]] = [
            {"$match": {"user_id": user_id, "created_at": {"$gte": since}}},
            {
                "$group": {
                    "_id": {"$dateToString": {"format": "%Y-%m-%d", "date": "$created_at"}},
                    "count": {"$sum": 1},
                }
            },
        ]
        docs = await self._collection.aggregate(pipeline).to_list(length=None)
        counts = {doc["_id"]: doc["count"] for doc in docs}
        start = since.date()
        return [
            TrendPoint(
                date=(day := (start + timedelta(days=offset)).isoformat()),
                count=counts.get(day, 0),
            )
            for offset in range(days)
        ]

    async def disease_distribution(self, user_id: str) -> list[DistributionBucket]:
        """Return counts grouped by predicted class (always NORMAL + PNEUMONIA)."""
        pipeline: list[dict[str, Any]] = [
            {"$match": {"user_id": user_id}},
            {"$group": {"_id": "$predicted_class", "count": {"$sum": 1}}},
        ]
        docs = await self._collection.aggregate(pipeline).to_list(length=None)
        counts = {doc["_id"]: doc["count"] for doc in docs}
        return [
            DistributionBucket(label="NORMAL", count=counts.get("NORMAL", 0)),
            DistributionBucket(label="PNEUMONIA", count=counts.get("PNEUMONIA", 0)),
        ]

    async def confidence_distribution(self, user_id: str) -> list[DistributionBucket]:
        """Return counts grouped into confidence bands via ``$bucket``."""
        pipeline: list[dict[str, Any]] = [
            {"$match": {"user_id": user_id}},
            {
                "$bucket": {
                    "groupBy": "$confidence",
                    "boundaries": _CONFIDENCE_BOUNDARIES,
                    "default": "other",
                    "output": {"count": {"$sum": 1}},
                }
            },
        ]
        docs = await self._collection.aggregate(pipeline).to_list(length=None)
        by_lower = {doc["_id"]: doc["count"] for doc in docs if doc["_id"] != "other"}
        return [
            DistributionBucket(label=label, count=by_lower.get(_CONFIDENCE_BOUNDARIES[i], 0))
            for i, label in enumerate(_CONFIDENCE_LABELS)
        ]
