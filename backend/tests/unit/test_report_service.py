"""Unit tests for the report service and deterministic risk derivation."""

from __future__ import annotations

import pytest

from app.application.services.report_service import ReportService, derive_risk_level
from app.core.config import Settings
from app.domain.entities.prediction import GradCamPaths, Prediction
from app.domain.value_objects.risk_level import RiskLevel
from app.infrastructure.providers.llm.mock_provider import MockLLMProvider


def _settings() -> Settings:
    return Settings(
        _env_file=None,
        llm_provider="mock",
        embedding_provider="sentence_transformer",
        jwt_secret="x" * 40,
    )


def _prediction(predicted_class: str, confidence: float, *, ood: bool = False) -> Prediction:
    return Prediction(
        user_id="u1",
        image_path="/tmp/x.png",
        model_arch="densenet121",
        model_version="densenet121:random-init",
        predicted_class=predicted_class,
        confidence=confidence,
        probabilities={"NORMAL": 1 - confidence, "PNEUMONIA": confidence},
        gradcam=GradCamPaths(original="o", heatmap="h", overlay="ov"),
        ood_flag=ood,
        id="p1",
    )


def test_risk_high_for_confident_pneumonia() -> None:
    assert derive_risk_level(_prediction("PNEUMONIA", 0.92)) is RiskLevel.HIGH


def test_risk_moderate_for_uncertain_pneumonia() -> None:
    assert derive_risk_level(_prediction("PNEUMONIA", 0.60)) is RiskLevel.MODERATE


def test_risk_low_for_normal() -> None:
    assert derive_risk_level(_prediction("NORMAL", 0.95)) is RiskLevel.LOW


def test_risk_moderate_when_ood() -> None:
    assert derive_risk_level(_prediction("NORMAL", 0.95, ood=True)) is RiskLevel.MODERATE


@pytest.mark.asyncio
async def test_generate_uses_provider_abstraction() -> None:
    service = ReportService(MockLLMProvider(), _settings())
    report = await service.generate(_prediction("PNEUMONIA", 0.9))
    assert report.llm_provider == "mock"
    assert report.risk_level is RiskLevel.HIGH
    assert report.prediction_id == "p1"
    assert "MOCK LLM RESPONSE" in report.content_markdown
    assert report.sections["disclaimer"]
