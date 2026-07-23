"""Authentication service — registration, login, token rotation, logout.

Encapsulates the full auth *policy*: password hashing, account lockout after
repeated failures, JWT issuance, refresh-token rotation with reuse detection and
revocation. Depends only on repository ports and :class:`Settings`, so it is unit
testable with in-memory fakes (see ``docs/19_Authentication.md``).
"""

from __future__ import annotations

import hashlib
from datetime import UTC, datetime, timedelta

from app.application.dto.auth_dto import AuthenticatedUser, TokenPair
from app.core.config import Settings
from app.core.exceptions import (
    AccountLockedError,
    AuthenticationError,
    ConflictError,
    ValidationError,
)
from app.core.logging import get_logger
from app.core.security import (
    ACCESS_TOKEN_TYPE,
    REFRESH_TOKEN_TYPE,
    create_access_token,
    create_refresh_token,
    decode_token,
    hash_password,
    verify_password,
)
from app.domain.entities.refresh_token import RefreshToken
from app.domain.entities.user import User
from app.domain.ports.repositories import RefreshTokenRepository, UserRepository
from app.domain.value_objects.role import Role

logger = get_logger(__name__)

_MIN_PASSWORD_LENGTH = 8


class AuthService:
    """Coordinates authentication use-cases across the user and token repositories."""

    def __init__(
        self,
        user_repository: UserRepository,
        refresh_token_repository: RefreshTokenRepository,
        settings: Settings,
    ) -> None:
        self._users = user_repository
        self._tokens = refresh_token_repository
        self._settings = settings

    # ------------------------------------------------------------------ #
    # Registration
    # ------------------------------------------------------------------ #
    async def register(
        self,
        *,
        email: str,
        full_name: str,
        password: str,
        role: Role = Role.USER,
    ) -> User:
        """Create a new user account.

        Raises:
            ValidationError: If the password fails the minimum policy.
            ConflictError: If the email is already registered.
        """
        if len(password) < _MIN_PASSWORD_LENGTH:
            raise ValidationError(
                f"Password must be at least {_MIN_PASSWORD_LENGTH} characters."
            )
        existing = await self._users.get_by_email(email)
        if existing is not None:
            raise ConflictError("An account with this email already exists.")
        user = User(
            email=email.lower(),
            full_name=full_name,
            hashed_password=hash_password(password),
            role=role,
        )
        created = await self._users.create(user)
        logger.info("auth.register.ok", user_id=created.id, email=created.email)
        return created

    # ------------------------------------------------------------------ #
    # Login
    # ------------------------------------------------------------------ #
    async def authenticate(
        self,
        *,
        email: str,
        password: str,
        user_agent: str | None = None,
        ip: str | None = None,
    ) -> AuthenticatedUser:
        """Verify credentials and issue a fresh token pair.

        Applies account lockout after ``MAX_LOGIN_ATTEMPTS`` consecutive failures.

        Raises:
            AuthenticationError: On unknown email, wrong password or inactive account.
            AccountLockedError: When the account is within a lockout window.
        """
        user = await self._users.get_by_email(email)
        if user is None:
            # Uniform error prevents user enumeration.
            raise AuthenticationError("Invalid email or password.")
        if not user.is_active:
            raise AuthenticationError("This account is disabled.")
        if user.is_locked():
            raise AccountLockedError("Account is temporarily locked. Try again later.")

        if not verify_password(password, user.hashed_password):
            await self._register_failed_attempt(user)
            raise AuthenticationError("Invalid email or password.")

        await self._reset_login_state(user)
        tokens = await self._issue_tokens(user, user_agent=user_agent, ip=ip)
        logger.info("auth.login.ok", user_id=user.id)
        return AuthenticatedUser(user=user, tokens=tokens)

    async def _register_failed_attempt(self, user: User) -> None:
        """Increment the failed-attempt counter and lock the account if exceeded."""
        user.failed_login_attempts += 1
        if user.failed_login_attempts >= self._settings.max_login_attempts:
            user.locked_until = datetime.now(UTC) + timedelta(
                minutes=self._settings.lockout_minutes
            )
            user.failed_login_attempts = 0
            logger.warning("auth.login.locked", user_id=user.id)
        await self._users.update(user)

    async def _reset_login_state(self, user: User) -> None:
        """Clear failure counters and record the successful login time."""
        user.failed_login_attempts = 0
        user.locked_until = None
        user.last_login = datetime.now(UTC)
        await self._users.update(user)

    # ------------------------------------------------------------------ #
    # Token issuance & rotation
    # ------------------------------------------------------------------ #
    async def _issue_tokens(
        self, user: User, *, user_agent: str | None, ip: str | None
    ) -> TokenPair:
        """Create an access/refresh pair and persist the refresh token's hash."""
        assert user.id is not None
        access_token, _, _ = create_access_token(
            subject=user.id,
            secret=self._settings.jwt_secret,
            algorithm=self._settings.jwt_algorithm,
            expires_minutes=self._settings.access_token_expire_minutes,
            extra_claims={"role": user.role.value, "email": user.email},
        )
        refresh_token, jti, expires_at = create_refresh_token(
            subject=user.id,
            secret=self._settings.jwt_secret,
            algorithm=self._settings.jwt_algorithm,
            expires_days=self._settings.refresh_token_expire_days,
        )
        await self._tokens.create(
            RefreshToken(
                user_id=user.id,
                jti=jti,
                token_hash=self._hash_token(refresh_token),
                expires_at=expires_at,
                user_agent=user_agent,
                ip=ip,
            )
        )
        return TokenPair(
            access_token=access_token,
            refresh_token=refresh_token,
            expires_in=self._settings.access_token_expire_minutes * 60,
        )

    async def refresh(
        self,
        *,
        refresh_token: str,
        user_agent: str | None = None,
        ip: str | None = None,
    ) -> TokenPair:
        """Rotate a refresh token, returning a new pair.

        Implements reuse detection: presenting an already-revoked (rotated) token
        revokes the entire family for that user and rejects the request.

        Raises:
            AuthenticationError: If the token is invalid, expired, reused or revoked.
        """
        claims = decode_token(
            refresh_token,
            secret=self._settings.jwt_secret,
            algorithm=self._settings.jwt_algorithm,
        )
        if claims.get("type") != REFRESH_TOKEN_TYPE:
            raise AuthenticationError("Provided token is not a refresh token.")

        jti = claims.get("jti", "")
        record = await self._tokens.get_by_jti(jti)
        if record is None or record.token_hash != self._hash_token(refresh_token):
            raise AuthenticationError("Refresh token is not recognised.")

        if record.revoked:
            # Token reuse — revoke the whole family as a precaution.
            await self._tokens.revoke_all_for_user(record.user_id)
            logger.warning("auth.refresh.reuse_detected", user_id=record.user_id)
            raise AuthenticationError("Refresh token has already been used.")

        if not record.is_active():
            raise AuthenticationError("Refresh token has expired.")

        user = await self._users.get(record.user_id)
        if user is None or not user.is_active:
            raise AuthenticationError("Account is no longer active.")

        # Rotate: revoke the presented token, then issue a new pair.
        await self._tokens.revoke(jti)
        tokens = await self._issue_tokens(user, user_agent=user_agent, ip=ip)
        logger.info("auth.refresh.ok", user_id=user.id)
        return tokens

    async def logout(self, *, refresh_token: str) -> None:
        """Revoke a refresh token so it can no longer be rotated."""
        try:
            claims = decode_token(
                refresh_token,
                secret=self._settings.jwt_secret,
                algorithm=self._settings.jwt_algorithm,
            )
        except AuthenticationError:
            return  # Already invalid — nothing to revoke.
        jti = claims.get("jti")
        if jti:
            await self._tokens.revoke(jti)
            logger.info("auth.logout.ok", user_id=claims.get("sub"))

    # ------------------------------------------------------------------ #
    # Access-token resolution (used by the auth dependency)
    # ------------------------------------------------------------------ #
    async def get_user_from_access_token(self, token: str) -> User:
        """Resolve and validate an access token to its :class:`User`.

        Raises:
            AuthenticationError: If the token is invalid or the user is inactive.
        """
        claims = decode_token(
            token, secret=self._settings.jwt_secret, algorithm=self._settings.jwt_algorithm
        )
        if claims.get("type") != ACCESS_TOKEN_TYPE:
            raise AuthenticationError("Provided token is not an access token.")
        user = await self._users.get(claims.get("sub", ""))
        if user is None or not user.is_active:
            raise AuthenticationError("Account is no longer active.")
        return user

    @staticmethod
    def _hash_token(token: str) -> str:
        """Return a stable SHA-256 hex digest of a raw token for storage/compare."""
        return hashlib.sha256(token.encode("utf-8")).hexdigest()
