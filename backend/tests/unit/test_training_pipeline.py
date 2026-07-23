"""Integration test: run the training pipeline end-to-end and verify that the
inference engine auto-loads the registered checkpoint (inference compatibility)."""

from __future__ import annotations

import pytest

from app.core.config import Settings
from app.infrastructure.ml.classifier.densenet import DenseNet121Classifier
from app.infrastructure.ml.inference_engine import TorchInferenceEngine
from app.infrastructure.ml.model_registry import ModelRegistry, default_registry_path
from app.infrastructure.ml.training.config import TrainingConfig
from app.infrastructure.ml.training.dataset import (
    generate_synthetic_dataset,
    synthetic_image_bytes,
)
from app.infrastructure.ml.training.pipeline import run_training

pytestmark = pytest.mark.asyncio


def _settings(model_path: str) -> Settings:
    return Settings(
        _env_file=None,
        llm_provider="mock",
        embedding_provider="sentence_transformer",
        jwt_secret="x" * 40,
        model_arch="densenet121",
        model_path=model_path,
    )


async def test_pipeline_trains_registers_and_inference_loads(tmp_path) -> None:  # type: ignore[no-untyped-def]
    data_dir = generate_synthetic_dataset(tmp_path / "ds", per_class=16, image_size=48)
    model_path = tmp_path / "weights" / "model.pt"
    config = TrainingConfig(
        data_dir=str(data_dir),
        output_dir=str(tmp_path / "training"),
        model_path=str(model_path),
        arch="densenet121",
        pretrained=False,  # random init keeps the test fast and offline
        epochs=1,
        freeze_backbone_epochs=0,
        batch_size=8,
        image_size=48,
        seed=3,
    )

    summary = run_training(config)

    # Training produced a versioned model, metrics and artifacts.
    assert summary["version"] == 1
    assert model_path.exists()
    for key in ("accuracy", "precision", "recall", "f1", "roc_auc", "confusion_matrix"):
        assert key in summary["metrics"]

    # The registry recorded the model.
    registry = ModelRegistry(default_registry_path(str(model_path)))
    entry = registry.latest_approved("densenet121")
    assert entry is not None and entry.version == 1
    assert entry.sha256

    # The inference engine auto-loads the registered checkpoint (no code change).
    engine = TorchInferenceEngine(DenseNet121Classifier(), _settings(str(model_path)))
    engine.warmup()
    output = await engine.predict(synthetic_image_bytes(pneumonia=True))
    assert output.model_version == "densenet121:trained-v1"
    assert output.predicted_class in {"NORMAL", "PNEUMONIA"}
    assert 0.0 <= output.confidence <= 1.0
