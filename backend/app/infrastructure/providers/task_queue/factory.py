"""Factory selecting the task-queue adapter from ``TASK_QUEUE``."""

from __future__ import annotations

from app.core.config import Settings
from app.core.exceptions import ConfigurationError
from app.domain.ports.task_queue import TaskQueue
from app.infrastructure.providers.task_queue.celery_queue import CeleryTaskQueue
from app.infrastructure.providers.task_queue.inprocess_queue import InProcessTaskQueue


def get_task_queue(settings: Settings) -> TaskQueue:
    """Return the :class:`TaskQueue` selected by ``settings.task_queue``.

    Raises:
        ConfigurationError: If the selector value is unsupported.
    """
    provider = settings.task_queue
    if provider == "inprocess":
        return InProcessTaskQueue()
    if provider == "celery":
        return CeleryTaskQueue(broker_url=settings.redis_url)
    raise ConfigurationError(f"Unsupported TASK_QUEUE: {provider!r}")
