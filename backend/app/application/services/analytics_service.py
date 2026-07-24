"""Analytics service — assembles the dashboard/analytics payloads for a user."""

from __future__ import annotations

from dataclasses import asdict

from app.domain.entities.prediction import Prediction
from app.domain.ports.analytics import AnalyticsRepository
from app.domain.ports.cache_provider import CacheProvider
from app.domain.ports.repositories import PredictionRepository
from app.domain.value_objects.analytics import (
    AnalyticsOverview,
    AnalyticsSummary,
    DistributionBucket,
    TrendPoint,
)

_SUMMARY_TTL_SECONDS = 30


def _summary_from_dict(data: dict) -> AnalyticsSummary:
    """Reconstruct an :class:`AnalyticsSummary` from a cached dict."""
    return AnalyticsSummary(
        overview=AnalyticsOverview(**data["overview"]),
        trends=[TrendPoint(**t) for t in data["trends"]],
        disease_distribution=[DistributionBucket(**b) for b in data["disease_distribution"]],
        confidence_distribution=[DistributionBucket(**b) for b in data["confidence_distribution"]],
    )


class AnalyticsService:
    """Coordinates analytics aggregations over a user's predictions."""

    def __init__(
        self,
        analytics_repository: AnalyticsRepository,
        prediction_repository: PredictionRepository,
        cache: CacheProvider | None = None,
    ) -> None:
        self._analytics = analytics_repository
        self._predictions = prediction_repository
        self._cache = cache

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
        """Return the full analytics payload in one call (cache-aside, short TTL)."""
        cache_key = f"analytics:summary:{user_id}:{days}"
        if self._cache is not None:
            cached = await self._cache.get(cache_key)
            if cached is not None:
                return _summary_from_dict(cached)

        result = AnalyticsSummary(
            overview=await self._analytics.overview(user_id),
            trends=await self._analytics.trends(user_id, days=days),
            disease_distribution=await self._analytics.disease_distribution(user_id),
            confidence_distribution=await self._analytics.confidence_distribution(user_id),
        )
        if self._cache is not None:
            await self._cache.set(cache_key, asdict(result), ttl_seconds=_SUMMARY_TTL_SECONDS)
        return result
