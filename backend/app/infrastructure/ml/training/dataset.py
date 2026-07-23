"""Dataset discovery, validation, statistics, splitting and loaders.

Consumes the Kaggle Chest X-Ray Pneumonia layout (``train|val|test`` each with
``NORMAL``/``PNEUMONIA`` subfolders) or a flat class-folder layout. Provides
deterministic stratified splits, class weights for imbalance, and a synthetic
generator used to verify the pipeline without the ~1 GB download.
"""

from __future__ import annotations

import io
import random
from collections.abc import Callable
from dataclasses import dataclass
from pathlib import Path

import numpy as np
import torch
from PIL import Image
from torch.utils.data import DataLoader, Dataset

from app.core.exceptions import ValidationError
from app.core.logging import get_logger
from app.infrastructure.ml.training.config import TrainingConfig
from app.infrastructure.ml.training.transforms import (
    build_eval_transforms,
    build_train_transforms,
)

logger = get_logger(__name__)

_IMAGE_EXTS = {".png", ".jpg", ".jpeg", ".bmp"}
_SPLIT_DIRS = ("train", "val", "test")

Sample = tuple[str, int]


@dataclass(frozen=True)
class DatasetStats:
    """Per-split, per-class sample counts."""

    total: int
    per_split: dict[str, int]
    per_class: dict[str, int]


class ImageClassificationDataset(Dataset):
    """A torch dataset over ``(path, label)`` samples with a transform."""

    def __init__(
        self, samples: list[Sample], transform: Callable[[Image.Image], torch.Tensor]
    ) -> None:
        self._samples = samples
        self._transform = transform

    def __len__(self) -> int:
        return len(self._samples)

    def __getitem__(self, index: int) -> tuple[torch.Tensor, int]:
        path, label = self._samples[index]
        with Image.open(path) as image:
            tensor = self._transform(image.convert("RGB"))
        return tensor, label


def _class_to_idx(class_names: list[str]) -> dict[str, int]:
    return {name: idx for idx, name in enumerate(class_names)}


def _collect(directory: Path, class_to_idx: dict[str, int]) -> list[Sample]:
    """Collect ``(path, label)`` samples from a directory of class subfolders."""
    samples: list[Sample] = []
    for class_name, label in class_to_idx.items():
        class_dir = directory / class_name
        if not class_dir.is_dir():
            continue
        for path in class_dir.rglob("*"):
            if path.suffix.lower() in _IMAGE_EXTS:
                samples.append((str(path), label))
    return samples


def _stratified_split(
    samples: list[Sample], *, val_split: float, test_split: float, seed: int
) -> dict[str, list[Sample]]:
    """Deterministically split samples per class into train/val/test."""
    rng = random.Random(seed)
    by_label: dict[int, list[Sample]] = {}
    for sample in samples:
        by_label.setdefault(sample[1], []).append(sample)

    splits: dict[str, list[Sample]] = {"train": [], "val": [], "test": []}
    for label_samples in by_label.values():
        ordered = sorted(label_samples)
        rng.shuffle(ordered)
        n = len(ordered)
        n_test = max(1, int(n * test_split)) if n > 2 else 0
        n_val = max(1, int(n * val_split)) if n > 2 else 0
        splits["test"].extend(ordered[:n_test])
        splits["val"].extend(ordered[n_test : n_test + n_val])
        splits["train"].extend(ordered[n_test + n_val :])
    for split in splits.values():
        rng.shuffle(split)
    return splits


def load_splits(config: TrainingConfig) -> dict[str, list[Sample]]:
    """Return train/val/test sample lists honouring the dataset layout.

    Raises:
        ValidationError: If the dataset directory or classes are missing/empty.
    """
    root = Path(config.data_dir)
    if not root.is_dir():
        raise ValidationError(f"Dataset directory not found: {root}")
    class_to_idx = _class_to_idx(config.class_names)

    has_splits = all((root / split).is_dir() for split in _SPLIT_DIRS)
    if has_splits and not config.resplit:
        splits = {split: _collect(root / split, class_to_idx) for split in _SPLIT_DIRS}
    else:
        base = root
        all_samples: list[Sample] = []
        if has_splits:
            for split in _SPLIT_DIRS:
                all_samples.extend(_collect(base / split, class_to_idx))
        else:
            all_samples = _collect(base, class_to_idx)
        splits = _stratified_split(
            all_samples,
            val_split=config.val_split,
            test_split=config.test_split,
            seed=config.seed,
        )

    total = sum(len(s) for s in splits.values())
    if total == 0:
        raise ValidationError(
            f"No images found under {root} for classes {config.class_names}."
        )
    for split, samples in splits.items():
        if not samples:
            raise ValidationError(f"The '{split}' split is empty; add more data.")
    return splits


