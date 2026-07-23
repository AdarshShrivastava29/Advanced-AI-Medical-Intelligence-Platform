"""Task queue port (``TaskQueue``).

Selected by ``TASK_QUEUE`` (inprocess | celery). Heavy work (PDF ingestion,
training, report regeneration) is enqueued rather than run in the request path
(see ``docs/26_Background_Jobs.md``).
"""

from __future__ import annotations

from abc import ABC, abstractmethod
from typing import Any


class TaskQueue(ABC):
    """Port for enqueuing named background jobs."""

    name: str = "abstract"

    @abstractmethod
    async def enqueue(self, job_name: str, payload: dict[str, Any]) -> str:
        """Enqueue ``job_name`` with ``payload``; return an opaque job id."""

    async def health(self) -> bool:
        """Lightweight readiness check. Adapters may override; default True."""
        return True
