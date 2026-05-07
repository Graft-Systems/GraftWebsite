"""Davis Instruments WeatherLink v2 connector (M1.5 PR-E, spec §12A.1).

Two-key auth (API-Key + API-Secret headers); 15-min polling only; LW
reported on a 0-15 scale that we normalize to minutes-per-hour. 1,000
calls/hr account-wide rate limit (shared across all stations on the
account).
"""
