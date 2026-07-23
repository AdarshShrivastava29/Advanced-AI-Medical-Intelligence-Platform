"""User service — read-side use-cases for user administration.

Phase 1 exposes lookups and listing (used by the admin ``/users`` routes to
demonstrate RBAC). Mutating admin operations are added in a later phase.
"""

from __future__ import annotations

from app.core.exceptions import NotFoundError
from app.domain.entities.user import User
from app.domain.ports.repositories import UserRepository


class UserService:
    """Coordinates user read operations over the :class:`UserRepository` port."""

    def __init__(self, user_repository: UserRepository) -> None:
        self._users = user_repository

    async def get_by_id(self, user_id: str) -> User:
        """Return a user by id.

        Raises:
            NotFoundError: If no user exists with ``user_id``.
        """
        user = await self._users.get(user_id)
        if user is None:
            raise NotFoundError("User not found.")
        return user

    async def list_users(self, *, page: int = 1, size: int = 20) -> tuple[list[User], int]:
        """Return a page of users and the total count.

        Args:
            page: 1-based page number.
            size: Page size (number of users per page).
        """
        page = max(page, 1)
        size = max(min(size, 100), 1)
        skip = (page - 1) * size
        users = await self._users.list_users(skip=skip, limit=size)
        total = await self._users.count()
        return users, total
