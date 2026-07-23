"""Value objects for analytics aggregations (framework-agnostic)."""

from __future__ import annotations

from dataclasses import dataclass, field


@dataclass(frozen=True)
class AnalyticsOverview:
    """Headline counts for a user's predictions."""

    total_predictions: int = 0
    pneumonia_count: int = 0
    normal_count: int = 0
    ood_count: int = 0
    average_confidence: float = 0.0


@dataclass(frozen=True)
class TrendPoint:
    """A single point in a time-series trend (one calendar day)."""

    date: str
    count: int


@dataclass(frozen=True)
class DistributionBucket:
    """A labelled count used for pie/bar distributions."""

    label: str
    count: int


@dataclass(frozen=True)
class AnalyticsSummary:
    """The full analytics payload for a user."""

    overview: AnalyticsOverview = field(default_factory=AnalyticsOverview)
    trends: list[TrendPoint] = field(default_factory=list)
    disease_distribution: list[DistributionBucket] = field(default_factory=list)
    confidence_distribution: list[DistributionBucket] = field(default_factory=list)
