"""Rate limiting via slowapi (per-client, configurable through ENV).

A global default limit (``RATE_LIMIT_PER_MINUTE``) is applied to every route and
keyed by client address. Exceeding it returns an RFC 7807 ``429`` response
(see ``docs/23_Security.md``).
"""

from __future__ import annotations

from slowapi import Limiter
from slowapi.errors import RateLimitExceeded
from slowapi.util import get_remote_address
from starlette.requests import Request
from starlette.responses import JSONResponse

from app.core.config import Settings
from app.core.logging import get_logger, request_id_ctx

logger = get_logger("http.ratelimit")


def build_limiter(settings: Settings) -> Limiter:
    """Construct a :class:`Limiter` from settings."""
    return Limiter(
        key_func=get_remote_address,
        default_limits=[f"{settings.rate_limit_per_minute}/minute"],
        enabled=settings.rate_limit_enabled,
        headers_enabled=True,
    )


def rate_limit_handler(request: Request, exc: Exception) -> JSONResponse:
    """Render a rate-limit rejection as problem+json (429)."""
    detail = str(exc) if isinstance(exc, RateLimitExceeded) else "Rate limit exceeded."
    logger.warning("http.rate_limited", path=request.url.path)
    return JSONResponse(
        status_code=429,
        media_type="application/problem+json",
        content={
            "type": "about:blank#rate_limited",
            "title": "Too Many Requests",
            "status": 429,
            "detail": detail,
            "instance": request.url.path,
            "request_id": request_id_ctx.get(),
        },
    )
