"""Model evaluation: accuracy, precision/recall/F1, ROC-AUC, confusion matrix."""

from __future__ import annotations

from typing import Any

import numpy as np
import torch
from torch.utils.data import DataLoader

_EPS = 1e-9


def _collect_predictions(
    model: torch.nn.Module, loader: DataLoader, device: torch.device
) -> tuple[np.ndarray, np.ndarray, np.ndarray]:
    """Return ``(y_true, y_pred, y_prob_positive)`` over a dataloader."""
    model.eval()
    y_true: list[int] = []
    y_pred: list[int] = []
    y_prob: list[float] = []
    with torch.no_grad():
        for images, labels in loader:
            images = images.to(device)
            probs = torch.softmax(model(images), dim=1).cpu().numpy()
            y_true.extend(labels.numpy().tolist())
            y_pred.extend(probs.argmax(axis=1).tolist())
            y_prob.extend(probs[:, 1].tolist())
    return np.asarray(y_true), np.asarray(y_pred), np.asarray(y_prob)


def evaluate(
    model: torch.nn.Module,
    loader: DataLoader,
    device: torch.device,
    class_names: list[str],
) -> dict[str, Any]:
    """Compute a full metrics report for ``model`` on ``loader``."""
    from sklearn.metrics import (
        classification_report,
        confusion_matrix,
        f1_score,
        precision_score,
        recall_score,
        roc_auc_score,
    )

    y_true, y_pred, y_prob = _collect_predictions(model, loader, device)
    accuracy = float((y_true == y_pred).mean()) if len(y_true) else 0.0

    try:
        roc_auc = float(roc_auc_score(y_true, y_prob)) if len(set(y_true.tolist())) > 1 else 0.0
    except ValueError:
        roc_auc = 0.0

    report = classification_report(
        y_true, y_pred, target_names=class_names, output_dict=True, zero_division=0
    )
    matrix = confusion_matrix(y_true, y_pred, labels=list(range(len(class_names)))).tolist()

    return {
        "accuracy": round(accuracy, 4),
        "precision": round(float(precision_score(y_true, y_pred, pos_label=1, zero_division=0)), 4),
        "recall": round(float(recall_score(y_true, y_pred, pos_label=1, zero_division=0)), 4),
        "f1": round(float(f1_score(y_true, y_pred, pos_label=1, zero_division=0)), 4),
        "f1_macro": round(float(f1_score(y_true, y_pred, average="macro", zero_division=0)), 4),
        "roc_auc": round(roc_auc, 4),
        "confusion_matrix": matrix,
        "per_class": {
            name: {
                "precision": round(report[name]["precision"], 4),
                "recall": round(report[name]["recall"], 4),
                "f1": round(report[name]["f1-score"], 4),
                "support": int(report[name]["support"]),
            }
            for name in class_names
        },
        "num_samples": int(len(y_true)),
    }
