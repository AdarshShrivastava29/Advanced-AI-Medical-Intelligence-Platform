"""Unit tests for password hashing and JWT primitives."""

from __future__ import annotations

import pytest

from app.core.exceptions import AuthenticationError
from app.core.security import (
    ACCESS_TOKEN_TYPE,
    create_access_token,
    decode_token,
    hash_password,
    verify_password,
)

_SECRET = "unit-test-secret-0123456789abcdef"
_ALG = "HS256"


def test_password_hash_roundtrip() -> None:
    hashed = hash_password("s3curePass!")
    assert hashed != "s3curePass!"
    assert verify_password("s3curePass!", hashed)
    assert not verify_password("wrong", hashed)


def test_verify_password_with_malformed_hash_returns_false() -> None:
    assert verify_password("anything", "not-a-real-hash") is False


def test_access_token_roundtrip() -> None:
    token, jti, _ = create_access_token(
        subject="user-1", secret=_SECRET, algorithm=_ALG, expires_minutes=30
    )
    claims = decode_token(token, secret=_SECRET, algorithm=_ALG)
    assert claims["sub"] == "user-1"
    assert claims["type"] == ACCESS_TOKEN_TYPE
    assert claims["jti"] == jti


def test_decode_with_wrong_secret_raises() -> None:
    token, _, _ = create_access_token(
        subject="user-1", secret=_SECRET, algorithm=_ALG, expires_minutes=30
    )
    with pytest.raises(AuthenticationError):
        decode_token(token, secret="different-secret", algorithm=_ALG)


def test_expired_token_raises() -> None:
    token, _, _ = create_access_token(
        subject="user-1", secret=_SECRET, algorithm=_ALG, expires_minutes=-1
    )
    with pytest.raises(AuthenticationError):
        decode_token(token, secret=_SECRET, algorithm=_ALG)
