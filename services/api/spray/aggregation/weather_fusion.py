"""Semantic fusion of vineyard sensors and weather-provider evidence."""

from __future__ import annotations

from dataclasses import dataclass, field
from datetime import datetime
from typing import Iterable

from spray.aggregation.runners.base import HourlyObservation


@dataclass(frozen=True)
class EvidenceObservation:
    """Provider-neutral hourly evidence before model-runner fusion."""

    ts: datetime
    source: str
    source_kind: str
    quality: float = 1.0
    distance_m: float | None = None
    is_forecast: bool = False
    temp_c: float | None = None
    rh_pct: float | None = None
    leaf_wetness_min: float | None = None
    wind_speed_ms: float | None = None
    precip_mm: float | None = None
    trace: dict = field(default_factory=dict)


FIELD_NAMES = (
    "temp_c",
    "rh_pct",
    "leaf_wetness_min",
    "wind_speed_ms",
    "precip_mm",
)

SOURCE_KIND_WEIGHT = {
    "block_sensor": 1.0,
    "vineyard_sensor": 0.92,
    "regional_station": 0.64,
    "weather_api": 0.58,
    "forecast": 0.48,
}


def fuse_hourly_evidence(
    evidence: Iterable[EvidenceObservation],
) -> list[HourlyObservation]:
    """Fuse source evidence into one hourly model input series.

    Fusion is field-level, so a Davis temperature channel can combine
    with a Pessl leaf-wetness channel and a Visual Crossing rainfall
    fallback for the same hour without discarding provenance.
    """

    buckets: dict[datetime, list[EvidenceObservation]] = {}
    for item in evidence:
        buckets.setdefault(item.ts, []).append(item)

    fused: list[HourlyObservation] = []
    for ts in sorted(buckets):
        items = buckets[ts]
        values = {field: _fuse_field(items, field) for field in FIELD_NAMES}
        confidence_values = [
            result["confidence"]
            for result in values.values()
            if result["value"] is not None
        ]
        fusion_confidence = (
            sum(confidence_values) / len(confidence_values)
            if confidence_values
            else 0.0
        )
        fused.append(
            HourlyObservation(
                ts=ts,
                temp_c=values["temp_c"]["value"],
                rh_pct=values["rh_pct"]["value"],
                leaf_wetness_min=values["leaf_wetness_min"]["value"],
                wind_speed_ms=values["wind_speed_ms"]["value"],
                precip_mm=values["precip_mm"]["value"],
                source_summary={
                    "sources": sorted({item.source for item in items}),
                    "source_kinds": sorted({item.source_kind for item in items}),
                    "contributors": [
                        {
                            "source": item.source,
                            "source_kind": item.source_kind,
                            "quality": round(item.quality, 4),
                            "is_forecast": item.is_forecast,
                            "trace": item.trace,
                        }
                        for item in items
                    ],
                },
                fusion_confidence=round(fusion_confidence, 4),
            )
        )
    return fused


def _fuse_field(items: list[EvidenceObservation], field: str) -> dict:
    weighted: list[tuple[float, float]] = []
    for item in items:
        value = getattr(item, field)
        if value is None:
            continue
        weighted.append((float(value), _weight(item)))
    if not weighted:
        return {"value": None, "confidence": 0.0}

    weight_sum = sum(weight for _, weight in weighted) or 1.0
    value = sum(value * weight for value, weight in weighted) / weight_sum
    confidence = min(1.0, weight_sum / max(1, len(weighted)))
    return {"value": round(value, 4), "confidence": round(confidence, 4)}


def _weight(item: EvidenceObservation) -> float:
    source_weight = SOURCE_KIND_WEIGHT.get(item.source_kind, 0.5)
    distance_weight = 0.75
    if item.distance_m is not None:
        distance_weight = max(0.35, 1.0 - min(item.distance_m, 20000.0) / 20000.0)
    forecast_penalty = 0.82 if item.is_forecast else 1.0
    return (
        source_weight
        * max(0.0, min(1.0, item.quality))
        * distance_weight
        * forecast_penalty
    )
