"""EfficientNet-B0 classifier adapter (``MODEL_ARCH=efficientnet_b0``)."""

from __future__ import annotations

from torch import nn
from torchvision.models import EfficientNet_B0_Weights, efficientnet_b0

from app.infrastructure.ml.classifier.base import Classifier


class EfficientNetB0Classifier(Classifier):
    """Transfer-learning EfficientNet-B0 with a 2-class head."""

    arch = "efficientnet_b0"

    def build(self, *, pretrained: bool = True) -> nn.Module:
        """Build EfficientNet-B0, replacing the final linear layer with a 2-class head."""
        weights = EfficientNet_B0_Weights.IMAGENET1K_V1 if pretrained else None
        model = efficientnet_b0(weights=weights)
        in_features = model.classifier[1].in_features
        model.classifier[1] = nn.Linear(in_features, self.num_classes)
        return model

    def target_layer(self, model: nn.Module) -> nn.Module:
        """Grad-CAM targets the final convolutional feature stack."""
        return model.features
