"""Risk-level value object for medical reports.

The risk band is derived deterministically from the prediction (class +
confidence) rather than from the LLM, so it is reliable and testable. The LLM
produces only the narrative explanation (see ``docs/12_GradCAM.md`` /
``docs/09_AI_Architecture.md``).
"""

from __future__ import annotations

from enum import Enum


class RiskLevel(str, Enum):
    """Clinical risk band surfaced in a report."""

    LOW = "low"
    MODERATE = "moderate"
    HIGH = "high"
