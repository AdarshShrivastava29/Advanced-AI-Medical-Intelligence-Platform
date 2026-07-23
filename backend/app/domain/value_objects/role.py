"""Role value object and the role hierarchy used for RBAC.

The platform defines three roles with an increasing privilege ordering:
``user`` < ``doctor`` < ``admin``. The ordering lets a single ``require_role``
guard express "this role or higher" (see ``docs/20_Authorization_RBAC.md``).
"""

from __future__ import annotations

from enum import Enum


class Role(str, Enum):
    """A principal's role. String-valued for transparent JSON/DB serialisation."""

    USER = "user"
    DOCTOR = "doctor"
    ADMIN = "admin"

    @property
    def rank(self) -> int:
        """Numeric privilege rank; higher grants a superset of lower privileges."""
        return _ROLE_RANK[self]

    def satisfies(self, required: Role) -> bool:
        """Return True if this role meets or exceeds the ``required`` role."""
        return self.rank >= required.rank


_ROLE_RANK: dict[Role, int] = {
    Role.USER: 10,
    Role.DOCTOR: 20,
    Role.ADMIN: 30,
}
