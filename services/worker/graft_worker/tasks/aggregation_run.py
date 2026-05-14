"""Aggregation engine Celery task — M1.5 PR-C, spec §11A.

Beat fires `compute_all_active_blocks` hourly during in-season months
(April–October UTC). The task fans out one `compute_block_verdict`
per active Block; each runner emits a `RiskRecord` against the last
24h weather window, the ensemble fuses them into a `BlockVerdict`,
and both layers emit lake events.

Core logic lives in ``spray.aggregation.block_verdict_job`` so the Django
API can run the same path without importing ``graft_worker``.
"""

from __future__ import annotations

import logging
import os
from datetime import datetime, timezone

from celery import shared_task

from spray.aggregation.block_verdict_job import execute_compute_block_verdict

logger = logging.getLogger(__name__)

AGGREGATION_CADENCE_SEC = int(os.environ.get("GRAFT_SPRAY_AGGREGATION_CADENCE_SEC", "3600"))

IN_SEASON_MONTHS = set(range(4, 11))


@shared_task(name="graft_worker.tasks.aggregation_run.compute_all_active_blocks")
def compute_all_active_blocks() -> int:
    """Fan out per-block verdict tasks for every live block in-season."""
    from spray.models import Block

    now_utc = datetime.now(tz=timezone.utc)
    if now_utc.month not in IN_SEASON_MONTHS:
        logger.info(
            "compute_all_active_blocks: out-of-season (%s); skipping",
            now_utc.month,
        )
        return 0

    qs = Block.objects.unscoped().filter(archived_at__isnull=True)
    count = 0
    for block_id in qs.values_list("id", flat=True).distinct():
        compute_block_verdict.delay(str(block_id))
        count += 1
    logger.info("compute_all_active_blocks: fanned out %d tasks", count)
    return count


@shared_task(
    bind=True,
    name="graft_worker.tasks.aggregation_run.compute_block_verdict",
    max_retries=3,
    default_retry_delay=60,
    retry_backoff=True,
)
def compute_block_verdict(self, block_id: str, target_date_iso: str | None = None) -> bool:
    """Run all registered model runners for one block, fuse, persist, emit."""
    return execute_compute_block_verdict(block_id, target_date_iso)
