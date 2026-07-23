"""Prediction routes: run a prediction, fetch one, and list history.

Controllers stay thin — they read the upload, delegate to
:class:`PredictionService`, and map the DTO to response schemas. RBAC/ownership
is enforced in the service (see ``docs/09_AI_Architecture.md``, ``docs/18_API_Design.md``).
"""

from __future__ import annotations

from typing import Annotated

from fastapi import APIRouter, Depends, File, Header, Query, UploadFile, status

from app.application.services.prediction_service import PredictionService
from app.interface.dependencies import CurrentUser, get_prediction_service
from app.interface.schemas.common import Page
from app.interface.schemas.prediction import (
    PredictionListItem,
    PredictionResponse,
    to_prediction_list_item,
    to_prediction_response,
)

router = APIRouter(tags=["predict"])


@router.post(
    "/predict",
    response_model=PredictionResponse,
    status_code=status.HTTP_201_CREATED,
    summary="Classify a chest X-ray and generate an explainable report",
)
async def create_prediction(
    current_user: CurrentUser,
    service: Annotated[PredictionService, Depends(get_prediction_service)],
    file: Annotated[UploadFile, File(description="Chest X-ray image (PNG or JPEG).")],
    idempotency_key: Annotated[str | None, Header(alias="Idempotency-Key")] = None,
) -> PredictionResponse:
    """Run inference + Grad-CAM + report generation and persist the result."""
    data = await file.read()
    result = await service.create(
        user_id=current_user.id or "",
        filename=file.filename or "upload",
        content_type=file.content_type or "",
        data=data,
        idempotency_key=idempotency_key,
    )
    return to_prediction_response(result)


@router.get(
    "/predict/{prediction_id}",
    response_model=PredictionResponse,
    summary="Fetch a prediction and its report",
)
async def get_prediction(
    prediction_id: str,
    current_user: CurrentUser,
    service: Annotated[PredictionService, Depends(get_prediction_service)],
) -> PredictionResponse:
    """Return a prediction (owner, or any doctor/admin)."""
    result = await service.get_result(prediction_id=prediction_id, requester=current_user)
    return to_prediction_response(result)


@router.get(
    "/history",
    response_model=Page[PredictionListItem],
    summary="List the current user's prediction history",
)
async def list_history(
    current_user: CurrentUser,
    service: Annotated[PredictionService, Depends(get_prediction_service)],
    page: Annotated[int, Query(ge=1)] = 1,
    size: Annotated[int, Query(ge=1, le=100)] = 20,
) -> Page[PredictionListItem]:
    """Return a paginated list of the caller's predictions, newest first."""
    items, total = await service.list_history(
        user_id=current_user.id or "", page=page, size=size
    )
    pages = (total + size - 1) // size if size else 0
    return Page[PredictionListItem](
        items=[to_prediction_list_item(p) for p in items],
        page=page,
        size=size,
        total=total,
        pages=pages,
    )
