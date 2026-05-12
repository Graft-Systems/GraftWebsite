"""ModelRunner Protocol — spec §11A.1 + PR-C contract.

A `ModelRunner` takes a `WeatherWindow` (hourly observations for a
block over a configurable lookback window) and emits a single
`RiskRecord`-shaped result for the relevant pathogen.

The `RiskRecord` JSON Schema is registered at
`services/api/spray/schemas/events/risk_record/emitted/v1.json` and
this dataclass mirrors that shape so emitters and validators stay in
lockstep.
"""

from __future__ import annotations

import hashlib
import json
from dataclasses import dataclass, field
from datetime import datetime, timezone
from decimal import Decimal
from typing import Any, Iterable, Literal, Protocol


Pathogen = Literal["powdery", "downy"]
Action = Literal["spray", "hold", "scout"]


@dataclass
class HourlyObservation:
    """One hour of weather data for a block."""

    ts: datetime
    temp_c: float | None
    rh_pct: float | None
    leaf_wetness_min: float | None
    wind_speed_ms: float | None
    precip_mm: float | None
    source_summary: dict[str, Any] = field(default_factory=dict)
    fusion_confidence: float = 0.0


@dataclass
class WeatherWindow:
    """Time-bounded set of hourly observations for a single block.

    Runners do not assume the window is gap-free; missing values
    surface as `None` on `HourlyObservation` and runners SHOULD reduce
    confidence rather than crash.
    """

    block_id: str
    valid_from: datetime
    valid_to: datetime
    observations: list[HourlyObservation]

    @property
    def hour_count(self) -> int:
        return len(self.observations)

    def snapshot_id(self) -> str:
        """Stable sha256 over the observation series — used for audit hashing.

        Hash includes block_id, the (valid_from, valid_to) window, and
        every observation's tuple. Two runs with identical inputs MUST
        produce the same snapshot_id.
        """
        blob = {
            "block_id": str(self.block_id),
            "valid_from": self.valid_from.isoformat(),
            "valid_to": self.valid_to.isoformat(),
            "observations": [
                {
                    "ts": o.ts.isoformat(),
                    "temp_c": o.temp_c,
                    "rh_pct": o.rh_pct,
                    "leaf_wetness_min": o.leaf_wetness_min,
                    "wind_speed_ms": o.wind_speed_ms,
                    "precip_mm": o.precip_mm,
                    "source_summary": o.source_summary,
                    "fusion_confidence": o.fusion_confidence,
                }
                for o in self.observations
            ],
        }
        encoded = json.dumps(blob, sort_keys=True, separators=(",", ":")).encode(
            "utf-8"
        )
        return "sha256:" + hashlib.sha256(encoded).hexdigest()


@dataclass
class ThresholdHit:
    name: str
    citation_id: str


@dataclass
class RiskRecordResult:
    """In-memory mirror of the `risk_record.emitted.v1` schema.

    Runners return this; the worker task persists rows to the
    `RiskRecord` Django model + emits the lake event.
    """

    model_id: str
    model_version: str
    block_id: str
    valid_from: datetime
    valid_to: datetime
    pathogen: Pathogen
    severity_1_10: float
    raw_score: dict[str, Any]
    thresholds_fired: list[ThresholdHit]
    input_snapshot_id: str
    confidence: float
    citation_id: str

    def to_event_payload(self) -> dict[str, Any]:
        """Shape that matches the JSON Schema for emit_event."""
        return {
            "model_id": self.model_id,
            "model_version": self.model_version,
            "block_id": str(self.block_id),
            "valid_from": self.valid_from.isoformat(),
            "valid_to": self.valid_to.isoformat(),
            "pathogen": self.pathogen,
            "severity_1_10": round(float(self.severity_1_10), 2),
            "raw_score": self.raw_score,
            "thresholds_fired": [
                {"name": t.name, "citation_id": t.citation_id}
                for t in self.thresholds_fired
            ],
            "input_snapshot_id": self.input_snapshot_id,
            "confidence": round(float(self.confidence), 4),
            "citation_id": self.citation_id,
        }


class ModelRunner(Protocol):
    """Per-model contract.

    Implementers MUST set the four class attributes and implement
    `compute()`. Self-register via `@register_runner` in registry.py.
    """

    SLUG: str
    """Lowercase, snake_case unique identifier (e.g. 'gubler_thomas_2013')."""

    VERSION: str
    """Semver-ish version string. Bumping invalidates audit_hash."""

    PATHOGEN: Pathogen
    """`'powdery'` or `'downy'`."""

    CITATION_ID: str
    """Source row ID into `docs/research/sources_master.csv` (e.g. '06-S2')."""

    def compute(self, window: WeatherWindow) -> RiskRecordResult:
        """Run the model against a weather window and emit a RiskRecord."""
        ...
