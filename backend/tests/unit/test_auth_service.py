"""Unit tests for the AuthService: registration, login, lockout, rotation, logout."""

from __future__ import annotations

import pytest

from app.application.services.auth_service import AuthService
from app.core.exceptions import (
    AccountLockedError,
    AuthenticationError,
    ConflictError,
    ValidationError,
)

pytestmark = pytest.mark.asyncio


async def _register(auth_service: AuthService) -> None:
    await auth_service.register(
        email="doc@example.com", full_name="Dr Test", password="s3curePass!"
    )


async def test_register_creates_user(auth_service: AuthService) -> None:
    user = await auth_service.register(
        email="New@Example.com", full_name="New User", password="password123"
    )
    assert user.id is not None
    assert user.email == "new@example.com"  # normalised to lowercase


async def test_register_short_password_rejected(auth_service: AuthService) -> None:
    with pytest.raises(ValidationError):
        await auth_service.register(
            email="a@b.com", full_name="A", password="short"
        )


async def test_register_duplicate_email_conflicts(auth_service: AuthService) -> None:
    await _register(auth_service)
    with pytest.raises(ConflictError):
        await _register(auth_service)


async def test_login_success_returns_tokens(auth_service: AuthService) -> None:
    await _register(auth_service)
    result = await auth_service.authenticate(
        email="doc@example.com", password="s3curePass!"
    )
    assert result.tokens.access_token
    assert result.tokens.refresh_token
    assert result.user.last_login is not None


async def test_login_wrong_password_raises(auth_service: AuthService) -> None:
    await _register(auth_service)
    with pytest.raises(AuthenticationError):
        await auth_service.authenticate(email="doc@example.com", password="nope!!!")


async def test_account_locks_after_max_attempts(auth_service: AuthService) -> None:
    await _register(auth_service)
    # test_settings sets max_login_attempts=3.
    for _ in range(3):
        with pytest.raises(AuthenticationError):
            await auth_service.authenticate(email="doc@example.com", password="bad-pass")
    with pytest.raises(AccountLockedError):
        await auth_service.authenticate(email="doc@example.com", password="s3curePass!")


async def test_refresh_rotates_and_detects_reuse(auth_service: AuthService) -> None:
    await _register(auth_service)
    login = await auth_service.authenticate(
        email="doc@example.com", password="s3curePass!"
    )
    old_refresh = login.tokens.refresh_token

    rotated = await auth_service.refresh(refresh_token=old_refresh)
    assert rotated.refresh_token != old_refresh

    # Reusing the old (now revoked) token is rejected.
    with pytest.raises(AuthenticationError):
        await auth_service.refresh(refresh_token=old_refresh)

    # Reuse detection revoked the whole family, so the rotated token is dead too.
    with pytest.raises(AuthenticationError):
        await auth_service.refresh(refresh_token=rotated.refresh_token)


async def test_logout_revokes_refresh_token(auth_service: AuthService) -> None:
    await _register(auth_service)
    login = await auth_service.authenticate(
        email="doc@example.com", password="s3curePass!"
    )
    await auth_service.logout(refresh_token=login.tokens.refresh_token)
    with pytest.raises(AuthenticationError):
        await auth_service.refresh(refresh_token=login.tokens.refresh_token)


async def test_access_token_resolves_to_user(auth_service: AuthService) -> None:
    await _register(auth_service)
    login = await auth_service.authenticate(
        email="doc@example.com", password="s3curePass!"
    )
    user = await auth_service.get_user_from_access_token(login.tokens.access_token)
    assert user.email == "doc@example.com"

    # A refresh token must not be accepted as an access token.
    with pytest.raises(AuthenticationError):
        await auth_service.get_user_from_access_token(login.tokens.refresh_token)
