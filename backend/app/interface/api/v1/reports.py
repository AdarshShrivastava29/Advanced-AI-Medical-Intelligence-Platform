"""Report routes: fetch and regenerate the medical report for a prediction."""

from __future__ import annotations

from typing import Annotated

from fastapi import APIRouter, Depends

from app.application.services.prediction_service import PredictionService
from app.core.exceptions import NotFoundError
from app.interface.dependencies import CurrentUser, get_prediction_service
from app.interface.schemas.prediction import ReportResponse, to_report_response

router = APIRouter(prefix="/reports", tags=["reports"])


@router.get(
    "/{prediction_id}",
    response_model=ReportResponse,
    summary="Fetch the medical report for a prediction",
)
async def get_report(
    prediction_id: str,
    current_user: CurrentUser,
    service: Annotated[PredictionService, Depends(get_prediction_service)],
) -> ReportResponse:
    """Return the report attached to a prediction (owner, or any doctor/admin)."""
    result = await service.get_result(prediction_id=prediction_id, requester=current_user)
    if result.report is None:
        raise NotFoundError("No report exists for this prediction.")
    return to_report_response(result.report)


@router.post(
    "/{prediction_id}/regenerate",
    response_model=ReportResponse,
    summary="Regenerate the medical report through the LLM provider",
)
async def regenerate_report(
    prediction_id: str,
    current_user: CurrentUser,
    service: Annotated[PredictionService, Depends(get_prediction_service)],
) -> ReportResponse:
    """Generate and persist a fresh report for an existing prediction."""
    report = await service.regenerate_report(
        prediction_id=prediction_id, requester=current_user
    )
    return to_report_response(report)
