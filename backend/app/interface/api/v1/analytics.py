"""Analytics routes — dashboard metrics scoped to the current user."""

from __future__ import annotations

from typing import Annotated

from fastapi import APIRouter, Depends, Query

from app.application.services.analytics_service import AnalyticsService
from app.domain.value_objects.analytics import (
    AnalyticsOverview,
    DistributionBucket,
    TrendPoint,
)
from app.interface.dependencies import CurrentUser, get_analytics_service
from app.interface.schemas.analytics import (
    AnalyticsSummaryResponse,
    DistributionBucketSchema,
    OverviewResponse,
    TrendPointSchema,
)
from app.interface.schemas.prediction import PredictionListItem, to_prediction_list_item

router = APIRouter(prefix="/analytics", tags=["analytics"])


def _overview(overview: AnalyticsOverview) -> OverviewResponse:
    return OverviewResponse(
        total_predictions=overview.total_predictions,
        pneumonia_count=overview.pneumonia_count,
        normal_count=overview.normal_count,
        ood_count=overview.ood_count,
        average_confidence=overview.average_confidence,
    )


def _buckets(items: list[DistributionBucket]) -> list[DistributionBucketSchema]:
    return [DistributionBucketSchema(label=b.label, count=b.count) for b in items]


def _trends(items: list[TrendPoint]) -> list[TrendPointSchema]:
    return [TrendPointSchema(date=t.date, count=t.count) for t in items]


@router.get("/overview", response_model=OverviewResponse, summary="Headline metrics")
async def overview(
    current_user: CurrentUser,
    service: Annotated[AnalyticsService, Depends(get_analytics_service)],
) -> OverviewResponse:
    """Return prediction counts and average confidence for the current user."""
    return _overview(await service.overview(current_user.id or ""))


@router.get("/summary", response_model=AnalyticsSummaryResponse, summary="Full analytics payload")
async def summary(
    current_user: CurrentUser,
    service: Annotated[AnalyticsService, Depends(get_analytics_service)],
    days: Annotated[int, Query(ge=1, le=365)] = 30,
) -> AnalyticsSummaryResponse:
    """Return overview + trends + distributions in a single call (dashboard)."""
    result = await service.summary(current_user.id or "", days=days)
    return AnalyticsSummaryResponse(
        overview=_overview(result.overview),
        trends=_trends(result.trends),
        disease_distribution=_buckets(result.disease_distribution),
        confidence_distribution=_buckets(result.confidence_distribution),
    )


@router.get("/trends", response_model=list[TrendPointSchema], summary="Prediction trend")
async def trends(
    current_user: CurrentUser,
    service: Annotated[AnalyticsService, Depends(get_analytics_service)],
    days: Annotated[int, Query(ge=1, le=365)] = 30,
) -> list[TrendPointSchema]:
    """Return per-day prediction counts."""
    return _trends(await service.trends(current_user.id or "", days=days))


@router.get(
    "/disease-distribution",
    response_model=list[DistributionBucketSchema],
    summary="Class distribution",
)
async def disease_distribution(
    current_user: CurrentUser,
    service: Annotated[AnalyticsService, Depends(get_analytics_service)],
) -> list[DistributionBucketSchema]:
    """Return counts grouped by predicted class."""
    return _buckets(await service.disease_distribution(current_user.id or ""))


@router.get(
    "/confidence-distribution",
    response_model=list[DistributionBucketSchema],
    summary="Confidence distribution",
)
async def confidence_distribution(
    current_user: CurrentUser,
    service: Annotated[AnalyticsService, Depends(get_analytics_service)],
) -> list[DistributionBucketSchema]:
    """Return counts grouped into confidence bands."""
    return _buckets(await service.confidence_distribution(current_user.id or ""))


@router.get(
    "/recent-activity",
    response_model=list[PredictionListItem],
    summary="Recent predictions",
)
async def recent_activity(
    current_user: CurrentUser,
    service: Annotated[AnalyticsService, Depends(get_analytics_service)],
    limit: Annotated[int, Query(ge=1, le=50)] = 5,
) -> list[PredictionListItem]:
    """Return the current user's most recent predictions."""
    items = await service.recent_activity(current_user.id or "", limit=limit)
    return [to_prediction_list_item(p) for p in items]
