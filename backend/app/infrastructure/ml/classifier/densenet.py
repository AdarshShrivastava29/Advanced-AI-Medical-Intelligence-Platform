"""DenseNet-121 classifier adapter (``MODEL_ARCH=densenet121``)."""

from __future__ import annotations

from torch import nn
from torchvision.models import DenseNet121_Weights, densenet121

from app.infrastructure.ml.classifier.base import Classifier


class DenseNet121Classifier(Classifier):
    """Transfer-learning DenseNet-121 with a 2-class head."""

    arch = "densenet121"

    def build(self, *, pretrained: bool = True) -> nn.Module:
        """Build DenseNet-121, replacing the 1000-way head with a 2-class head."""
        weights = DenseNet121_Weights.IMAGENET1K_V1 if pretrained else None
        model = densenet121(weights=weights)
        in_features = model.classifier.in_features
        model.classifier = nn.Linear(in_features, self.num_classes)
        return model

    def target_layer(self, model: nn.Module) -> nn.Module:
        """Grad-CAM targets the final dense block.

        DenseNet applies an in-place ReLU to the output of ``model.features``,
        which is incompatible with a backward hook on that module, so we hook the
        preceding ``denseblock4`` whose spatial output is not modified in place.
        """
        return model.features.denseblock4
