"""Analytics service — assembles the dashboard/analytics payloads for a user."""

from __future__ import annotations

from app.domain.entities.prediction import Prediction
from app.domain.ports.analytics import AnalyticsRepository
from app.domain.ports.repositories import PredictionRepository
from app.domain.value_objects.analytics import (
    AnalyticsOverview,
    AnalyticsSummary,
    DistributionBucket,
    TrendPoint,
)


class AnalyticsService:
    """Coordinates analytics aggregations over a user's predictions."""

    def __init__(
        self,
        analytics_repository: AnalyticsRepository,
        prediction_repository: PredictionRepository,
    ) -> None:
        self._analytics = analytics_repository
        self._predictions = prediction_repository

    async def overview(self, user_id: str) -> AnalyticsOverview:
        """Return headline counts for a user."""
        return await self._analytics.overview(user_id)

    async def trends(self, user_id: str, *, days: int = 30) -> list[TrendPoint]:
        """Return per-day prediction counts."""
        return await self._analytics.trends(user_id, days=days)

    async def disease_distribution(self, user_id: str) -> list[DistributionBucket]:
        """Return counts grouped by predicted class."""
        return await self._analytics.disease_distribution(user_id)

    async def confidence_distribution(self, user_id: str) -> list[DistributionBucket]:
        """Return counts grouped into confidence bands."""
        return await self._analytics.confidence_distribution(user_id)

    async def recent_activity(self, user_id: str, *, limit: int = 5) -> list[Prediction]:
        """Return the user's most recent predictions."""
        return await self._predictions.list_for_user(user_id, skip=0, limit=limit)

    async def summary(self, user_id: str, *, days: int = 30) -> AnalyticsSummary:
        """Return the full analytics payload in one call."""
        return AnalyticsSummary(
            overview=await self._analytics.overview(user_id),
            trends=await self._analytics.trends(user_id, days=days),
            disease_distribution=await self._analytics.disease_distribution(user_id),
            confidence_distribution=await self._analytics.confidence_distribution(user_id),
        )
