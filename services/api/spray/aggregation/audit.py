"""Audit-hash helper for `BlockVerdict` — spec §11A.7.

Acceptance criterion: `BlockVerdict.audit_hash` is reproducible from
input snapshot + model versions + ensemble version. Same inputs → same
hash, every time. Mutating any input mutates the hash.

Schema enforces `^sha256:[a-f0-9]{64}$` so this function MUST emit
that format (`block_verdict.generated.v1.json`).
"""

from __future__ import annotations

import hashlib
import json
from typing import Mapping


ENSEMBLE_VERSION = "year_0_equal_weight_soft_vote@1.0.0"
"""Bumping this invalidates audit hashes across the fleet — only do
so when the fusion algorithm itself changes (Year 1 → weighted; Year
2 → stacked meta-learner)."""


def compute_audit_hash(
    *,
    input_snapshot_id: str,
    model_versions: Mapping[str, str],
    ensemble_version: str = ENSEMBLE_VERSION,
) -> str:
    """Returns a sha256:HEX64 string suitable for `BlockVerdict.audit_hash`.

    Args:
        input_snapshot_id: opaque ID over the WeatherWindow; same
            input_snapshot_id across runners means they all saw the
            exact same weather data.
        model_versions: `{slug: version}` for every runner that
            contributed a `RiskRecord` to this verdict.
        ensemble_version: which fusion algorithm the verdict came from.

    Determinism guarantee: dict ordering is normalized via
    `sort_keys=True`.
    """
    blob = {
        "input_snapshot_id": input_snapshot_id,
        "model_versions": dict(sorted(model_versions.items())),
        "ensemble_version": ensemble_version,
    }
    encoded = json.dumps(blob, sort_keys=True, separators=(",", ":")).encode(
        "utf-8"
    )
    digest = hashlib.sha256(encoded).hexdigest()
    return f"sha256:{digest}"
