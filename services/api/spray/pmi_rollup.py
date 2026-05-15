"""Daily PMI rollup: fused hourly weather → ``BlockPowderyMildewIndex`` rows."""

from __future__ import annotations

import logging
from datetime import date, datetime, time, timedelta, timezone

from django.db import transaction

from spray.aggregation.pmi.gubler_thomas_conidial import (
    compute_conidial_daily_rollups,
    default_budbreak_date,
)
from spray.aggregation.runners.base import HourlyObservation
from spray.aggregation.weather import build_block_weather_window
from spray.models import Block, BlockPowderyMildewIndex

logger = logging.getLogger(__name__)


def resolve_budbreak_date(block: Block, calendar_year: int) -> date:
    """``block.settings['budbreak_date']`` (ISO ``YYYY-MM-DD``) or April 1."""
    raw = (block.settings or {}).get("budbreak_date")
    if isinstance(raw, str):
        try:
            return date.fromisoformat(raw.strip())
        except ValueError:
            logger.warning(
                "resolve_budbreak_date: invalid budbreak_date on block %s: %r",
                block.id,
                raw,
            )
    return default_budbreak_date(calendar_year)


def _normalize_utc_hour(ts: datetime) -> datetime:
    if ts.tzinfo is None:
        ts = ts.replace(tzinfo=timezone.utc)
    ts = ts.astimezone(timezone.utc)
    return ts.replace(minute=0, second=0, microsecond=0)


def stitch_block_hourly_observations(
    block: Block,
    *,
    valid_from: datetime,
    valid_to_exclusive: datetime,
) -> list[HourlyObservation]:
    """Fetch fused hourly observations in <24h chunks; dedupe by UTC hour."""
    by_ts: dict[datetime, HourlyObservation] = {}
    cursor = valid_from
    if cursor.tzinfo is None:
        cursor = cursor.replace(tzinfo=timezone.utc)
    end = valid_to_exclusive
    if end.tzinfo is None:
        end = end.replace(tzinfo=timezone.utc)

    while cursor < end:
        chunk_end = min(
            end - timedelta(microseconds=1),
            cursor + timedelta(hours=23, minutes=59, seconds=59),
        )
        window = build_block_weather_window(
            block=block,
            valid_from=cursor,
            valid_to=chunk_end,
        )
        for o in window.observations:
            nh = _normalize_utc_hour(o.ts)
            prev = by_ts.get(nh)
            if prev is None or o.fusion_confidence >= prev.fusion_confidence:
                by_ts[nh] = HourlyObservation(
                    ts=nh,
                    temp_c=o.temp_c,
                    rh_pct=o.rh_pct,
                    leaf_wetness_min=o.leaf_wetness_min,
                    wind_speed_ms=o.wind_speed_ms,
                    precip_mm=o.precip_mm,
                    source_summary=o.source_summary,
                    fusion_confidence=o.fusion_confidence,
                )
        cursor = chunk_end + timedelta(seconds=1)

    return [by_ts[k] for k in sorted(by_ts.keys())]


def execute_rollup_block_pmi(
    block_id: str,
    through_date: date | None = None,
) -> int:
    """Recompute and upsert PMI rows from budbreak through ``through_date``."""
    through = through_date or datetime.now(tz=timezone.utc).date()
    try:
        block = Block.objects.unscoped().select_related("vineyard").get(id=block_id)
    except Block.DoesNotExist:
        logger.warning("execute_rollup_block_pmi: missing block %s", block_id)
        return 0
    if block.archived_at is not None:
        return 0

    budbreak = resolve_budbreak_date(block, through.year)
    if through < budbreak:
        return 0

    start_dt = datetime.combine(budbreak, time.min, tzinfo=timezone.utc)
    valid_to_exclusive = datetime.combine(
        through + timedelta(days=1), time.min, tzinfo=timezone.utc
    )
    hourly = stitch_block_hourly_observations(
        block,
        valid_from=start_dt,
        valid_to_exclusive=valid_to_exclusive,
    )
    rollups = compute_conidial_daily_rollups(
        hourly,
        budbreak=budbreak,
        through_date=through,
    )

    n = 0
    with transaction.atomic():
        for r in rollups:
            BlockPowderyMildewIndex.objects.update_or_create(
                block=block,
                date=r.date,
                defaults={
                    "pmi": r.pmi,
                    "risk_tier": r.risk_tier,
                    "phase": r.phase,
                    "details": r.details,
                },
            )
            n += 1
    logger.info(
        "execute_rollup_block_pmi: block=%s through=%s rows=%d",
        block_id,
        through,
        n,
    )
    return n


def rollup_all_blocks_pmi(through_date: date | None = None) -> int:
    """Roll up PMI for every non-archived block; returns total row count."""
    through = through_date or datetime.now(tz=timezone.utc).date()
    total = 0
    qs = Block.objects.unscoped().filter(archived_at__isnull=True).values_list(
        "id", flat=True
    )
    for bid in qs.distinct():
        total += execute_rollup_block_pmi(str(bid), through)
    return total
