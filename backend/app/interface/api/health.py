"""Health probes: liveness and readiness (mounted outside the versioned prefix).

- ``/health/live`` — process liveness; always 200 if the app is running.
- ``/health/ready`` — dependency readiness; 200 when all components are healthy,
  otherwise 503 with a per-component breakdown (see ``docs/25_Monitoring.md``).
"""

from __future__ import annotations

from typing import Annotated

from fastapi import APIRouter, Depends, Response, status

from app import __version__
from app.core.container import Container
from app.interface.dependencies import get_container
from app.interface.schemas.common import HealthResponse

router = APIRouter(prefix="/health", tags=["health"])


@router.get("/live", response_model=HealthResponse, summary="Liveness probe")
async def live() -> HealthResponse:
    """Return 200 whenever the process is up (no dependency checks)."""
    return HealthResponse(status="ok", version=__version__)


@router.get("/ready", response_model=HealthResponse, summary="Readiness probe")
async def ready(
    container: Annotated[Container, Depends(get_container)],
    response: Response,
) -> HealthResponse:
    """Return readiness, checking the database, cache and task queue."""
    checks = await container.check_readiness()
    healthy = all(checks.values())
    if not healthy:
        response.status_code = status.HTTP_503_SERVICE_UNAVAILABLE
    return HealthResponse(
        status="ok" if healthy else "degraded",
        version=__version__,
        checks=checks,
    )
