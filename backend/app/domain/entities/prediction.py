"""Prediction entity — a persisted classification result with explainability."""

from __future__ import annotations

from dataclasses import dataclass, field
from datetime import UTC, datetime
from enum import Enum


def _utcnow() -> datetime:
    """Return the current timezone-aware UTC time."""
    return datetime.now(UTC)


class PredictionStatus(str, Enum):
    """Lifecycle status of a prediction record."""

    PENDING = "pending"
    COMPLETED = "completed"
    FAILED = "failed"


@dataclass
class GradCamPaths:
    """Served URLs for the three Grad-CAM images of a prediction."""

    original: str
    heatmap: str
    overlay: str


@dataclass
class Prediction:
    """A single image classification with Grad-CAM explainability.

    Mirrors the ``predictions`` collection (see ``docs/17_Database_Design.md``).
    """

    user_id: str
    image_path: str
    model_arch: str
    model_version: str
    predicted_class: str
    confidence: float
    probabilities: dict[str, float]
    gradcam: GradCamPaths
    ood_flag: bool = False
    status: PredictionStatus = PredictionStatus.COMPLETED
    idempotency_key: str | None = None
    image_url: str | None = None
    id: str | None = None
    created_at: datetime = field(default_factory=_utcnow)