def compute_stats(
    splits: dict[str, list[Sample]], class_names: list[str]
) -> DatasetStats:
    """Compute per-split and per-class counts for a set of splits."""
    per_split = {split: len(samples) for split, samples in splits.items()}
    per_class = {name: 0 for name in class_names}
    for samples in splits.values():
        for _, label in samples:
            per_class[class_names[label]] += 1
    return DatasetStats(
        total=sum(per_split.values()), per_split=per_split, per_class=per_class
    )


def class_weights(train_samples: list[Sample], num_classes: int) -> torch.Tensor:
    """Return inverse-frequency class weights for the training split."""
    counts = np.bincount([label for _, label in train_samples], minlength=num_classes)
    counts = np.clip(counts, 1, None)
    weights = counts.sum() / (num_classes * counts)
    return torch.tensor(weights, dtype=torch.float32)


def build_dataloaders(
    config: TrainingConfig,
) -> tuple[dict[str, DataLoader], torch.Tensor, DatasetStats]:
    """Return ``{train,val,test}`` dataloaders, class weights and dataset stats."""
    splits = load_splits(config)
    stats = compute_stats(splits, config.class_names)
    logger.info("dataset.loaded", per_split=stats.per_split, per_class=stats.per_class)

    train_tf = build_train_transforms(config.image_size)
    eval_tf = build_eval_transforms(config.image_size)
    datasets = {
        "train": ImageClassificationDataset(splits["train"], train_tf),
        "val": ImageClassificationDataset(splits["val"], eval_tf),
        "test": ImageClassificationDataset(splits["test"], eval_tf),
    }
    loaders = {
        split: DataLoader(
            dataset,
            batch_size=config.batch_size,
            shuffle=(split == "train"),
            num_workers=config.num_workers,
        )
        for split, dataset in datasets.items()
    }
    weights = class_weights(splits["train"], len(config.class_names))
    return loaders, weights, stats


# --------------------------------------------------------------------------- #
# Synthetic dataset (pipeline verification without the real ~1 GB download)
# --------------------------------------------------------------------------- #
def generate_synthetic_dataset(
    directory: str | Path,
    *,
    per_class: int = 60,
    image_size: int = 96,
    seed: int = 0,
) -> Path:
    """Create a small, learnable 2-class dataset of greyscale X-ray-like images.

    ``NORMAL`` images are smooth gradients; ``PNEUMONIA`` images add bright
    opacity blobs — a difference a CNN can learn in a few epochs. Returns the
    dataset root. This exists to *verify the pipeline*, not to replace the real
    Kaggle dataset.
    """
    root = Path(directory)
    rng = np.random.default_rng(seed)
    for class_name in ("NORMAL", "PNEUMONIA"):
        (root / class_name).mkdir(parents=True, exist_ok=True)

    for i in range(per_class):
        # NORMAL: smooth vertical gradient with mild noise.
        base = np.linspace(40, 180, image_size, dtype=np.float32)
        normal = np.tile(base, (image_size, 1))
        normal += rng.normal(0, 6, (image_size, image_size)).astype(np.float32)
        _save_gray(normal, root / "NORMAL" / f"normal_{i:03d}.png")

        # PNEUMONIA: same base plus several bright opacity blobs.
        pneumonia = np.tile(base, (image_size, 1)).astype(np.float32)
        for _ in range(rng.integers(3, 6)):
            cy, cx = rng.integers(0, image_size, size=2)
            radius = int(rng.integers(6, 14))
            yy, xx = np.ogrid[:image_size, :image_size]
            mask = (yy - cy) ** 2 + (xx - cx) ** 2 <= radius**2
            pneumonia[mask] = np.clip(pneumonia[mask] + 90, 0, 255)
        pneumonia += rng.normal(0, 6, (image_size, image_size)).astype(np.float32)
        _save_gray(pneumonia, root / "PNEUMONIA" / f"pneumonia_{i:03d}.png")

    return root


def _save_gray(array: np.ndarray, path: Path) -> None:
    """Save a float array as an 8-bit greyscale PNG."""
    clipped = np.clip(array, 0, 255).astype(np.uint8)
    Image.fromarray(clipped, mode="L").save(path)


def synthetic_image_bytes(*, pneumonia: bool, image_size: int = 96, seed: int = 7) -> bytes:
    """Return PNG bytes of one synthetic sample (used by inference smoke tests)."""
    rng = np.random.default_rng(seed)
    base = np.tile(np.linspace(40, 180, image_size, dtype=np.float32), (image_size, 1))
    if pneumonia:
        for _ in range(4):
            cy, cx = rng.integers(0, image_size, size=2)
            yy, xx = np.ogrid[:image_size, :image_size]
            base[(yy - cy) ** 2 + (xx - cx) ** 2 <= 100] = 240
    buffer = io.BytesIO()
    Image.fromarray(np.clip(base, 0, 255).astype(np.uint8), mode="L").save(buffer, format="PNG")
    return buffer.getvalue()
