"""Transfer-learning trainer with AMP, scheduling, early stopping and checkpoints."""

from __future__ import annotations

import copy
import random
from dataclasses import dataclass, field
from pathlib import Path
from typing import Any

import numpy as np
import torch
from torch import nn
from torch.utils.data import DataLoader

from app.core.logging import get_logger
from app.infrastructure.ml.classifier.base import Classifier
from app.infrastructure.ml.training.config import TrainingConfig

logger = get_logger(__name__)


def set_seed(seed: int) -> None:
    """Seed Python, NumPy and torch for reproducible runs."""
    random.seed(seed)
    np.random.seed(seed)
    torch.manual_seed(seed)
    torch.cuda.manual_seed_all(seed)
    torch.backends.cudnn.deterministic = True
    torch.backends.cudnn.benchmark = False


@dataclass
class TrainingResult:
    """Outcome of a training run."""

    history: list[dict[str, float]] = field(default_factory=list)
    best_epoch: int = 0
    best_val_loss: float = float("inf")
    best_checkpoint: str = ""
    last_checkpoint: str = ""
    weights_path: str = ""


class Trainer:
    """Fine-tunes a :class:`Classifier` with transfer learning."""

    def __init__(self, config: TrainingConfig, classifier: Classifier, run_dir: Path) -> None:
        self._config = config
        self._classifier = classifier
        self._run_dir = run_dir
        self._device = torch.device("cuda" if torch.cuda.is_available() else "cpu")
        self._use_amp = config.mixed_precision and self._device.type == "cuda"
        self.model = classifier.build(pretrained=config.pretrained).to(self._device)

    @property
    def device(self) -> torch.device:
        """The device training runs on (CUDA when available, else CPU)."""
        return self._device

    # ------------------------------------------------------------------ #
    # Freezing (train head first, then unfreeze the backbone)
    # ------------------------------------------------------------------ #
    def _set_backbone_trainable(self, trainable: bool) -> None:
        for param in self.model.parameters():
            param.requires_grad = trainable
        for param in self.model.classifier.parameters():
            param.requires_grad = True

    # ------------------------------------------------------------------ #
    # Training
    # ------------------------------------------------------------------ #
    def fit(
        self,
        loaders: dict[str, DataLoader],
        class_weights: torch.Tensor,
        *,
        resume_from: str | None = None,
    ) -> TrainingResult:
        """Train the model and return the run result with the best weights loaded."""
        set_seed(self._config.seed)
        self._run_dir.mkdir(parents=True, exist_ok=True)

        criterion = nn.CrossEntropyLoss(weight=class_weights.to(self._device))
        optimizer = torch.optim.AdamW(
            self.model.parameters(),
            lr=self._config.learning_rate,
            weight_decay=self._config.weight_decay,
        )
        scheduler = self._build_scheduler(optimizer)
        scaler = torch.amp.GradScaler("cuda", enabled=self._use_amp)

        start_epoch = 0
        result = TrainingResult()
        best_state = copy.deepcopy(self.model.state_dict())
        epochs_without_improvement = 0

        if resume_from:
            start_epoch = self._load_checkpoint(resume_from, optimizer, scheduler, result)

        self._set_backbone_trainable(False)
        for epoch in range(start_epoch, self._config.epochs):
            if epoch >= self._config.freeze_backbone_epochs:
                self._set_backbone_trainable(True)

            train_loss, train_acc = self._run_epoch(
                loaders["train"], criterion, optimizer, scaler, train=True
            )
            val_loss, val_acc = self._run_epoch(
                loaders["val"], criterion, None, scaler, train=False
            )
            self._step_scheduler(scheduler, val_loss)

            lr = optimizer.param_groups[0]["lr"]
            result.history.append(
                {
                    "epoch": epoch + 1,
                    "train_loss": round(train_loss, 4),
                    "train_acc": round(train_acc, 4),
                    "val_loss": round(val_loss, 4),
                    "val_acc": round(val_acc, 4),
                    "lr": lr,
                }
            )
            logger.info(
                "train.epoch",
                epoch=epoch + 1,
                train_loss=round(train_loss, 4),
                val_loss=round(val_loss, 4),
                val_acc=round(val_acc, 4),
            )

            self._save_checkpoint(self._run_dir / "last.ckpt", epoch, optimizer, scheduler, result)
            result.last_checkpoint = str(self._run_dir / "last.ckpt")

            if val_loss < result.best_val_loss - 1e-4:
                result.best_val_loss = val_loss
                result.best_epoch = epoch + 1
                best_state = copy.deepcopy(self.model.state_dict())
                self._save_checkpoint(
                    self._run_dir / "best.ckpt", epoch, optimizer, scheduler, result
                )
                result.best_checkpoint = str(self._run_dir / "best.ckpt")
                epochs_without_improvement = 0
            else:
                epochs_without_improvement += 1
                if epochs_without_improvement >= self._config.early_stopping_patience:
                    logger.info("train.early_stop", epoch=epoch + 1)
                    break

        # Restore the best weights and export a serving state_dict.
        self.model.load_state_dict(best_state)
        weights_path = self._run_dir / "model.pt"
        torch.save(self.model.state_dict(), weights_path)
        result.weights_path = str(weights_path)
        return result

    def _run_epoch(
        self,
        loader: DataLoader,
        criterion: nn.Module,
        optimizer: torch.optim.Optimizer | None,
        scaler: torch.amp.GradScaler,
        *,
        train: bool,
    ) -> tuple[float, float]:
        """Run one epoch; return ``(mean_loss, accuracy)``."""
        self.model.train(train)
        total_loss = 0.0
        correct = 0
        seen = 0
        for images, labels in loader:
            images = images.to(self._device)
            labels = labels.to(self._device)
            with torch.set_grad_enabled(train), torch.autocast(
                device_type=self._device.type, enabled=self._use_amp
            ):
                logits = self.model(images)
                loss = criterion(logits, labels)

            if train and optimizer is not None:
                optimizer.zero_grad()
                scaler.scale(loss).backward()
                scaler.unscale_(optimizer)
                torch.nn.utils.clip_grad_norm_(
                    self.model.parameters(), self._config.grad_clip_norm
                )
                scaler.step(optimizer)
                scaler.update()

            total_loss += loss.item() * images.size(0)
            correct += int((logits.argmax(dim=1) == labels).sum().item())
            seen += images.size(0)
        return total_loss / max(seen, 1), correct / max(seen, 1)

    # ------------------------------------------------------------------ #
    # Scheduler / checkpoint helpers
    # ------------------------------------------------------------------ #
    def _build_scheduler(self, optimizer: torch.optim.Optimizer) -> Any:
        if self._config.scheduler == "cosine":
            return torch.optim.lr_scheduler.CosineAnnealingLR(
                optimizer, T_max=max(self._config.epochs, 1)
            )
        if self._config.scheduler == "plateau":
            return torch.optim.lr_scheduler.ReduceLROnPlateau(optimizer, mode="min", patience=2)
        return None

    def _step_scheduler(self, scheduler: Any, val_loss: float) -> None:
        if scheduler is None:
            return
        if isinstance(scheduler, torch.optim.lr_scheduler.ReduceLROnPlateau):
            scheduler.step(val_loss)
        else:
            scheduler.step()

    def _save_checkpoint(
        self,
        path: Path,
        epoch: int,
        optimizer: torch.optim.Optimizer,
        scheduler: Any,
        result: TrainingResult,
    ) -> None:
        torch.save(
            {
                "model_state": self.model.state_dict(),
                "optimizer_state": optimizer.state_dict(),
                "scheduler_state": scheduler.state_dict() if scheduler else None,
                "epoch": epoch,
                "best_val_loss": result.best_val_loss,
                "config": self._config.to_dict(),
                "arch": self._classifier.arch,
                "class_names": self._classifier.class_names,
            },
            path,
        )

    def _load_checkpoint(
        self,
        path: str,
        optimizer: torch.optim.Optimizer,
        scheduler: Any,
        result: TrainingResult,
    ) -> int:
        """Restore state from a checkpoint bundle; return the next start epoch."""
        checkpoint = torch.load(path, map_location=self._device, weights_only=False)
        self.model.load_state_dict(checkpoint["model_state"])
        optimizer.load_state_dict(checkpoint["optimizer_state"])
        if scheduler is not None and checkpoint.get("scheduler_state"):
            scheduler.load_state_dict(checkpoint["scheduler_state"])
        result.best_val_loss = checkpoint.get("best_val_loss", float("inf"))
        logger.info("train.resumed", epoch=checkpoint["epoch"] + 1)
        return int(checkpoint["epoch"]) + 1
