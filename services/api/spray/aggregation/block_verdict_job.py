"""Block verdict computation (shared by API sync path and Celery worker).

Keeps aggregation logic importable from ``spray`` so the Django API does not
need the ``graft_worker`` package on ``PYTHONPATH``.
"""

from __future__ import annotations

import logging
from datetime import date, datetime, timedelta, timezone

from django.db import transaction

from spray.aggregation.ensemble import equal_weight_soft_vote
from spray.aggregation.runners.registry import get_runner, known_slugs
from spray.aggregation.weather import build_block_weather_window
from spray.lake import emit_event
from spray.models import Block, BlockVerdict, RiskRecord

logger = logging.getLogger(__name__)


def _build_weather_window(block_id, target_date):
    from datetime import datetime as dt

    block = Block.objects.unscoped().select_related("vineyard").get(id=block_id)
    valid_to = dt.combine(target_date, dt.max.time(), tzinfo=timezone.utc)
    valid_from = valid_to - timedelta(hours=24)
    return build_block_weather_window(
        block=block,
        valid_from=valid_from,
        valid_to=valid_to,
    )


def execute_compute_block_verdict(
    block_id: str, target_date_iso: str | None = None
) -> bool:
    """Run all registered model runners for one block, fuse, persist, emit."""
    target_date = (
        date.fromisoformat(target_date_iso)
        if target_date_iso
        else datetime.now(tz=timezone.utc).date()
    )

    try:
        block = Block.objects.unscoped().select_related("vineyard").get(id=block_id)
    except Block.DoesNotExist:
        logger.warning("execute_compute_block_verdict: block %s vanished", block_id)
        return False
    if block.archived_at is not None:
        return False

    window = _build_weather_window(block_id, target_date)
    usable_temp_hours = sum(1 for o in window.observations if o.temp_c is not None)
    if usable_temp_hours < 4:
        logger.info(
            "execute_compute_block_verdict: skip block=%s usable_temp_hours=%s (need >=4)",
            block_id,
            usable_temp_hours,
        )
        return False

    risk_results = []
    for slug in known_slugs():
        runner = get_runner(slug)
        try:
            risk_results.append(runner.compute(window))
        except Exception:  # noqa: BLE001
            logger.exception("runner %s failed for block %s", slug, block_id)

    if not risk_results:
        logger.info("execute_compute_block_verdict: no runner output for %s", block_id)
        return False

    rr_rows = [
        RiskRecord(
            block=block,
            model_id=r.model_id,
            model_version=r.model_version,
            valid_from=r.valid_from,
            valid_to=r.valid_to,
            pathogen=r.pathogen,
            severity_1_10=r.severity_1_10,
            raw_score=r.raw_score,
            thresholds_fired=[
                {"name": t.name, "citation_id": t.citation_id}
                for t in r.thresholds_fired
            ],
            input_snapshot_id=r.input_snapshot_id,
            confidence=r.confidence,
            citation_id=r.citation_id,
        )
        for r in risk_results
    ]

    with transaction.atomic():
        RiskRecord.objects.unscoped().bulk_create(
            rr_rows,
            update_conflicts=True,
            update_fields=[
                "model_version",
                "valid_to",
                "pathogen",
                "severity_1_10",
                "raw_score",
                "thresholds_fired",
                "input_snapshot_id",
                "confidence",
                "citation_id",
            ],
            unique_fields=["block", "model_id", "valid_from"],
        )

    for r in risk_results:
        try:
            emit_event(
                category="risk_record.emitted",
                payload=r.to_event_payload(),
                org=block.vineyard.org,
            )
        except Exception:  # noqa: BLE001
            logger.exception("emit_event risk_record failed for %s", r.model_id)

    verdict_payload = equal_weight_soft_vote(
        block_id=str(block_id),
        target_date=target_date,
        risk_records=risk_results,
    )

    with transaction.atomic():
        BlockVerdict.objects.unscoped().update_or_create(
            block=block,
            date=target_date,
            defaults={
                "powdery_severity_1_10": verdict_payload["powdery_severity_1_10"],
                "downy_severity_1_10": verdict_payload["downy_severity_1_10"],
                "powdery_confidence": verdict_payload["powdery_confidence"],
                "downy_confidence": verdict_payload["downy_confidence"],
                "action": verdict_payload["action"],
                "urgency": verdict_payload["urgency"],
                "drivers": verdict_payload["drivers"],
                "split_summary": verdict_payload["split_summary"],
                "forecast_7d": verdict_payload["forecast_7d"],
                "advisory_events": verdict_payload["advisory_events"],
                "model_versions": verdict_payload["model_versions"],
                "generated_at": verdict_payload["generated_at"],
                "audit_hash": verdict_payload["audit_hash"],
            },
        )

    try:
        emit_event(
            category="block_verdict.generated",
            payload=verdict_payload,
            org=block.vineyard.org,
        )
    except Exception:  # noqa: BLE001
        logger.exception("emit_event block_verdict failed for %s", block_id)

    logger.info(
        "execute_compute_block_verdict: %s %s action=%s urgency=%s pow=%s down=%s",
        block_id,
        target_date,
        verdict_payload["action"],
        verdict_payload["urgency"],
        verdict_payload["powdery_severity_1_10"],
        verdict_payload["downy_severity_1_10"],
    )
    return True
