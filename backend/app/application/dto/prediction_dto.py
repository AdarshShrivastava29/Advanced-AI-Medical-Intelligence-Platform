"""Prediction-related data-transfer objects."""

from __future__ import annotations

from dataclasses import dataclass

from app.domain.entities.prediction import Prediction
from app.domain.entities.report import Report


@dataclass(frozen=True)
class PredictionResult:
    """A completed prediction together with its generated medical report.

    ``report`` may be None when reading a prediction whose report is absent.
    """

    prediction: Prediction
    report: Report | None = None
