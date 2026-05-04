"""data_lake_etl Celery task (M0-04 step 8).

Wraps `lake_writer.forward_pending_events` as a Celery task with
sensible retry behavior. Beat triggers it every 15 min; manual triage
can run `python services/worker/manage.py forward_now`.
"""

from __future__ import annotations

import logging

from celery import shared_task

from graft_worker import lake_writer

logger = logging.getLogger(__name__)


@shared_task(
    bind=True,
    name="graft_worker.tasks.data_lake_etl.forward_pending_events",
    autoretry_for=(Exception,),
    retry_backoff=True,
    retry_backoff_max=600,
    retry_jitter=True,
    max_retries=3,
)
def forward_pending_events(self) -> int:
    """Forward unforwarded DataLakeEvent rows to S3 as Parquet."""
    n = lake_writer.forward_pending_events()
    logger.info("data_lake_etl: forwarded %d rows", n)
    return n
