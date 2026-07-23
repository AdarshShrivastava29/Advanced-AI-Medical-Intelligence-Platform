"""Auth request/response schemas."""

from __future__ import annotations

from datetime import datetime

from pydantic import BaseModel, EmailStr, Field

from app.domain.value_objects.role import Role


class RegisterRequest(BaseModel):
    """Payload to register a new user account."""

    email: EmailStr = Field(description="Unique account email.")
    full_name: str = Field(min_length=1, max_length=120, description="Display name.")
    password: str = Field(min_length=8, max_length=128, description="Plaintext password.")


class LoginRequest(BaseModel):
    """Payload to authenticate with email + password."""

    email: EmailStr = Field(description="Account email.")
    password: str = Field(min_length=1, max_length=128, description="Plaintext password.")


class RefreshRequest(BaseModel):
    """Payload to rotate a refresh token."""

    refresh_token: str = Field(description="A valid, unexpired refresh token.")


class LogoutRequest(BaseModel):
    """Payload to revoke a refresh token."""

    refresh_token: str = Field(description="The refresh token to revoke.")


class TokenResponse(BaseModel):
    """An issued access/refresh token pair."""

    access_token: str = Field(description="Short-lived bearer access token.")
    refresh_token: str = Field(description="Long-lived refresh token.")
    token_type: str = Field(default="bearer", description="Auth scheme.")
    expires_in: int = Field(description="Access-token lifetime in seconds.")


class UserResponse(BaseModel):
    """A safe public projection of a user (never includes the password hash)."""

    id: str
    email: EmailStr
    full_name: str
    role: Role
    is_active: bool
    created_at: datetime
    last_login: datetime | None = None
