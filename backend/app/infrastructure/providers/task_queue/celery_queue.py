"""Celery task queue adapter (``TASK_QUEUE=celery``).

The ``celery`` package is imported lazily. This adapter only *submits* jobs by
name to the broker; the worker process (``app.workers``) defines the tasks
(see ``docs/26_Background_Jobs.md``).
"""

from __future__ import annotations

from typing import Any

from app.core.exceptions import ConfigurationError
from app.domain.ports.task_queue import TaskQueue


class CeleryTaskQueue(TaskQueue):
    """Submits named jobs to a Celery broker (Redis)."""

    name = "celery"

    def __init__(self, broker_url: str) -> None:
        self._broker_url = broker_url
        self._app: object | None = None

    def _get_app(self) -> object:
        """Lazily construct the Celery application, importing the package on demand."""
        if self._app is None:
            try:
                from celery import Celery
            except ImportError as exc:  # pragma: no cover - exercised when celery enabled
                raise ConfigurationError(
                    "The 'celery' package is not installed. Install it to use "
                    "TASK_QUEUE=celery."
                ) from exc
            self._app = Celery("aimip", broker=self._broker_url, backend=self._broker_url)
        return self._app

    async def enqueue(self, job_name: str, payload: dict[str, Any]) -> str:
        """Send ``job_name`` to the broker with ``payload``; return the task id."""
        app = self._get_app()
        result = app.send_task(job_name, kwargs=payload)  # type: ignore[attr-defined]
        return str(result.id)

    async def health(self) -> bool:
        """Best-effort broker connectivity check."""
        try:
            app = self._get_app()
            conn = app.connection()  # type: ignore[attr-defined]
            conn.ensure_connection(max_retries=1, timeout=2)
            return True
        except Exception:
            return False
