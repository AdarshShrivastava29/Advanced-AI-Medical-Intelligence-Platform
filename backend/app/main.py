"""FastAPI application factory, lifespan and wiring.

Builds the ASGI app: configures logging, constructs the composition-root
:class:`Container`, installs middleware and exception handlers, mounts the
health and versioned API routers, and configures OpenAPI/Swagger. The lifespan
context opens and closes external connections (see ``docs/07_Backend_Architecture.md``).
"""

from __future__ import annotations

from collections.abc import AsyncIterator
from contextlib import asynccontextmanager
from pathlib import Path

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles

from app import __version__
from app.core.config import Settings, get_settings
from app.core.container import Container
from app.core.logging import configure_logging, get_logger
from app.interface.api.health import router as health_router
from app.interface.api.v1 import api_v1_router
from app.interface.middleware import (
    RequestContextMiddleware,
    SecurityHeadersMiddleware,
    register_exception_handlers,
)

logger = get_logger(__name__)

_API_DESCRIPTION = (
    "Advanced AI Medical Intelligence Platform (AIMIP) — clinical **decision-support** "
    "API (NOT a medical device). Phase 1 exposes the platform foundation: "
    "authentication, RBAC, health probes and the provider-abstraction layer.\n\n"
    "See the `docs/` suite for the full architecture."
)


@asynccontextmanager
async def lifespan(app: FastAPI) -> AsyncIterator[None]:
    """Manage startup/shutdown: connect and disconnect the container's resources."""
    container: Container = app.state.container
    logger.info("app.startup.begin", version=__version__, env=container.settings.env.value)
    await container.startup()
    logger.info("app.startup.complete")
    try:
        yield
    finally:
        logger.info("app.shutdown.begin")
        await container.shutdown()
        logger.info("app.shutdown.complete")


def create_app(settings: Settings | None = None) -> FastAPI:
    """Build and return the configured FastAPI application.

    Args:
        settings: Optional settings override (used by tests). Defaults to the
            cached, ENV-driven singleton.
    """
    settings = settings or get_settings()
    configure_logging(level=settings.log_level, json_logs=settings.log_json)

    app = FastAPI(
        title="AIMIP API",
        version=__version__,
        description=_API_DESCRIPTION,
        docs_url="/docs",
        redoc_url="/redoc",
        openapi_url="/openapi.json",
        lifespan=lifespan,
        contact={"name": "AIMIP Platform Team"},
        license_info={"name": "MIT"},
    )

    # Composition root — the only place adapters are wired to ports.
    app.state.container = Container(settings)

    # Middleware (executed in reverse registration order per request).
    app.add_middleware(SecurityHeadersMiddleware)
    app.add_middleware(RequestContextMiddleware)
    app.add_middleware(
        CORSMiddleware,
        allow_origins=settings.cors_origin_list,
        allow_credentials=True,
        allow_methods=["*"],
        allow_headers=["*"],
        expose_headers=["X-Request-ID"],
    )

    register_exception_handlers(app)

    # Routers: health outside the versioned prefix, everything else under it.
    app.include_router(health_router)
    app.include_router(api_v1_router, prefix=settings.api_v1_prefix)

    # Serve stored images (uploads + Grad-CAM) at /media/<category>/<file>.
    # Directories are ensured by the file-storage adapter at container build time.
    Path(settings.upload_path).mkdir(parents=True, exist_ok=True)
    Path(settings.gradcam_path).mkdir(parents=True, exist_ok=True)
    app.mount(
        "/media/uploads",
        StaticFiles(directory=settings.upload_path),
        name="uploads",
    )
    app.mount(
        "/media/gradcam",
        StaticFiles(directory=settings.gradcam_path),
        name="gradcam",
    )

    @app.get("/", tags=["meta"], summary="API metadata")
    async def root() -> dict[str, str]:
        """Return basic API metadata and links to the docs."""
        return {
            "name": "AIMIP API",
            "version": __version__,
            "environment": settings.env.value,
            "docs": "/docs",
            "health": "/health/ready",
        }

    return app


# ASGI entrypoint for ``uvicorn app.main:app``.
app = create_app()
