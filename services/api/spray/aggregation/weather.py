"""Weather-window aggregation for disease model runners.

The first executable integration slice routes normalized, block-linked
sensor readings into the existing model-runner pipeline while preserving
regional weather as a fallback. Source connectors normalize into
`SensorReading`; external providers normalize into `WeatherObservation`.
This module fuses both into the runner-facing `WeatherWindow`.
"""

from __future__ import annotations

from datetime import datetime
from typing import Iterable

from spray.aggregation.runners.base import HourlyObservation, WeatherWindow
from spray.aggregation.weather_fusion import EvidenceObservation, fuse_hourly_evidence
from spray.models import (
    Block,
    IntegrationConnection,
    SensorReading,
    WeatherObservation,
    WeatherStation,
)


def build_block_weather_window(
    *,
    block: Block,
    valid_from: datetime,
    valid_to: datetime,
) -> WeatherWindow:
    """Build a weather window for one block.

    Precedence is field-level:
    1. On-site `SensorReading` rows from stations linked to the block.
    2. Regional/default `WeatherObservation` rows for the vineyard region.

    That lets a partial on-site station, for example temperature-only,
    still use provider rainfall or wind for the same hour.
    """

    evidence = [
        *_onsite_sensor_evidence(block, valid_from, valid_to),
        *_regional_weather_evidence(block, valid_from, valid_to),
    ]
    observations = fuse_hourly_evidence(evidence)

    return WeatherWindow(
        block_id=str(block.id),
        valid_from=valid_from,
        valid_to=valid_to,
        observations=observations,
    )


def _regional_weather_observations(
    block: Block,
    valid_from: datetime,
    valid_to: datetime,
) -> Iterable[WeatherObservation]:
    station = (
        WeatherStation.objects.filter(
            is_regional_default=True,
            region=block.vineyard.region,
        )
        .order_by("created_at")
        .first()
    )
    if station is None:
        return []
    return (
        WeatherObservation.objects.filter(
            station=station,
            ts__gte=valid_from,
            ts__lte=valid_to,
        )
        .order_by("ts")
    )


def _regional_weather_evidence(
    block: Block,
    valid_from: datetime,
    valid_to: datetime,
) -> list[EvidenceObservation]:
    evidence: list[EvidenceObservation] = []
    for row in _regional_weather_observations(block, valid_from, valid_to):
        evidence.append(
            EvidenceObservation(
                ts=row.ts,
                source=f"{row.station.provider}:{row.station.station_id}",
                source_kind="forecast" if row.is_forecast else "regional_station",
                quality=0.72 if row.is_forecast else 0.82,
                is_forecast=row.is_forecast,
                temp_c=_float_or_none(row.temp_c),
                rh_pct=_float_or_none(row.rh_pct),
                leaf_wetness_min=_float_or_none(row.leaf_wetness_min),
                wind_speed_ms=_float_or_none(row.wind_speed_ms),
                precip_mm=_float_or_none(row.precip_mm),
                trace={
                    "weather_observation_id": str(row.id),
                    "weather_station_id": str(row.station_id),
                },
            )
        )
    return evidence


def _onsite_sensor_evidence(
    block: Block,
    valid_from: datetime,
    valid_to: datetime,
) -> list[EvidenceObservation]:
    readings = (
        SensorReading.objects.unscoped()
        .filter(
            station__linked_blocks=block,
            station__archived_at__isnull=True,
            station__connection__status=IntegrationConnection.Status.ACTIVE,
            ts__gte=valid_from,
            ts__lte=valid_to,
        )
        .order_by("ts")
        .distinct()
    )

    evidence: list[EvidenceObservation] = []
    for reading in readings:
        quality = _quality_score(reading.quality_flag)
        evidence.append(
            EvidenceObservation(
                ts=reading.ts,
                source=(
                    f"{reading.station.connection.vendor}:"
                    f"{reading.station.vendor_station_id}"
                ),
                source_kind="block_sensor",
                quality=quality,
                temp_c=_float_or_none(reading.air_temp_c),
                rh_pct=_float_or_none(reading.rh_pct),
                leaf_wetness_min=_float_or_none(reading.leaf_wetness_min),
                wind_speed_ms=_float_or_none(reading.wind_speed_ms),
                precip_mm=_float_or_none(reading.precip_mm),
                trace={
                    "sensor_reading_id": str(reading.id),
                    "sensor_station_id": str(reading.station_id),
                    "quality_flag": reading.quality_flag,
                },
            )
        )
    return evidence


def _float_or_none(value) -> float | None:
    if value is None:
        return None
    return float(value)


def _quality_score(flag: str) -> float:
    if flag == SensorReading.QualityFlag.ESTIMATED:
        return 0.74
    if flag == SensorReading.QualityFlag.GAP_FILLED:
        return 0.66
    if flag == SensorReading.QualityFlag.STALE:
        return 0.45
    if flag == SensorReading.QualityFlag.BAD:
        return 0.0
    return 1.0
