"""METER ZENTRA Cloud v4 connector (M1.5 PR-E, spec §12A.1).

Bearer-token auth + native HTTPS Push API. Webhook-first per spec
§12A.4: real-time pushes are the primary ingestion path; the polling
fetch is a 60-min gap-fill safety net. Per-device rate limit 1/min;
per-org 60/min total.

ATMOS-41 lacks a native leaf-wetness sensor — PHYTOS-31 add-on or no
LW. The normalizer falls back to `leaf_wetness_min = None` when the
LW measurement is absent rather than dropping the whole row.

v4 is pinned in PESSL_API_BASE-style settings; v5 (2026 release) lands
in a follow-up PR.
"""
