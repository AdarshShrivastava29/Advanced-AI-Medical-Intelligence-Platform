"""Global exception handlers rendering RFC 7807 problem+json responses.

Translates domain :class:`AppError` instances (and unexpected exceptions and
request-validation errors) into a consistent ``application/problem+json`` body.
Business/domain code raises typed exceptions; only this module knows about HTTP
(see ``docs/22_...`` / ``docs/18_API_Design.md``).
"""

from __future__ import annotations

from fastapi import FastAPI, Request
from fastapi.exceptions import RequestValidationError
from starlette.exceptions import HTTPException as StarletteHTTPException
from starlette.responses import JSONResponse

from app.core.exceptions import AppError
from app.core.logging import get_logger, request_id_ctx

logger = get_logger("http.error")

_PROBLEM_CONTENT_TYPE = "application/problem+json"


def _problem_response(
    *,
    status: int,
    title: str,
    detail: str,
    code: str,
    instance: str,
    errors: list[dict] | None = None,
) -> JSONResponse:
    """Build a problem+json JSON response with the current correlation id."""
    body = {
        "type": f"about:blank#{code}",
        "title": title,
        "status": status,
        "detail": detail,
        "instance": instance,
        "errors": errors or [],
        "request_id": request_id_ctx.get(),
    }
    return JSONResponse(status_code=status, content=body, media_type=_PROBLEM_CONTENT_TYPE)


def register_exception_handlers(app: FastAPI) -> None:
    """Register the application's exception handlers on ``app``."""

    @app.exception_handler(AppError)
    async def _handle_app_error(request: Request, exc: AppError) -> JSONResponse:
        """Render a typed domain/application error."""
        if exc.status_code >= 500:
            logger.error("app_error", code=exc.code, detail=exc.detail)
        return _problem_response(
            status=exc.status_code,
            title=exc.title,
            detail=exc.detail,
            code=exc.code,
            instance=request.url.path,
            errors=exc.errors,
        )

    @app.exception_handler(RequestValidationError)
    async def _handle_validation_error(
        request: Request, exc: RequestValidationError
    ) -> JSONResponse:
        """Render a 422 for schema validation failures."""
        errors = [
            {"loc": list(err.get("loc", [])), "msg": err.get("msg"), "type": err.get("type")}
            for err in exc.errors()
        ]
        return _problem_response(
            status=422,
            title="Validation Error",
            detail="One or more fields failed validation.",
            code="validation_error",
            instance=request.url.path,
            errors=errors,
        )

    @app.exception_handler(StarletteHTTPException)
    async def _handle_http_exception(
        request: Request, exc: StarletteHTTPException
    ) -> JSONResponse:
        """Render framework HTTP exceptions (e.g. 404 routing) as problem+json."""
        return _problem_response(
            status=exc.status_code,
            title=str(exc.detail) if exc.detail else "HTTP Error",
            detail=str(exc.detail) if exc.detail else "An HTTP error occurred.",
            code="http_error",
            instance=request.url.path,
        )

    @app.exception_handler(Exception)
    async def _handle_unexpected(request: Request, exc: Exception) -> JSONResponse:
        """Catch-all: log the stack trace and return a safe 500 (no internals leaked)."""
        logger.exception("unhandled_exception", path=request.url.path)
        return _problem_response(
            status=500,
            title="Internal Server Error",
            detail="An unexpected error occurred. Please try again later.",
            code="internal_error",
            instance=request.url.path,
        )
