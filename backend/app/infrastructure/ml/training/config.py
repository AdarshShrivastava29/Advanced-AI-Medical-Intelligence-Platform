"""Training configuration (dataclass, loadable from YAML with overrides)."""

from __future__ import annotations

from dataclasses import asdict, dataclass, field
from pathlib import Path
from typing import Any


@dataclass
class TrainingConfig:
    """All hyperparameters and paths for a training run.

    Loadable from a YAML file and/or keyword overrides so the same pipeline runs
    on the real Kaggle dataset or a small verification dataset unchanged.
    """

    # --- Data ---
    data_dir: str = "./data/datasets/chest_xray"
    dataset_name: str = "chest_xray_pneumonia"
    image_size: int = 224
    val_split: float = 0.15
    test_split: float = 0.15
    resplit: bool = True  # merge any provided train/val/test and re-split deterministically
    class_names: list[str] = field(default_factory=lambda: ["NORMAL", "PNEUMONIA"])

    # --- Model ---
    arch: str = "densenet121"
    pretrained: bool = True

    # --- Optimisation ---
    epochs: int = 15
    batch_size: int = 32
    learning_rate: float = 3e-4
    weight_decay: float = 1e-4
    freeze_backbone_epochs: int = 2  # train head only for the first N epochs
    grad_clip_norm: float = 1.0
    scheduler: str = "cosine"  # cosine | plateau | none
    early_stopping_patience: int = 4
    mixed_precision: bool = True  # honoured only when CUDA is available
    num_workers: int = 0
    seed: int = 42

    # --- Output ---
    output_dir: str = "./data/training"
    model_path: str = "./data/weights/model.pt"

    def to_dict(self) -> dict[str, Any]:
        """Return a plain-dict view of the configuration."""
        return asdict(self)

    @classmethod
    def from_yaml(cls, path: str | Path, **overrides: Any) -> TrainingConfig:
        """Load config from a YAML file, applying keyword overrides on top."""
        import yaml  # type: ignore[import-untyped]

        data: dict[str, Any] = {}
        yaml_path = Path(path)
        if yaml_path.exists():
            data = yaml.safe_load(yaml_path.read_text(encoding="utf-8")) or {}
        data.update({k: v for k, v in overrides.items() if v is not None})
        known = set(cls.__dataclass_fields__)
        return cls(**{k: v for k, v in data.items() if k in known})

    @classmethod
    def from_overrides(cls, **overrides: Any) -> TrainingConfig:
        """Build config from keyword overrides only (None values ignored)."""
        known = set(cls.__dataclass_fields__)
        clean = {k: v for k, v in overrides.items() if k in known and v is not None}
        return cls(**clean)
