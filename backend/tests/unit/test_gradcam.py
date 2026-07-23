"""Unit tests for Grad-CAM computation and PNG rendering."""

from __future__ import annotations

import numpy as np
import torch
from torch import nn

from app.infrastructure.ml.gradcam import GradCAM, render_gradcam

_PNG_MAGIC = b"\x89PNG\r\n\x1a\n"


class _TinyCNN(nn.Module):
    """Minimal CNN with a conv target layer and a 2-class head."""

    def __init__(self) -> None:
        super().__init__()
        self.conv = nn.Conv2d(3, 4, kernel_size=3, padding=1)
        self.pool = nn.AdaptiveAvgPool2d(1)
        self.fc = nn.Linear(4, 2)

    def forward(self, x: torch.Tensor) -> torch.Tensor:
        features = torch.relu(self.conv(x))
        pooled = self.pool(features).flatten(1)
        return self.fc(pooled)


def test_gradcam_heatmap_shape_and_range() -> None:
    model = _TinyCNN().eval()
    inputs = torch.randn(1, 3, 32, 32)
    with GradCAM(model, model.conv) as cam:
        heatmap = cam.generate(inputs, class_idx=1)
    assert heatmap.ndim == 2
    assert float(heatmap.min()) >= 0.0
    assert float(heatmap.max()) <= 1.0 + 1e-6


def test_gradcam_hooks_removed_on_exit() -> None:
    model = _TinyCNN().eval()
    cam = GradCAM(model, model.conv)
    cam.close()
    # After close there must be no forward hooks left on the target layer.
    assert len(model.conv._forward_hooks) == 0


def test_render_returns_three_pngs() -> None:
    rgb = np.zeros((224, 224, 3), dtype=np.uint8)
    heatmap = np.random.default_rng(0).random((7, 7)).astype(np.float32)
    original, heat, overlay = render_gradcam(rgb, heatmap)
    for png in (original, heat, overlay):
        assert png.startswith(_PNG_MAGIC)
