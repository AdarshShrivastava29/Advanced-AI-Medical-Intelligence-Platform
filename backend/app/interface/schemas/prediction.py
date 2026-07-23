"""Prediction and report response schemas."""

from __future__ import annotations

from datetime import datetime

from pydantic import BaseModel, Field

from app.application.dto.prediction_dto import PredictionResult
from app.domain.entities.prediction import Prediction
from app.domain.entities.report import Report
from app.domain.value_objects.risk_level import RiskLevel


class GradCamUrls(BaseModel):
    """Served URLs for the three Grad-CAM images."""

    original: str
    heatmap: str
    overlay: str


class ReportResponse(BaseModel):
    """A generated medical report."""

    id: str
    prediction_id: str
    llm_provider: str = Field(description="The active LLM provider name.")
    llm_model: str
    risk_level: RiskLevel
    content_markdown: str
    created_at: datetime


class PredictionResponse(BaseModel):
    """A prediction with confidence, probabilities, Grad-CAM and optional report."""

    id: str
    predicted_class: str
    confidence: float
    probabilities: dict[str, float]
    ood_flag: bool
    model_arch: str
    model_version: str
    image_url: str | None
    gradcam: GradCamUrls
    status: str
    created_at: datetime
    report: ReportResponse | None = None


class PredictionListItem(BaseModel):
    """A compact prediction summary for history listings."""

    id: str
    predicted_class: str
    confidence: float
    model_arch: str
    ood_flag: bool
    created_at: datetime


def to_report_response(report: Report) -> ReportResponse:
    """Map a :class:`Report` entity to its response schema."""
    return ReportResponse(
        id=report.id or "",
        prediction_id=report.prediction_id,
        llm_provider=report.llm_provider,
        llm_model=report.llm_model,
        risk_level=report.risk_level,
        content_markdown=report.content_markdown,
        created_at=report.created_at,
    )


def to_prediction_response(result: PredictionResult) -> PredictionResponse:
    """Map a :class:`PredictionResult` DTO to the prediction response schema."""
    prediction: Prediction = result.prediction
    return PredictionResponse(
        id=prediction.id or "",
        predicted_class=prediction.predicted_class,
        confidence=prediction.confidence,
        probabilities=prediction.probabilities,
        ood_flag=prediction.ood_flag,
        model_arch=prediction.model_arch,
        model_version=prediction.model_version,
        image_url=prediction.image_url,
        gradcam=GradCamUrls(
            original=prediction.gradcam.original,
            heatmap=prediction.gradcam.heatmap,
            overlay=prediction.gradcam.overlay,
        ),
        status=prediction.status.value,
        created_at=prediction.created_at,
        report=to_report_response(result.report) if result.report else None,
    )


def to_prediction_list_item(prediction: Prediction) -> PredictionListItem:
    """Map a :class:`Prediction` entity to a compact history item."""
    return PredictionListItem(
        id=prediction.id or "",
        predicted_class=prediction.predicted_class,
        confidence=prediction.confidence,
        model_arch=prediction.model_arch,
        ood_flag=prediction.ood_flag,
        created_at=prediction.created_at,
    )
