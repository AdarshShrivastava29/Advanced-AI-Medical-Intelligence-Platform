"""Authentication routes: register, login, refresh, logout, me.

Thin controllers — they validate input via schemas, delegate to
:class:`AuthService`, and map the result to response schemas. All error handling
is centralised in the exception handlers (see ``docs/19_Authentication.md``).
"""

from __future__ import annotations

from typing import Annotated

from fastapi import APIRouter, Depends, Request, Response, status

from app.application.services.auth_service import AuthService
from app.domain.entities.user import User
from app.interface.dependencies import CurrentUser, get_auth_service
from app.interface.schemas.auth import (
    LoginRequest,
    LogoutRequest,
    RefreshRequest,
    RegisterRequest,
    TokenResponse,
    UserResponse,
)

router = APIRouter(prefix="/auth", tags=["auth"])


def _to_user_response(user: User) -> UserResponse:
    """Map a :class:`User` entity to its safe public schema."""
    return UserResponse(
        id=user.id or "",
        email=user.email,
        full_name=user.full_name,
        role=user.role,
        is_active=user.is_active,
        created_at=user.created_at,
        last_login=user.last_login,
    )


@router.post(
    "/register",
    response_model=UserResponse,
    status_code=status.HTTP_201_CREATED,
    summary="Register a new user account",
)
async def register(
    payload: RegisterRequest,
    auth_service: Annotated[AuthService, Depends(get_auth_service)],
) -> UserResponse:
    """Create a new user with the default ``user`` role."""
    user = await auth_service.register(
        email=payload.email,
        full_name=payload.full_name,
        password=payload.password,
    )
    return _to_user_response(user)


@router.post("/login", response_model=TokenResponse, summary="Authenticate and get tokens")
async def login(
    payload: LoginRequest,
    request: Request,
    auth_service: Annotated[AuthService, Depends(get_auth_service)],
) -> TokenResponse:
    """Verify credentials and return an access/refresh token pair."""
    result = await auth_service.authenticate(
        email=payload.email,
        password=payload.password,
        user_agent=request.headers.get("user-agent"),
        ip=request.client.host if request.client else None,
    )
    tokens = result.tokens
    return TokenResponse(
        access_token=tokens.access_token,
        refresh_token=tokens.refresh_token,
        token_type=tokens.token_type,
        expires_in=tokens.expires_in,
    )


@router.post("/refresh", response_model=TokenResponse, summary="Rotate a refresh token")
async def refresh(
    payload: RefreshRequest,
    request: Request,
    auth_service: Annotated[AuthService, Depends(get_auth_service)],
) -> TokenResponse:
    """Exchange a valid refresh token for a new, rotated token pair."""
    tokens = await auth_service.refresh(
        refresh_token=payload.refresh_token,
        user_agent=request.headers.get("user-agent"),
        ip=request.client.host if request.client else None,
    )
    return TokenResponse(
        access_token=tokens.access_token,
        refresh_token=tokens.refresh_token,
        token_type=tokens.token_type,
        expires_in=tokens.expires_in,
    )


@router.post(
    "/logout",
    status_code=status.HTTP_204_NO_CONTENT,
    summary="Revoke a refresh token",
)
async def logout(
    payload: LogoutRequest,
    auth_service: Annotated[AuthService, Depends(get_auth_service)],
) -> Response:
    """Revoke the supplied refresh token so it can no longer be rotated."""
    await auth_service.logout(refresh_token=payload.refresh_token)
    return Response(status_code=status.HTTP_204_NO_CONTENT)


@router.get("/me", response_model=UserResponse, summary="Get the current user")
async def me(current_user: CurrentUser) -> UserResponse:
    """Return the profile of the authenticated user."""
    return _to_user_response(current_user)
