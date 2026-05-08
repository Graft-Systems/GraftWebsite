"""METER ZENTRA payload → canonical sensor schema (M1.5 PR-E).

Two distinct payload shapes from METER ZENTRA Cloud v4:

POLL response (`/api/v4/readings/?device_sn=...`):

    {
      "device": {"device_sn": "z6-12345", "model": "ATMOS-41"},
      "data": {
        "Air Temperature": {
          "values": [
            {"datetime": "2026-05-07 03:00:00+00:00", "value": 18.4, ...}
          ]
        },
        "Relative Humidity": {...},
        "Solar Radiation": {...},
        ...
      }
    }

PUSH payload (HTTPS Push API formdata, `data` field = JSON):

    {
      "device": {"device_sn": "z6-12345"},
      "readings": [
        {
          "datetime": "2026-05-07T03:00:00Z",
          "measurements": [
            {"name": "Air Temperature", "value": 18.4, "units": "°C"},
            {"name": "Relative Humidity", "value": 88, "units": "%"},
            ...
          ]
        }
      ]
    }

Both reduce to the canonical schema. ATMOS-41 ships without a native
leaf-wetness sensor — PHYTOS-31 add-on required. When LW absent, we
return `leaf_wetness_min = None` and the row still persists.
"""

from __future__ import annotations

import logging
from datetime import datetime, timezone as dt_tz
from decimal import Decimal
from typing import Any


logger = logging.getLogger(__name__)


# METER measurement-name → canonical schema field. METER's display
# names vary slightly across firmware revs; we lowercase + substring
# match.
NAME_MAP: dict[str, str] = {
    "air temperature": "air_temp_c",
    "atmospheric temperature": "air_temp_c",
    "temperature": "air_temp_c",
    "relative humidity": "rh_pct",
    "humidity": "rh_pct",
    "leaf wetness": "leaf_wetness_min",
    "leaf wetness duration": "leaf_wetness_min",
    "wind speed": "wind_speed_ms",
    "precipitation": "precip_mm",
    "rainfall": "precip_mm",
}


def _resolve_field(name: str) -> str | None:
    if not name:
        return None
    name_l = name.lower().strip()
    if name_l in NAME_MAP:
        return NAME_MAP[name_l]
    for needle, field in NAME_MAP.items():
        if needle in name_l:
            return field
    return None


def _to_decimal(value: Any) -> Decimal | None:
    if value is None:
        return None
    try:
        return Decimal(str(round(float(value), 2)))
    except (TypeError, ValueError):
        return None


def _parse_ts(raw: Any) -> datetime | None:
    """METER timestamps come as ISO strings in two flavours:
    `2026-05-07 03:00:00+00:00` (poll) or `2026-05-07T03:00:00Z` (push).
    """
    if raw is None:
        return None
    s = str(raw).strip()
    if not s:
        return None
    s = s.replace("T", " ").rstrip("Z").rstrip()
    # Strip "+00:00" suffix → naive UTC
    if s.endswith("+00:00"):
        s = s[:-6].rstrip()
    try:
        ts = datetime.strptime(s, "%Y-%m-%d %H:%M:%S")
    except ValueError:
        try:
            ts = datetime.strptime(s, "%Y-%m-%d %H:%M")
        except ValueError:
            return None
    return ts.replace(tzinfo=dt_tz.utc)


# ---------------------------------------------------------------------
# Poll-style normalization
# ---------------------------------------------------------------------


def normalize_poll_response(payload: dict[str, Any]) -> list[dict[str, Any]]:
    """METER `/api/v4/readings/?device_sn=...` → canonical rows."""
    data_block = payload.get("data") or {}
    if not isinstance(data_block, dict):
        return []

    by_ts: dict[datetime, dict[str, Any]] = {}
    for measurement_name, block in data_block.items():
        field = _resolve_field(str(measurement_name))
        if field is None:
            continue
        if not isinstance(block, dict):
            continue
        for entry in block.get("values") or []:
            if not isinstance(entry, dict):
                continue
            ts = _parse_ts(entry.get("datetime") or entry.get("timestamp"))
            if ts is None:
                continue
            v = _to_decimal(entry.get("value"))
            if v is None:
                continue
            row = by_ts.setdefault(ts, {"ts": ts})
            row[field] = v

    out = [r for r in by_ts.values() if len(r) > 1]
    out.sort(key=lambda r: r["ts"])
    return out


# ---------------------------------------------------------------------
# Push-style normalization
# ---------------------------------------------------------------------


def normalize_push_payload(payload: dict[str, Any]) -> tuple[str, list[dict[str, Any]]]:
    """METER HTTPS Push payload → (device_sn, canonical rows).

    Raises ValueError if `device_sn` is missing — the webhook receiver
    catches and 400s with a readable message.
    """
    device = payload.get("device") or {}
    device_sn = str(device.get("device_sn") or device.get("sn") or "").strip()
    if not device_sn:
        raise ValueError("METER push payload missing device.device_sn")

    rows_raw = payload.get("readings") or []
    if not isinstance(rows_raw, list):
        return device_sn, []

    out: list[dict[str, Any]] = []
    for entry in rows_raw:
        if not isinstance(entry, dict):
            continue
        ts = _parse_ts(entry.get("datetime") or entry.get("timestamp"))
        if ts is None:
            continue
        row: dict[str, Any] = {"ts": ts}
        for m in entry.get("measurements") or []:
            if not isinstance(m, dict):
                continue
            field = _resolve_field(str(m.get("name") or ""))
            if field is None:
                continue
            v = _to_decimal(m.get("value"))
            if v is None:
                continue
            row[field] = v
        if len(row) > 1:
            out.append(row)
    out.sort(key=lambda r: r["ts"])
    return device_sn, out
