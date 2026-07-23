"""Task queue adapters and factory."""

from app.infrastructure.providers.task_queue.factory import get_task_queue

__all__ = ["get_task_queue"]
