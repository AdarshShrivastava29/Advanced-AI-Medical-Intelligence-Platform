"""In-memory fake repositories for fast, isolated tests.

These satisfy the same repository *ports* as the Motor adapters, so services can
be tested without a database — demonstrating the value of the Repository pattern
(see docs/27_Testing_Strategy.md).
"""

from __future__ import annotations

from app.domain.entities.refresh_token import RefreshToken
from app.domain.entities.user import User
from app.domain.ports.repositories import RefreshTokenRepository, UserRepository


class InMemoryUserRepository(UserRepository):
    """A dict-backed :class:`UserRepository` for tests."""

    def __init__(self) -> None:
        self._items: dict[str, User] = {}
        self._seq = 0

    async def create(self, entity: User) -> User:
        self._seq += 1
        entity.id = str(self._seq)
        self._items[entity.id] = entity
        return entity

    async def get(self, entity_id: str) -> User | None:
        return self._items.get(entity_id)

    async def get_by_email(self, email: str) -> User | None:
        return next(
            (u for u in self._items.values() if u.email == email.lower()), None
        )

    async def update(self, entity: User) -> User:
        if entity.id is not None:
            self._items[entity.id] = entity
        return entity

    async def delete(self, entity_id: str) -> bool:
        return self._items.pop(entity_id, None) is not None

    async def list_users(self, *, skip: int = 0, limit: int = 20) -> list[User]:
        ordered = sorted(self._items.values(), key=lambda u: u.created_at, reverse=True)
        return ordered[skip : skip + limit]

    async def count(self) -> int:
        return len(self._items)


class InMemoryRefreshTokenRepository(RefreshTokenRepository):
    """A dict-backed :class:`RefreshTokenRepository` for tests."""

    def __init__(self) -> None:
        self._items: dict[str, RefreshToken] = {}
        self._seq = 0

    async def create(self, entity: RefreshToken) -> RefreshToken:
        self._seq += 1
        entity.id = str(self._seq)
        self._items[entity.id] = entity
        return entity

    async def get(self, entity_id: str) -> RefreshToken | None:
        return self._items.get(entity_id)

    async def get_by_jti(self, jti: str) -> RefreshToken | None:
        return next((t for t in self._items.values() if t.jti == jti), None)

    async def update(self, entity: RefreshToken) -> RefreshToken:
        if entity.id is not None:
            self._items[entity.id] = entity
        return entity

    async def delete(self, entity_id: str) -> bool:
        return self._items.pop(entity_id, None) is not None

    async def revoke(self, jti: str) -> bool:
        token = await self.get_by_jti(jti)
        if token is None:
            return False
        token.revoked = True
        return True

    async def revoke_all_for_user(self, user_id: str) -> int:
        count = 0
        for token in self._items.values():
            if token.user_id == user_id and not token.revoked:
                token.revoked = True
                count += 1
        return count
