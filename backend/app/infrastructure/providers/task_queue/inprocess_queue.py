"""In-process task queue adapter (``TASK_QUEUE=inprocess``).

Runs jobs on the local asyncio event loop via a background task. Suitable for
development and single-instance deployments; production uses the Celery adapter.
A registry maps job names to coroutine handlers (populated in later phases).
"""

from __future__ import annotations

import asyncio
import uuid
from collections.abc import Awaitable, Callable
from typing import Any

from app.core.logging import get_logger
from app.domain.ports.task_queue import TaskQueue

logger = get_logger(__name__)

JobHandler = Callable[[dict[str, Any]], Awaitable[None]]


class InProcessTaskQueue(TaskQueue):
    """Executes registered jobs as fire-and-forget asyncio tasks."""

    name = "inprocess"

    def __init__(self) -> None:
        self._handlers: dict[str, JobHandler] = {}
        self._tasks: set[asyncio.Task[None]] = set()

    def register(self, job_name: str, handler: JobHandler) -> None:
        """Register a coroutine ``handler`` for ``job_name``."""
        self._handlers[job_name] = handler

    async def enqueue(self, job_name: str, payload: dict[str, Any]) -> str:
        """Schedule ``job_name`` to run on the event loop; return a job id."""
        handler = self._handlers.get(job_name)
        if handler is None:
            logger.warning("taskqueue.no_handler", job=job_name)
            raise KeyError(f"No handler registered for job {job_name!r}")
        job_id = uuid.uuid4().hex
        task = asyncio.create_task(self._run(job_id, job_name, handler, payload))
        self._tasks.add(task)
        task.add_done_callback(self._tasks.discard)
        return job_id

    async def _run(
        self, job_id: str, job_name: str, handler: JobHandler, payload: dict[str, Any]
    ) -> None:
        """Execute a job, logging success/failure (jobs never crash the app)."""
        logger.info("taskqueue.job.start", job=job_name, job_id=job_id)
        try:
            await handler(payload)
            logger.info("taskqueue.job.ok", job=job_name, job_id=job_id)
        except Exception:
            logger.exception("taskqueue.job.failed", job=job_name, job_id=job_id)
