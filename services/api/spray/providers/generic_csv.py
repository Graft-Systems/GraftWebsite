"""Generic CSV weather adapter (M0-06 step 6).

Escape hatch for any user with a station we haven't adapted. Reads a
CSV file at the path stored on `WeatherStation.settings["csv_path"]`
and yields `WeatherObservation` instances.

Required column: `ts` (ISO 8601). Optional columns: any subset of
`temp_c`, `rh_pct`, `leaf_wetness_min`, `wind_speed_ms`, `precip_mm`.

Forecast is not supported (CSVs are historical only); `fetch_forecast`
raises NotImplementedError.
"""

from __future__ import annotations

import csv
from datetime import datetime
from decimal import Decimal, InvalidOperation
from pathlib import Path
from typing import Iterable

from spray.providers.base import (
    ProviderHealth,
    ProviderResponseError,
)
from spray.providers.registry import register_weather

NUMERIC_FIELDS = (
    "temp_c",
    "rh_pct",
    "leaf_wetness_min",
    "wind_speed_ms",
    "precip_mm",
)


def _decimal_or_none(value: str) -> Decimal | None:
    if value is None or value == "":
        return None
    try:
        return Decimal(value)
    except (InvalidOperation, ValueError):
        return None


def _parse_ts(value: str) -> datetime | None:
    if not value:
        return None
    try:
        # Accept "Z" suffix without choking.
        return datetime.fromisoformat(value.replace("Z", "+00:00"))
    except ValueError:
        return None


def _read_csv(path: Path) -> Iterable[dict[str, str]]:
    with path.open("r", encoding="utf-8", newline="") as fh:
        reader = csv.DictReader(fh)
        for row in reader:
            yield row


@register_weather
class GenericCsvProvider:
    PROVIDER_SLUG = "generic_csv"

    def fetch_observations(self, station, since):
        from spray.models import WeatherObservation

        path_str = station.settings.get("csv_path") if station.settings else None
        if not path_str:
            raise ProviderResponseError(
                f"station {station.id} missing settings.csv_path"
            )
        path = Path(path_str)
        if not path.exists():
            raise ProviderResponseError(f"csv path not found: {path}")

        out: list[WeatherObservation] = []
        for row in _read_csv(path):
            ts = _parse_ts(row.get("ts", ""))
            if ts is None or ts < since:
                continue
            kwargs = {
                k: _decimal_or_none(row.get(k, "")) for k in NUMERIC_FIELDS
            }
            out.append(
                WeatherObservation(
                    station=station,
                    ts=ts,
                    is_forecast=False,
                    raw=row,
                    **kwargs,
                )
            )
        return out

    def fetch_forecast(self, station, days):
        raise NotImplementedError("CSV provider supports historical only")

    def health(self) -> ProviderHealth:
        return ProviderHealth(ok=True, detail="local file adapter")
