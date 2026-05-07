"""Pessl FieldClimate payload → canonical sensor schema (M1.5 PR-D step 5).

Spec §12A.3 schema fields: air_temp_c, rh_pct, leaf_wetness_min, precip_mm,
wind_speed_ms, ts (UTC ISO 8601), source, device_id, quality_flag.

Pessl's `/v2/data/{station}/raw/from/{from}/to/{to}` returns:

    {
      "name": {"original_name": "..."},
      "dates": ["2026-05-07 03:00:00", ...],   # UTC, naive timestamps
      "data": {
        "0": {
          "ch": "air_temp",
          "name": "Air temperature",
          "unit": "C",
          "values": {"avg": [18.2, 18.4, ...], ...}
        },
        "1": { "ch": "humidity", ... },
        "2": { "ch": "leaf_wetness", "unit": "min", "values": {"sum": [...]}, ...},
        ...
      }
    }

Channel mapping varies by sensor model; we identify by `ch` string. Leaf
wetness already in MINUTES (model-ready, no conversion). Wind in m/s in
v2.

The normalizer is forgiving: missing channels → field stays None, schema
drift on a single field doesn't drop the whole row.
"""

from __future__ import annotations

import logging
from datetime import datetime, timezone as dt_tz
from decimal import Decimal
from typing import Any


logger = logging.getLogger(__name__)


# Pessl `ch` value → canonical-schema field
# Multiple `ch` aliases observed across station models; lowercase contains-match.
CHANNEL_MAP: dict[str, str] = {
    "air_temp": "air_temp_c",
    "temp": "air_temp_c",
    "temperature": "air_temp_c",
    "humidity": "rh_pct",
    "rh": "rh_pct",
    "leaf_wetness": "leaf_wetness_min",
    "leafwetness": "leaf_wetness_min",
    "lw": "leaf_wetness_min",
    "precip": "precip_mm",
    "precipitation": "precip_mm",
    "rain": "precip_mm",
    "wind_speed": "wind_speed_ms",
    "windspeed": "wind_speed_ms",
    "wind": "wind_speed_ms",
}


def _to_decimal(value: Any) -> Decimal | None:
    if value is None:
        return None
    try:
        return Decimal(str(round(float(value), 2)))
    except (TypeError, ValueError):
        return None


def _resolve_field(ch_raw: str) -> str | None:
    if not ch_raw:
        return None
    ch_low = ch_raw.lower().replace("-", "_").replace(" ", "_")
    if ch_low in CHANNEL_MAP:
        return CHANNEL_MAP[ch_low]
    for needle, field in CHANNEL_MAP.items():
        if needle in ch_low:
            return field
    return None


def _parse_ts(raw: str) -> datetime | None:
    """Pessl returns naive UTC strings like '2026-05-07 03:00:00'."""
    if not raw:
        return None
    raw = raw.replace("T", " ").rstrip("Z")
    try:
        ts = datetime.strptime(raw, "%Y-%m-%d %H:%M:%S")
    except ValueError:
        try:
            ts = datetime.strptime(raw, "%Y-%m-%d %H:%M")
        except ValueError:
            return None
    return ts.replace(tzinfo=dt_tz.utc)


def _pick_aggregator(ch_field: str, values: dict[str, Any]) -> list[Any] | None:
    """Pick the right aggregator for the channel.

    - leaf_wetness_min, precip_mm: sum (cumulative count over the hour)
    - everything else: avg
    """
    if not isinstance(values, dict):
        return None
    if ch_field in ("leaf_wetness_min", "precip_mm"):
        if "sum" in values and isinstance(values["sum"], list):
            return values["sum"]
    if "avg" in values and isinstance(values["avg"], list):
        return values["avg"]
    # Final fallback: any list-valued aggregator.
    for v in values.values():
        if isinstance(v, list):
            return v
    return None


def normalize_data_response(
    payload: dict[str, Any],
) -> list[dict[str, Any]]:
    """Pessl `/v2/data/.../raw/...` payload → list of canonical-schema dicts.

    Returns one dict per timestamp. Each dict is keyed by canonical-schema
    field names; missing channels remain absent (caller fills None at the
    SensorReading layer). Caller adds `station_id` + `quality_flag`.
    """
    dates_raw = payload.get("dates") or []
    data_block = payload.get("data") or {}

    if not isinstance(dates_raw, list) or not isinstance(data_block, dict):
        logger.warning("Pessl normalizer: missing dates/data block; got keys=%s", list(payload))
        return []

    timestamps = [_parse_ts(d) for d in dates_raw]

    # Per-channel value series, keyed by canonical field.
    series: dict[str, list[Any]] = {}
    for _ch_idx, ch in data_block.items():
        if not isinstance(ch, dict):
            continue
        ch_raw = str(ch.get("ch") or ch.get("name") or "")
        field = _resolve_field(ch_raw)
        if field is None:
            continue
        values = ch.get("values")
        agg = _pick_aggregator(field, values or {})
        if agg is None:
            continue
        # Last-channel-wins if a station reports a field on multiple sensors.
        # Pessl conventionally orders the canonical sensor first; we stick
        # with that assumption + log on collision.
        if field in series:
            logger.info(
                "Pessl normalizer: duplicate channel for %s (last-wins); ch_raw=%s",
                field,
                ch_raw,
            )
        series[field] = agg

    rows: list[dict[str, Any]] = []
    for i, ts in enumerate(timestamps):
        if ts is None:
            continue
        row: dict[str, Any] = {"ts": ts}
        for field, agg in series.items():
            if i < len(agg):
                val = _to_decimal(agg[i])
                if val is not None:
                    row[field] = val
        # Skip empty rows (timestamp present but every channel was null).
        if len(row) == 1:
            continue
        rows.append(row)
    return rows
