"""Davis WeatherLink v2 payload → canonical sensor schema (M1.5 PR-E).

Davis `/v2/historic/{station_id}` returns:

    {
      "station_id": 123,
      "sensors": [
        {
          "lsid": 1234,
          "sensor_type": 23,
          "data_structure_type": 4,
          "data": [
            {
              "ts": 1714824000,
              "temp_out": 65.1,             # °F
              "hum_out": 82,                # %
              "wind_speed_avg": 4.5,        # mph
              "rainfall_in": 0.0,           # inches
              "wet_leaf_high_1": 12,        # 0-15 scale per spec §12A.1
              ...
            }
          ]
        },
        ...
      ]
    }

Conversions:
- temp °F → °C: (f - 32) * 5/9
- wind mph → m/s: mph * 0.44704
- rainfall in → mm: in * 25.4
- LW 0-15 → minutes per hour: round(value * 4)  (15 = full 60 min wet)

LW conversion bug guard: spec §12A.1 calls out the industry pitfall
(some apps treat 0-15 as "0-15 min", which is wrong — it's a fraction-
of-hour-wet scale that maxes at 15). Values >15 trigger a warning log.
"""

from __future__ import annotations

import logging
from datetime import datetime, timezone as dt_tz
from decimal import Decimal
from typing import Any


logger = logging.getLogger(__name__)


# Davis field-key → canonical schema field. Davis's keys vary by sensor
# model + data_structure_type; we accept the common aliases and pick
# the first one that's populated.
TEMP_KEYS = ("temp_out", "temp_avg", "temp", "air_temp_avg")
RH_KEYS = ("hum_out", "hum_avg", "hum", "rh_avg")
WIND_MPH_KEYS = (
    "wind_speed_avg",
    "wind_speed",
    "wind_speed_avg_mph",
    "wind_speed_avg_last_10_min",
    "wind_speed_avg_last_2_min",
    "wind_speed_avg_last_1_min",
    "wind_speed_last",
)
RAIN_IN_KEYS = (
    "rainfall_in",
    "rainfall",
    "rain_in",
    "precip_in",
    "rainfall_daily_in",
    "rainfall_last_24_hr_in",
    "rainfall_last_60_min_in",
    "rainfall_last_15_min_in",
)
LW_RAW_KEYS = (
    "wet_leaf_high_1",
    "wet_leaf_avg",
    "leaf_wetness",
    "leaf_wetness_avg",
)


def _f_to_c(f: Any) -> Decimal | None:
    if f is None:
        return None
    try:
        return Decimal(str(round((float(f) - 32.0) * 5.0 / 9.0, 2)))
    except (TypeError, ValueError):
        return None


def _mph_to_ms(mph: Any) -> Decimal | None:
    if mph is None:
        return None
    try:
        return Decimal(str(round(float(mph) * 0.44704, 2)))
    except (TypeError, ValueError):
        return None


def _in_to_mm(inches: Any) -> Decimal | None:
    if inches is None:
        return None
    try:
        return Decimal(str(round(float(inches) * 25.4, 2)))
    except (TypeError, ValueError):
        return None


def _rh(value: Any) -> Decimal | None:
    if value is None:
        return None
    try:
        v = float(value)
    except (TypeError, ValueError):
        return None
    return Decimal(str(round(v, 2)))


def davis_lw_to_minutes(value: Any) -> Decimal | None:
    """Convert Davis's 0-15 leaf-wetness scale to minutes per hour.

    Spec §12A.1: Davis reports LW on a 0-15 scale (proportion-of-hour-wet,
    in quarter-hour blocks). Multiply by 4 to get minutes. Values >15 are
    impossible in the documented scale; log a warning + clamp.
    """
    if value is None:
        return None
    try:
        v = float(value)
    except (TypeError, ValueError):
        return None
    if v < 0:
        return Decimal("0")
    if v > 15:
        logger.warning(
            "Davis normalizer: LW value %s exceeds 0-15 scale; clamping to 60min",
            v,
        )
        v = 15
    return Decimal(str(round(v * 4.0, 1)))


def _first_present(record: dict[str, Any], keys) -> Any:
    for k in keys:
        if k in record and record[k] is not None:
            return record[k]
    return None


def _parse_ts(ts_raw: Any) -> datetime | None:
    """Davis returns Unix-epoch seconds."""
    if ts_raw is None:
        return None
    try:
        return datetime.fromtimestamp(int(ts_raw), tz=dt_tz.utc)
    except (TypeError, ValueError, OverflowError):
        return None


def normalize_historic_response(
    payload: dict[str, Any],
) -> list[dict[str, Any]]:
    """Davis `/v2/historic` payload → list of canonical-schema dicts.

    Walks every sensor block and merges per-timestamp records into one
    canonical row per `ts`. If two sensor blocks both report a field,
    last-wins (typical when a station has both ATK + Vue sensor suites).
    """
    sensors = payload.get("sensors") or []
    if not isinstance(sensors, list):
        return []

    by_ts: dict[datetime, dict[str, Any]] = {}
    for sensor in sensors:
        if not isinstance(sensor, dict):
            continue
        rows = sensor.get("data") or []
        if not isinstance(rows, list):
            continue
        for record in rows:
            if not isinstance(record, dict):
                continue
            ts = _parse_ts(record.get("ts") or record.get("timestamp"))
            if ts is None:
                continue
            row = by_ts.setdefault(ts, {"ts": ts})

            temp = _f_to_c(_first_present(record, TEMP_KEYS))
            if temp is not None:
                row["air_temp_c"] = temp
            rh = _rh(_first_present(record, RH_KEYS))
            if rh is not None:
                row["rh_pct"] = rh
            wind = _mph_to_ms(_first_present(record, WIND_MPH_KEYS))
            if wind is not None:
                row["wind_speed_ms"] = wind
            rain = _in_to_mm(_first_present(record, RAIN_IN_KEYS))
            if rain is not None:
                row["precip_mm"] = rain
            lw = davis_lw_to_minutes(_first_present(record, LW_RAW_KEYS))
            if lw is not None:
                row["leaf_wetness_min"] = lw

    out = [row for row in by_ts.values() if len(row) > 1]
    out.sort(key=lambda r: r["ts"])
    return out
