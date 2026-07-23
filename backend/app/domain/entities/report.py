"""Report entity — an LLM-generated medical report tied to a prediction."""

from __future__ import annotations

from dataclasses import dataclass, field
from datetime import UTC, datetime

from app.domain.value_objects.risk_level import RiskLevel


def _utcnow() -> datetime:
    """Return the current timezone-aware UTC time."""
    return datetime.now(UTC)


@dataclass
class Report:
    """A medical report generated for a prediction.

    The ``content_markdown`` narrative is produced through the ``AIProvider``
    abstraction (never a vendor SDK directly); ``risk_level`` is derived
    deterministically from the prediction. Mirrors the ``reports`` collection
    (see ``docs/17_Database_Design.md``).
    """

    prediction_id: str
    user_id: str
    llm_provider: str
    llm_model: str
    content_markdown: str
    risk_level: RiskLevel
    sections: dict[str, str] = field(default_factory=dict)
    id: str | None = None
    created_at: datetime = field(default_factory=_utcnow)
