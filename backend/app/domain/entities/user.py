"""User entity — the domain model for an authenticated principal."""

from __future__ import annotations

from dataclasses import dataclass, field
from datetime import UTC, datetime

from app.domain.value_objects.role import Role


def _utcnow() -> datetime:
    """Return the current timezone-aware UTC time (injectable seam for tests)."""
    return datetime.now(UTC)


@dataclass
class User:
    """A platform user.

    Mirrors the ``users`` collection (see ``docs/17_Database_Design.md``).
    ``hashed_password`` never leaves the domain/service layer — interface
    schemas expose only safe fields.
    """

    email: str
    full_name: str
    hashed_password: str
    role: Role = Role.USER
    is_active: bool = True
    failed_login_attempts: int = 0
    locked_until: datetime | None = None
    last_login: datetime | None = None
    id: str | None = None
    created_at: datetime = field(default_factory=_utcnow)
    updated_at: datetime = field(default_factory=_utcnow)

    def is_locked(self, *, now: datetime | None = None) -> bool:
        """Return True if the account is currently within a lockout window."""
        if self.locked_until is None:
            return False
        return (now or _utcnow()) < self.locked_until

    def touch(self) -> None:
        """Update the ``updated_at`` timestamp to now."""
        self.updated_at = _utcnow()
