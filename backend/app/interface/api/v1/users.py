"""User administration routes (admin-only) — demonstrates RBAC in Phase 1.

Listing users requires the ``admin`` role via the ``require_role`` guard; the
mutating admin operations are added in a later phase.
"""

from __future__ import annotations

from typing import Annotated

from fastapi import APIRouter, Depends, Query

from app.application.services.user_service import UserService
from app.domain.entities.user import User
from app.domain.value_objects.role import Role
from app.interface.dependencies import get_user_service, require_role
from app.interface.schemas.auth import UserResponse
from app.interface.schemas.common import Page

router = APIRouter(prefix="/users", tags=["users"])


@router.get(
    "",
    response_model=Page[UserResponse],
    summary="List users (admin only)",
    dependencies=[Depends(require_role(Role.ADMIN))],
)
async def list_users(
    user_service: Annotated[UserService, Depends(get_user_service)],
    page: Annotated[int, Query(ge=1)] = 1,
    size: Annotated[int, Query(ge=1, le=100)] = 20,
) -> Page[UserResponse]:
    """Return a paginated list of users. Requires the ``admin`` role."""
    users, total = await user_service.list_users(page=page, size=size)
    pages = (total + size - 1) // size if size else 0
    items = [
        UserResponse(
            id=user.id or "",
            email=user.email,
            full_name=user.full_name,
            role=user.role,
            is_active=user.is_active,
            created_at=user.created_at,
            last_login=user.last_login,
        )
        for user in users
    ]
    return Page[UserResponse](items=items, page=page, size=size, total=total, pages=pages)


@router.get(
    "/me/roles",
    summary="Return the current user's effective role",
)
async def my_role(
    current_user: Annotated[User, Depends(require_role(Role.USER))],
) -> dict[str, str]:
    """Return the authenticated user's role (any authenticated user)."""
    return {"role": current_user.role.value}
