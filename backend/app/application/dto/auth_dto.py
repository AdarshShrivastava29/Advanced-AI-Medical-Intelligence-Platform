"""Auth-related data-transfer objects."""

from __future__ import annotations

from dataclasses import dataclass

from app.domain.entities.user import User


@dataclass(frozen=True)
class TokenPair:
    """An issued access/refresh token pair with the access-token lifetime."""

    access_token: str
    refresh_token: str
    token_type: str = "bearer"
    expires_in: int = 0


@dataclass(frozen=True)
class AuthenticatedUser:
    """The result of a successful authentication: the user plus fresh tokens."""

    user: User
    tokens: TokenPair
