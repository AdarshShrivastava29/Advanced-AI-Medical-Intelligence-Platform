"""Domain / application exception hierarchy.

All application errors derive from :class:`AppError`, which carries enough
metadata (HTTP status, a stable ``code``, a machine ``type`` slug and optional
field errors) to be rendered as an RFC 7807 ``application/problem+json`` response
by the interface layer. Business/domain code raises these exceptions and never
constructs HTTP responses directly, preserving the dependency direction of the
hexagonal architecture (see ``docs/22_...`` / ``docs/18_API_Design.md``).
"""

from __future__ import annotations

from typing import Any


class AppError(Exception):
    """Base class for all expected application errors.

    Args:
        detail: Human-readable explanation safe to expose to clients.
        status_code: HTTP status to map to at the interface boundary.
        code: Stable, machine-readable error code (e.g. ``"invalid_credentials"``).
        errors: Optional per-field validation details.
    """

    status_code: int = 500
    code: str = "internal_error"
    title: str = "Internal Server Error"

    def __init__(
        self,
        detail: str | None = None,
        *,
        status_code: int | None = None,
        code: str | None = None,
        errors: list[dict[str, Any]] | None = None,
    ) -> None:
        self.detail = detail or self.title
        if status_code is not None:
            self.status_code = status_code
        if code is not None:
            self.code = code
        self.errors = errors or []
        super().__init__(self.detail)


class ConfigurationError(AppError):
    """Raised when the runtime configuration is invalid or inconsistent."""

    status_code = 500
    code = "configuration_error"
    title = "Configuration Error"


class NotFoundError(AppError):
    """Raised when a requested resource does not exist."""

    status_code = 404
    code = "not_found"
    title = "Resource Not Found"


class ConflictError(AppError):
    """Raised when an operation conflicts with existing state (e.g. duplicate email)."""

    status_code = 409
    code = "conflict"
    title = "Conflict"


class ValidationError(AppError):
    """Raised for semantic validation failures beyond schema validation."""

    status_code = 422
    code = "validation_error"
    title = "Validation Error"


class AuthenticationError(AppError):
    """Raised when authentication fails (bad credentials, invalid/expired token)."""

    status_code = 401
    code = "authentication_error"
    title = "Authentication Failed"


class AuthorizationError(AppError):
    """Raised when an authenticated principal lacks permission for an action."""

    status_code = 403
    code = "authorization_error"
    title = "Forbidden"


class AccountLockedError(AuthenticationError):
    """Raised when an account is temporarily locked after too many failed logins."""

    status_code = 423
    code = "account_locked"
    title = "Account Locked"


class RateLimitError(AppError):
    """Raised when a client exceeds the configured request rate."""

    status_code = 429
    code = "rate_limited"
    title = "Too Many Requests"


class DependencyUnavailableError(AppError):
    """Raised when a required downstream dependency (e.g. database) is unavailable."""

    status_code = 503
    code = "dependency_unavailable"
    title = "Service Unavailable"
