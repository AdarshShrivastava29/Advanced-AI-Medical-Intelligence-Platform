"""Analytics repository port.

Aggregation queries over the ``predictions`` collection, scoped to a single
user. Implemented by a Motor adapter (see ``docs/17_Database_Design.md``).
"""

from __future__ import annotations

from abc import ABC, abstractmethod

from app.domain.value_objects.analytics import (
    AnalyticsOverview,
    DistributionBucket,
    TrendPoint,
)


class AnalyticsRepository(ABC):
    """Port for prediction analytics aggregations."""

    @abstractmethod
    async def overview(self, user_id: str) -> AnalyticsOverview:
        """Return headline counts and average confidence for a user."""

    @abstractmethod
    async def trends(self, user_id: str, *, days: int = 30) -> list[TrendPoint]:
        """Return per-day prediction counts over the last ``days`` days."""

    @abstractmethod
    async def disease_distribution(self, user_id: str) -> list[DistributionBucket]:
        """Return prediction counts grouped by predicted class."""

    @abstractmethod
    async def confidence_distribution(self, user_id: str) -> list[DistributionBucket]:
        """Return prediction counts grouped into confidence bands."""
