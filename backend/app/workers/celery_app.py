"""Celery application and task definitions (production ``TASK_QUEUE=celery``).

Run with::

    celery -A app.workers.celery_app.celery_app worker --loglevel=info
    celery -A app.workers.celery_app.celery_app beat   --loglevel=info

The worker owns its own composition-root :class:`Container` (built once per
process) and executes the same ingestion handler used in-process, so business
logic is shared (see ``docs/26_Background_Jobs.md``).
"""

from __future__ import annotations

import asyncio

from celery import Celery
from celery.signals import worker_process_init

from app.core.config import get_settings
from app.core.container import Container
from app.core.logging import configure_logging, get_logger

logger = get_logger("worker")
_settings = get_settings()

celery_app = Celery(
    "aimip",
    broker=_settings.redis_url,
    backend=_settings.redis_url,
)
celery_app.conf.update(
    task_acks_late=True,
    task_reject_on_worker_lost=True,
    worker_max_tasks_per_child=100,
    task_default_queue="aimip",
    timezone="UTC",
    # Beat schedule (extend with periodic maintenance jobs as needed).
    beat_schedule={},
)

# Per-process container (initialised on worker boot).
_container: Container | None = None


@worker_process_init.connect
def _init_worker(**_: object) -> None:
    """Build and connect the container once per worker process."""
    global _container
    configure_logging(level=_settings.log_level, json_logs=_settings.log_json)
    _container = Container(_settings)
    asyncio.run(_container.startup())
    logger.info("worker.ready")


def _get_container() -> Container:
    global _container
    if _container is None:  # e.g. eager mode / direct invocation
        _container = Container(_settings)
        asyncio.run(_container.startup())
    return _container


@celery_app.task(name="ingest_document", bind=True, max_retries=3, default_retry_delay=10)
def ingest_document(self: object, document_id: str) -> None:
    """Ingest a document by id (mirrors the in-process ingest job).

    ``self`` is the bound Celery task instance (unused here).
    """
    from app.workers.ingest import make_ingest_handler

    container = _get_container()

    async def _run() -> None:
        handler = make_ingest_handler(container.document_repository, container.rag_engine)
        await handler({"document_id": document_id})

    asyncio.run(_run())
