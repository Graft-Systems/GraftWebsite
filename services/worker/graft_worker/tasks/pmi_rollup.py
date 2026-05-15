"""Celery tasks — daily Gubler–Thomas conidial PMI rollup."""

from __future__ import annotations

import logging
import os
from datetime import date, datetime, timezone

from celery import shared_task

logger = logging.getLogger(__name__)

IN_SEASON_MONTHS = set(range(4, 11))


@shared_task(name="graft_worker.tasks.pmi_rollup.rollup_block_pmi")
def rollup_block_pmi(block_id: str, through_date_iso: str | None = None) -> int:
    from spray.pmi_rollup import execute_rollup_block_pmi

    td = date.fromisoformat(through_date_iso) if through_date_iso else None
    return execute_rollup_block_pmi(block_id, td)


@shared_task(name="graft_worker.tasks.pmi_rollup.rollup_all_blocks_pmi")
def rollup_all_blocks_pmi_task() -> int:
    """Beat entry: roll PMI for all blocks in-season (April–October UTC)."""
    from spray.pmi_rollup import rollup_all_blocks_pmi

    now_utc = datetime.now(tz=timezone.utc)
    if now_utc.month not in IN_SEASON_MONTHS:
        if os.environ.get("GRAFT_SPRAY_PMI_ROLLUP_FORCE", "").lower() not in (
            "1",
            "true",
            "yes",
        ):
            logger.info(
                "rollup_all_blocks_pmi_task: out-of-season (%s); skipping",
                now_utc.month,
            )
            return 0
    return rollup_all_blocks_pmi()
