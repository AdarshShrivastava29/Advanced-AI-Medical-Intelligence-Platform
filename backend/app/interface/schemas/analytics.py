"""Analytics response schemas."""

from __future__ import annotations

from pydantic import BaseModel, Field


class OverviewResponse(BaseModel):
    """Headline analytics counts."""

    total_predictions: int
    pneumonia_count: int
    normal_count: int
    ood_count: int
    average_confidence: float


class TrendPointSchema(BaseModel):
    """One day of the prediction trend series."""

    date: str
    count: int


class DistributionBucketSchema(BaseModel):
    """A labelled count for a distribution chart."""

    label: str
    count: int


class AnalyticsSummaryResponse(BaseModel):
    """Combined analytics payload for the dashboard/analytics page."""

    overview: OverviewResponse
    trends: list[TrendPointSchema] = Field(default_factory=list)
    disease_distribution: list[DistributionBucketSchema] = Field(default_factory=list)
    confidence_distribution: list[DistributionBucketSchema] = Field(default_factory=list)
