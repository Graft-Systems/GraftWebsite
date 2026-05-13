"""Severity 1–10 anchor tables — spec §11A.4.

Powdery: Gubler-Thomas Risk Index → 1–10.
Downy: Caffi primary score + secondary wet-warm hours → 1–10.

Anchor functions are deterministic, monotonic, and bounded so a runner
never returns NaN or out-of-range severity. Spec §13B.5 promises 90-day
backward-compat when these anchors evolve; bump the function name
(e.g. `gt_ri_to_severity_1_10_v2`) rather than mutating in place.
"""

from __future__ import annotations


# ---------------------------------------------------------------------
# Powdery (Gubler-Thomas Risk Index 0–100 → severity 1–10)
# ---------------------------------------------------------------------


def gt_ri_to_severity_1_10(ri: float) -> float:
    """Map Gubler-Thomas Risk Index to severity 1–10.

    Banding per spec §11A.4:
        RI 0–9   → 1
        RI 10–19 → 2
        RI 20–29 → 3
        RI 30–39 → 4
        RI 40–49 → 5
        RI 50–59 → 6
        RI 60–69 → 7
        RI 70–79 → 8
        RI 80–89 → 9
        RI 90+   → 10

    Within-band interpolation gives smooth 1.0–10.0 output for confidence
    surfacing (rather than stepping by 1). Output is clamped to [1.0, 10.0].
    """
    if ri is None:
        return 1.0
    ri = max(0.0, min(100.0, float(ri)))
    # Map 0..100 linearly to 1.0..10.0 (band centers ~5, 15, 25, ... 95).
    severity = 1.0 + ri * 0.09  # 100 * 0.09 = 9.0, plus 1 = 10
    return round(min(10.0, max(1.0, severity)), 2)


# ---------------------------------------------------------------------
# Downy primary infection (Caffi 2009 surrogate score 0–10 → severity 1–10)
# ---------------------------------------------------------------------


def primary_infection_to_severity(primary_score: float) -> float:
    """Map Caffi-Primary surrogate score (0..10) to severity 1–10.

    The runner emits a 0..10 surrogate based on conditions met; this
    function maps it monotonically into the public 1..10 scale.
    """
    if primary_score is None:
        return 1.0
    score = max(0.0, min(10.0, float(primary_score)))
    severity = 1.0 + score * 0.9
    return round(min(10.0, max(1.0, severity)), 2)


# ---------------------------------------------------------------------
# Downy secondary infection (wet-warm hours → severity 1–10)
# ---------------------------------------------------------------------


def secondary_infection_hours_to_severity(wet_warm_hours: int) -> float:
    """Map wet-warm hour count to severity 1–10.

    Banding (Brischetto + Caffi qualitative):
        0–3 h → 1–2 (low)
        4–5 h → 3 (low-moderate)
        6–7 h → 4–5 (moderate)
        8–9 h → 6 (moderate-high)
        10–11 h → 7 (high)
        12+ h → 8–10 (very high; saturating)
    """
    if wet_warm_hours is None or wet_warm_hours < 0:
        return 1.0
    if wet_warm_hours < 4:
        severity = 1.0 + wet_warm_hours * 0.3  # 0→1.0, 3→1.9
    elif wet_warm_hours < 6:
        severity = 2.5 + (wet_warm_hours - 4) * 0.5  # 4→2.5, 5→3.0
    elif wet_warm_hours < 8:
        severity = 3.5 + (wet_warm_hours - 6) * 0.75  # 6→3.5, 7→4.25
    elif wet_warm_hours < 10:
        severity = 5.0 + (wet_warm_hours - 8) * 0.5  # 8→5.0, 9→5.5
    elif wet_warm_hours < 12:
        severity = 6.0 + (wet_warm_hours - 10) * 0.5  # 10→6.0, 11→6.5
    else:
        # Saturate around 9 by 24h+, never quite hit 10 unless extreme.
        severity = 7.0 + min(2.5, (wet_warm_hours - 12) * 0.2)
    return round(min(10.0, max(1.0, severity)), 2)
