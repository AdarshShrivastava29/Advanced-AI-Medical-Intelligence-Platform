"""RefreshToken entity — a persisted, revocable refresh-token record.

Only a *hash* of the token and its ``jti`` are stored, enabling rotation and
reuse-detection without ever persisting the raw token
(see ``docs/19_Authentication.md``).
"""

from __future__ import annotations

from dataclasses import dataclass, field
from datetime import UTC, datetime


def _utcnow() -> datetime:
    """Return the current timezone-aware UTC time."""
    return datetime.now(UTC)


@dataclass
class RefreshToken:
    """A stored refresh-token record backing the ``refresh_tokens`` collection."""

    user_id: str
    jti: str
    token_hash: str
    expires_at: datetime
    user_agent: str | None = None
    ip: str | None = None
    revoked: bool = False
    id: str | None = None
    created_at: datetime = field(default_factory=_utcnow)

    def is_active(self, *, now: datetime | None = None) -> bool:
        """Return True if the token is neither revoked nor expired."""
        return not self.revoked and (now or _utcnow()) < self.expires_at
