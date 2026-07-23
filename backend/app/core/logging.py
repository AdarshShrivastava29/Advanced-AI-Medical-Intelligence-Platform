"""Structured logging configuration.

Uses :mod:`structlog` to emit either machine-readable JSON (production) or a
human-friendly console renderer (local development), controlled by
``LOG_JSON``. A context-local ``request_id`` is bound by the request-id
middleware and automatically appears on every log line for a request, enabling
end-to-end correlation across the API and background workers
(see ``docs/24_Logging.md``).
"""

from __future__ import annotations

import logging
import sys
from contextvars import ContextVar

import structlog
from structlog.types import EventDict, WrappedLogger

# Context variable carrying the correlation id for the current request/task.
request_id_ctx: ContextVar[str | None] = ContextVar("request_id", default=None)


def _add_request_id(_: WrappedLogger, __: str, event_dict: EventDict) -> EventDict:
    """structlog processor that injects the current ``request_id`` if present."""
    request_id = request_id_ctx.get()
    if request_id is not None:
        event_dict["request_id"] = request_id
    return event_dict


def configure_logging(*, level: str = "INFO", json_logs: bool = True) -> None:
    """Configure the root logger and structlog processor pipeline.

    Idempotent: safe to call once at application startup.

    Args:
        level: Minimum log level name (e.g. ``"INFO"``).
        json_logs: Emit JSON when True, otherwise a coloured console renderer.
    """
    log_level = getattr(logging, level.upper(), logging.INFO)

    timestamper = structlog.processors.TimeStamper(fmt="iso", utc=True)
    shared_processors: list[structlog.types.Processor] = [
        structlog.contextvars.merge_contextvars,
        structlog.processors.add_log_level,
        _add_request_id,
        timestamper,
        structlog.processors.StackInfoRenderer(),
        structlog.processors.format_exc_info,
    ]

    renderer: structlog.types.Processor = (
        structlog.processors.JSONRenderer()
        if json_logs
        else structlog.dev.ConsoleRenderer(colors=True)
    )

    structlog.configure(
        processors=[*shared_processors, renderer],
        wrapper_class=structlog.make_filtering_bound_logger(log_level),
        logger_factory=structlog.PrintLoggerFactory(file=sys.stdout),
        cache_logger_on_first_use=True,
    )

    # Route stdlib logging (uvicorn, motor, etc.) through the same level.
    logging.basicConfig(
        format="%(message)s",
        level=log_level,
        handlers=[logging.StreamHandler(sys.stdout)],
        force=True,
    )
    for noisy in ("uvicorn.access",):
        logging.getLogger(noisy).setLevel(max(log_level, logging.INFO))


def get_logger(name: str | None = None) -> structlog.stdlib.BoundLogger:
    """Return a bound structlog logger, optionally namespaced by ``name``."""
    return structlog.get_logger(name)
