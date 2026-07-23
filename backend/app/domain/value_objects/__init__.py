"""Domain value objects."""

from app.domain.value_objects.inference_result import GradCamArtifacts, InferenceOutput
from app.domain.value_objects.risk_level import RiskLevel
from app.domain.value_objects.role import Role

__all__ = ["GradCamArtifacts", "InferenceOutput", "RiskLevel", "Role"]
