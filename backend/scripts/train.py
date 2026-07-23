"""CLI entrypoint for the AIMIP model training pipeline.

Examples
--------
Train on the real Kaggle dataset (place it under ``data/datasets/chest_xray``)::

    python scripts/train.py --config configs/training.yaml

Verify the pipeline end-to-end on a generated dataset (no download)::

    python scripts/train.py --synthetic --arch densenet121 --epochs 4

Switch architecture with a single flag (same pipeline, no code change)::

    python scripts/train.py --config configs/training.yaml --arch efficientnet_b0
"""

from __future__ import annotations

import argparse
import sys
from pathlib import Path

# Make the ``app`` package importable when run as a script.
sys.path.insert(0, str(Path(__file__).resolve().parents[1]))

from app.core.logging import configure_logging, get_logger
from app.infrastructure.ml.training.config import TrainingConfig
from app.infrastructure.ml.training.dataset import generate_synthetic_dataset
from app.infrastructure.ml.training.pipeline import run_training

logger = get_logger("train")


def _download_kaggle(data_dir: str) -> None:
    """Best-effort download of the Kaggle dataset via kagglehub, if available."""
    try:
        import kagglehub
    except ImportError:
        raise SystemExit(
            "kagglehub is not installed. Install it (`pip install kagglehub`) and set "
            "Kaggle credentials, or download 'paultimothymooney/chest-xray-pneumonia' "
            f"manually into {data_dir}."
        ) from None
    path = kagglehub.dataset_download("paultimothymooney/chest-xray-pneumonia")
    logger.info("kaggle.downloaded", path=path)
    print(f"Downloaded to: {path}. Point --data-dir at the 'chest_xray' folder within it.")


def _parse_args() -> argparse.Namespace:
    parser = argparse.ArgumentParser(description="Train the AIMIP pneumonia classifier.")
    parser.add_argument("--config", default="configs/training.yaml", help="YAML config path.")
    parser.add_argument("--arch", choices=["densenet121", "efficientnet_b0"], default=None)
    parser.add_argument("--data-dir", default=None)
    parser.add_argument("--output-dir", default=None)
    parser.add_argument("--model-path", default=None)
    parser.add_argument("--epochs", type=int, default=None)
    parser.add_argument("--batch-size", type=int, default=None)
    parser.add_argument("--learning-rate", type=float, default=None)
    parser.add_argument("--image-size", type=int, default=None)
    parser.add_argument("--seed", type=int, default=None)
    parser.add_argument(
        "--synthetic", action="store_true", help="Generate a small verification dataset."
    )
    parser.add_argument("--synthetic-per-class", type=int, default=80)
    parser.add_argument("--download", action="store_true", help="Download the Kaggle dataset.")
    return parser.parse_args()


def main() -> int:
    """Run the training pipeline from CLI arguments."""
    configure_logging(level="INFO", json_logs=False)
    args = _parse_args()

    config = TrainingConfig.from_yaml(
        args.config,
        arch=args.arch,
        data_dir=args.data_dir,
        output_dir=args.output_dir,
        model_path=args.model_path,
        epochs=args.epochs,
        batch_size=args.batch_size,
        learning_rate=args.learning_rate,
        image_size=args.image_size,
        seed=args.seed,
    )

    if args.download:
        _download_kaggle(config.data_dir)
        return 0

    if args.synthetic:
        logger.info("dataset.synthetic.generate", data_dir=config.data_dir)
        generate_synthetic_dataset(
            config.data_dir,
            per_class=args.synthetic_per_class,
            image_size=max(config.image_size // 2, 64),
        )

    summary = run_training(config)
    print("\n=== Training complete ===")
    print(f"Model:      {config.arch} v{summary['version']} (best epoch {summary['best_epoch']})")
    print(f"Test acc:   {summary['metrics']['accuracy']}  F1: {summary['metrics']['f1']}  "
          f"ROC-AUC: {summary['metrics']['roc_auc']}")
    print(f"Artifacts:  {summary['run_dir']}")
    print(f"Registered: {summary['model_path']}")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
