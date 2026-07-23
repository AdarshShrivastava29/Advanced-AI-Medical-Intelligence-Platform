"""Unit tests for the Torch inference engine and MODEL_ARCH switching.

Models are built with ``pretrained=False`` (random weights, no download) so the
tests are fast and offline; they assert pipeline *correctness*, not accuracy.
"""

from __future__ import annotations

import pytest

from app.core.config import Settings
from app.infrastructure.ml.classifier.densenet import DenseNet121Classifier
from app.infrastructure.ml.classifier.efficientnet import EfficientNetB0Classifier
from app.infrastructure.ml.inference_engine import TorchInferenceEngine
from tests.helpers import make_png

pytestmark = pytest.mark.asyncio

_PNG_MAGIC = b"\x89PNG\r\n\x1a\n"


def _settings() -> Settings:
    return Settings(
        _env_file=None,
        llm_provider="mock",
        embedding_provider="sentence_transformer",
        jwt_secret="x" * 40,
        # Isolated path so no ambient registry/checkpoint is picked up.
        model_path="./data/__pytest_no_model__/model.pt",
    )


async def test_densenet_predict_pipeline() -> None:
    engine = TorchInferenceEngine(DenseNet121Classifier(), _settings(), pretrained=False)
    output = await engine.predict(make_png())

    assert output.predicted_class in {"NORMAL", "PNEUMONIA"}
    assert 0.0 <= output.confidence <= 1.0
    assert set(output.probabilities) == {"NORMAL", "PNEUMONIA"}
    assert abs(sum(output.probabilities.values()) - 1.0) < 1e-3
    assert output.model_arch == "densenet121"
    assert "densenet121" in output.model_version
    assert output.gradcam.original_png.startswith(_PNG_MAGIC)
    assert output.gradcam.heatmap_png.startswith(_PNG_MAGIC)
    assert output.gradcam.overlay_png.startswith(_PNG_MAGIC)


async def test_efficientnet_model_arch_switch() -> None:
    engine = TorchInferenceEngine(EfficientNetB0Classifier(), _settings(), pretrained=False)
    output = await engine.predict(make_png())
    assert output.model_arch == "efficientnet_b0"
    assert set(output.probabilities) == {"NORMAL", "PNEUMONIA"}


async def test_colourful_input_flagged_ood() -> None:
    engine = TorchInferenceEngine(DenseNet121Classifier(), _settings(), pretrained=False)
    output = await engine.predict(make_png(colorful=True))
    assert output.is_ood is True
