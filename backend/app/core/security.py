"""Low-level security primitives: password hashing and JWT encode/decode.

This module contains framework-agnostic cryptographic helpers only. The
authentication *policy* (rotation, lockout, RBAC) lives in the application
services and the ``AuthProvider`` adapter; keeping primitives here honours the
single-responsibility principle (see ``docs/19_Authentication.md``).
"""

from __future__ import annotations

import uuid
from datetime import UTC, datetime, timedelta
from typing import Any

from jose import JWTError, jwt
from passlib.context import CryptContext

from app.core.exceptions import AuthenticationError

# bcrypt with sane defaults; ``deprecated="auto"`` allows future algorithm upgrades.
_pwd_context = CryptContext(schemes=["bcrypt"], deprecated="auto")

# JWT token type claims.
ACCESS_TOKEN_TYPE = "access"
REFRESH_TOKEN_TYPE = "refresh"


def hash_password(plain_password: str) -> str:
    """Return a salted bcrypt hash for ``plain_password``."""
    return _pwd_context.hash(plain_password)


def verify_password(plain_password: str, hashed_password: str) -> bool:
    """Return True if ``plain_password`` matches the stored bcrypt ``hashed_password``."""
    try:
        return _pwd_context.verify(plain_password, hashed_password)
    except ValueError:
        # Malformed hash — treat as a non-match rather than raising.
        return False


def _create_token(
    *,
    subject: str,
    token_type: str,
    secret: str,
    algorithm: str,
    expires_delta: timedelta,
    extra_claims: dict[str, Any] | None = None,
) -> tuple[str, str, datetime]:
    """Encode a signed JWT.

    Returns:
        A tuple of ``(encoded_token, jti, expires_at)``.
    """
    now = datetime.now(UTC)
    expires_at = now + expires_delta
    jti = uuid.uuid4().hex
    payload: dict[str, Any] = {
        "sub": subject,
        "type": token_type,
        "jti": jti,
        "iat": int(now.timestamp()),
        "exp": int(expires_at.timestamp()),
    }
    if extra_claims:
        payload.update(extra_claims)
    token = jwt.encode(payload, secret, algorithm=algorithm)
    return token, jti, expires_at


def create_access_token(
    *,
    subject: str,
    secret: str,
    algorithm: str,
    expires_minutes: int,
    extra_claims: dict[str, Any] | None = None,
) -> tuple[str, str, datetime]:
    """Create a short-lived access token. Returns ``(token, jti, expires_at)``."""
    return _create_token(
        subject=subject,
        token_type=ACCESS_TOKEN_TYPE,
        secret=secret,
        algorithm=algorithm,
        expires_delta=timedelta(minutes=expires_minutes),
        extra_claims=extra_claims,
    )


def create_refresh_token(
    *,
    subject: str,
    secret: str,
    algorithm: str,
    expires_days: int,
    extra_claims: dict[str, Any] | None = None,
) -> tuple[str, str, datetime]:
    """Create a long-lived refresh token. Returns ``(token, jti, expires_at)``."""
    return _create_token(
        subject=subject,
        token_type=REFRESH_TOKEN_TYPE,
        secret=secret,
        algorithm=algorithm,
        expires_delta=timedelta(days=expires_days),
        extra_claims=extra_claims,
    )


def decode_token(token: str, *, secret: str, algorithm: str) -> dict[str, Any]:
    """Decode and verify a JWT, returning its claims.

    Raises:
        AuthenticationError: If the token is invalid, malformed or expired.
    """
    try:
        return jwt.decode(token, secret, algorithms=[algorithm])
    except JWTError as exc:
        raise AuthenticationError("Invalid or expired token.") from exc
