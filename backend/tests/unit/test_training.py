"""Unit tests for training config, dataset, transforms and the model registry."""

from __future__ import annotations

import pytest

from app.core.exceptions import ValidationError
from app.infrastructure.ml.model_registry import (
    ModelRegistry,
    ModelRegistryEntry,
    default_registry_path,
    sha256_file,
)
from app.infrastructure.ml.training.config import TrainingConfig
from app.infrastructure.ml.training.dataset import (
    build_dataloaders,
    class_weights,
    compute_stats,
    generate_synthetic_dataset,
    load_splits,
)
from app.infrastructure.ml.training.transforms import build_eval_transforms


# --- config --- #
def test_config_defaults() -> None:
    config = TrainingConfig()
    assert config.arch == "densenet121"
    assert config.class_names == ["NORMAL", "PNEUMONIA"]


def test_config_from_yaml_missing_file_uses_overrides(tmp_path) -> None:  # type: ignore[no-untyped-def]
    config = TrainingConfig.from_yaml(tmp_path / "nope.yaml", arch="efficientnet_b0", epochs=3)
    assert config.arch == "efficientnet_b0"
    assert config.epochs == 3


def test_config_from_overrides_ignores_none() -> None:
    config = TrainingConfig.from_overrides(arch=None, epochs=7)
    assert config.arch == "densenet121"  # None ignored -> default
    assert config.epochs == 7


# --- dataset --- #
def test_synthetic_dataset_and_splits(tmp_path) -> None:  # type: ignore[no-untyped-def]
    root = generate_synthetic_dataset(tmp_path / "ds", per_class=20, image_size=48)
    config = TrainingConfig(data_dir=str(root), image_size=48, seed=1)
    splits = load_splits(config)
    assert set(splits) == {"train", "val", "test"}
    stats = compute_stats(splits, config.class_names)
    assert stats.total == 40
    assert stats.per_class == {"NORMAL": 20, "PNEUMONIA": 20}
    # Stratified: both classes appear in the training split.
    train_labels = {label for _, label in splits["train"]}
    assert train_labels == {0, 1}


def test_missing_dataset_raises() -> None:
    with pytest.raises(ValidationError):
        load_splits(TrainingConfig(data_dir="/no/such/dataset"))


def test_class_weights_balance_inverse_frequency() -> None:
    samples = [("a", 0)] * 10 + [("b", 1)] * 2
    weights = class_weights(samples, num_classes=2)
    assert float(weights[1]) > float(weights[0])  # minority class weighted higher


def test_build_dataloaders_shapes(tmp_path) -> None:  # type: ignore[no-untyped-def]
    root = generate_synthetic_dataset(tmp_path / "ds", per_class=16, image_size=48)
    config = TrainingConfig(data_dir=str(root), image_size=48, batch_size=8, seed=2)
    loaders, weights, stats = build_dataloaders(config)
    images, labels = next(iter(loaders["train"]))
    assert images.shape[1:] == (3, 48, 48)
    assert images.shape[0] <= 8
    assert weights.shape == (2,)
    assert stats.total == 32


# --- transforms --- #
def test_eval_transform_produces_tensor() -> None:
    from PIL import Image

    img = Image.new("RGB", (200, 150), color=(120, 120, 120))
    tensor = build_eval_transforms(64)(img)
    assert tuple(tensor.shape) == (3, 64, 64)


# --- registry --- #
def test_registry_versioning_and_approval(tmp_path) -> None:  # type: ignore[no-untyped-def]
    registry = ModelRegistry(tmp_path / "registry.json")
    assert registry.next_version("densenet121") == 1

    def _entry(version: int, approved: bool) -> ModelRegistryEntry:
        return ModelRegistryEntry(
            version=version,
            arch="densenet121",
            dataset="d",
            trained_at="t",
            metrics={"f1": 0.9},
            sha256="hash",
            checkpoint_path="/x/model.pt",
            config={},
            class_names=["NORMAL", "PNEUMONIA"],
            approved=approved,
        )

    registry.register(_entry(1, True))
    registry.register(_entry(2, False))
    registry.register(_entry(3, True))
    assert registry.next_version("densenet121") == 4
    latest = registry.latest_approved("densenet121")
    assert latest is not None and latest.version == 3  # skips unapproved v2
    assert registry.latest_approved("efficientnet_b0") is None


def test_default_registry_path_beside_model() -> None:
    assert default_registry_path("./data/weights/model.pt").name == "registry.json"


def test_sha256_file(tmp_path) -> None:  # type: ignore[no-untyped-def]
    path = tmp_path / "f.bin"
    path.write_bytes(b"hello")
    assert sha256_file(path) == sha256_file(path)
    assert len(sha256_file(path)) == 64


def test_registry_entry_from_dict_ignores_unknown() -> None:
    entry = ModelRegistryEntry.from_dict(
        {
            "version": 1,
            "arch": "densenet121",
            "dataset": "d",
            "trained_at": "t",
            "metrics": {},
            "sha256": "h",
            "checkpoint_path": "/x",
            "config": {},
            "class_names": ["NORMAL", "PNEUMONIA"],
            "extra_unknown": "ignored",
        }
    )
    assert entry.version == 1
