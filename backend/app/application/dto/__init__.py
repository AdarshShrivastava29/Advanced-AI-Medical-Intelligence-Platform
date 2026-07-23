"""Internal data-transfer objects passed between services and the interface layer."""

from app.application.dto.auth_dto import AuthenticatedUser, TokenPair

__all__ = ["AuthenticatedUser", "TokenPair"]
