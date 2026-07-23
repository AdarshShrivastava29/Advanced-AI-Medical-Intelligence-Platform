"""Training pipeline orchestrator.

Ties together dataset loading, training, evaluation, artifact generation and
model-registry registration. Selecting the architecture goes through the same
``MODEL_ARCH`` registry the inference engine uses, so a trained model is served
without any code change (see ``docs/10_Model_Training.md``).
"""

from __future__ import annotations

import shutil
from datetime import UTC, datetime
from pathlib import Path
from typing import Any

from app.core.exceptions import ConfigurationError
from app.core.logging import get_logger
from app.infrastructure.ml.classifier.registry import MODEL_REGISTRY, available_archs
from app.infrastructure.ml.model_registry import (
    ModelRegistry,
    ModelRegistryEntry,
    default_registry_path,
    sha256_file,
)
from app.infrastructure.ml.training.artifacts import (
    save_confusion_matrix,
    save_curves,
    save_metrics_json,
    save_summary_markdown,
)
from app.infrastructure.ml.training.config import TrainingConfig
from app.infrastructure.ml.training.dataset import build_dataloaders
from app.infrastructure.ml.training.evaluation import evaluate
from app.infrastructure.ml.training.trainer import Trainer

logger = get_logger(__name__)


def run_training(config: TrainingConfig) -> dict[str, Any]:
    """Execute a full training run and register the resulting model.

    Returns a summary dict (version, run directory, metrics, artifact paths).

    Raises:
        ConfigurationError: If ``config.arch`` is not a registered architecture.
    """
    classifier_cls = MODEL_REGISTRY.get(config.arch)
    if classifier_cls is None:
        raise ConfigurationError(
            f"Unknown MODEL_ARCH {config.arch!r}. Registered: {available_archs()}"
        )
    classifier = classifier_cls()

    loaders, class_weights, stats = build_dataloaders(config)

    registry = ModelRegistry(default_registry_path(config.model_path))
    version = registry.next_version(config.arch)
    timestamp = datetime.now(UTC).strftime("%Y%m%d_%H%M%S")
    run_dir = Path(config.output_dir) / f"{config.arch}_v{version}_{timestamp}"
    run_dir.mkdir(parents=True, exist_ok=True)

    logger.info("training.start", arch=config.arch, version=version, device_hint="auto")
    trainer = Trainer(config, classifier, run_dir)
    result = trainer.fit(loaders, class_weights)

    metrics = evaluate(trainer.model, loaders["test"], trainer.device, config.class_names)
    logger.info("training.evaluated", **{k: metrics[k] for k in ("accuracy", "f1", "roc_auc")})

    # Artifacts.
    save_curves(result.history, run_dir)
    save_confusion_matrix(metrics["confusion_matrix"], config.class_names, run_dir)
    save_metrics_json(metrics, run_dir)
    save_summary_markdown(
        config=config.to_dict(),
        stats={"total": stats.total, "per_split": stats.per_split, "per_class": stats.per_class},
        metrics=metrics,
        best_epoch=result.best_epoch,
        version=version,
        out_dir=run_dir,
    )

    # Also publish the best weights to MODEL_PATH (classic fallback location).
    model_path = Path(config.model_path)
    model_path.parent.mkdir(parents=True, exist_ok=True)
    shutil.copyfile(result.weights_path, model_path)

    entry = ModelRegistryEntry(
        version=version,
        arch=config.arch,
        dataset=config.dataset_name,
        trained_at=datetime.now(UTC).isoformat(),
        metrics={
            "accuracy": metrics["accuracy"],
            "precision": metrics["precision"],
            "recall": metrics["recall"],
            "f1": metrics["f1"],
            "roc_auc": metrics["roc_auc"],
        },
        sha256=sha256_file(result.weights_path),
        checkpoint_path=str(Path(result.weights_path).resolve()),
        config=config.to_dict(),
        class_names=config.class_names,
        approved=True,
        num_classes=len(config.class_names),
    )
    registry.register(entry)
    logger.info("training.registered", arch=config.arch, version=version)

    return {
        "version": version,
        "run_dir": str(run_dir),
        "best_epoch": result.best_epoch,
        "metrics": metrics,
        "weights_path": result.weights_path,
        "model_path": str(model_path),
        "dataset_stats": {"total": stats.total, "per_split": stats.per_split},
    }
