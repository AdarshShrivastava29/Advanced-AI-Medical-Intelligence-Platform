"""Observability + request-limit middleware.

``MetricsMiddleware`` records per-route request counts and latency for Prometheus
(low-cardinality route templates, not raw paths). ``MaxBodySizeMiddleware`` rejects
oversized request bodies early with a 413 (see ``docs/25_Monitoring.md``,
``docs/23_Security.md``).
"""

from __future__ import annotations

import time
from collections.abc import Awaitable, Callable

from starlette.middleware.base import BaseHTTPMiddleware
from starlette.requests import Request
from starlette.responses import JSONResponse, Response

from app.core.metrics import record_http


class MetricsMiddleware(BaseHTTPMiddleware):
    """Record HTTP request count + latency per matched route template."""

    async def dispatch(
        self, request: Request, call_next: Callable[[Request], Awaitable[Response]]
    ) -> Response:
        """Time the request and record metrics under the route template path."""
        start = time.perf_counter()
        response = await call_next(request)
        duration = time.perf_counter() - start
        route = request.scope.get("route")
        path = getattr(route, "path", request.url.path)
        record_http(request.method, path, response.status_code, duration)
        return response


class MaxBodySizeMiddleware(BaseHTTPMiddleware):
    """Reject requests whose declared body exceeds ``max_bytes`` with a 413."""

    def __init__(self, app: object, *, max_bytes: int) -> None:
        super().__init__(app)  # type: ignore[arg-type]
        self._max_bytes = max_bytes

    async def dispatch(
        self, request: Request, call_next: Callable[[Request], Awaitable[Response]]
    ) -> Response:
        """Short-circuit oversized requests based on Content-Length."""
        content_length = request.headers.get("content-length")
        if (
            content_length is not None
            and content_length.isdigit()
            and int(content_length) > self._max_bytes
        ):
            return JSONResponse(
                status_code=413,
                media_type="application/problem+json",
                content={
                    "type": "about:blank#request_too_large",
                    "title": "Request Entity Too Large",
                    "status": 413,
                    "detail": f"Request body exceeds the {self._max_bytes}-byte limit.",
                    "instance": request.url.path,
                },
            )
        return await call_next(request)
