"""FastAPI dependency-injection providers.

These functions bridge the web framework to the composition root: they pull the
:class:`Container` off ``app.state`` and hand routers fully-wired services, the
current authenticated user, and RBAC guards. Routers depend on these — never on
concrete adapters (see ``docs/20_Authorization_RBAC.md``).
"""

from __future__ import annotations

from collections.abc import Callable, Coroutine
from typing import Annotated, Any

from fastapi import Depends, Request
from fastapi.security import HTTPAuthorizationCredentials, HTTPBearer

from app.application.services.analytics_service import AnalyticsService
from app.application.services.auth_service import AuthService
from app.application.services.prediction_service import PredictionService
from app.application.services.user_service import UserService
from app.core.container import Container
from app.core.exceptions import AuthenticationError, AuthorizationError
from app.domain.entities.user import User
from app.domain.value_objects.role import Role

# ``auto_error=False`` lets us raise our own typed AuthenticationError.
_bearer_scheme = HTTPBearer(auto_error=False, description="JWT access token")


def get_container(request: Request) -> Container:
    """Return the application :class:`Container` stored on ``app.state``."""
    return request.app.state.container


def get_auth_service(
    container: Annotated[Container, Depends(get_container)],
) -> AuthService:
    """Provide a wired :class:`AuthService`."""
    return container.auth_service


def get_user_service(
    container: Annotated[Container, Depends(get_container)],
) -> UserService:
    """Provide a wired :class:`UserService`."""
    return container.user_service


def get_prediction_service(
    container: Annotated[Container, Depends(get_container)],
) -> PredictionService:
    """Provide a wired :class:`PredictionService`."""
    return container.prediction_service


def get_analytics_service(
    container: Annotated[Container, Depends(get_container)],
) -> AnalyticsService:
    """Provide a wired :class:`AnalyticsService`."""
    return container.analytics_service


async def get_current_user(
    credentials: Annotated[HTTPAuthorizationCredentials | None, Depends(_bearer_scheme)],
    auth_service: Annotated[AuthService, Depends(get_auth_service)],
) -> User:
    """Resolve the authenticated :class:`User` from the bearer access token.

    Raises:
        AuthenticationError: If the header is missing or the token is invalid.
    """
    if credentials is None or not credentials.credentials:
        raise AuthenticationError("Missing bearer token.")
    return await auth_service.get_user_from_access_token(credentials.credentials)


CurrentUser = Annotated[User, Depends(get_current_user)]


def require_role(
    required: Role,
) -> Callable[[User], Coroutine[Any, Any, User]]:
    """Build a dependency that authorises the current user for ``required`` or higher.

    Args:
        required: The minimum role needed to access the route.

    Returns:
        An async dependency that returns the user or raises AuthorizationError.
    """

    async def _guard(user: CurrentUser) -> User:
        if not user.role.satisfies(required):
            raise AuthorizationError(
                f"This action requires the '{required.value}' role or higher."
            )
        return user

    return _guard
