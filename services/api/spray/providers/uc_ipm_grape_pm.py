"""UC IPM Grape Powdery Mildew Risk Assessment Index adapter (M0-06 SA-1).

Scrapes the UC IPM Grape PM RAI page for the daily index value.
Endpoint: https://ipm.ucanr.edu/weather/grape-powdery-mildew-risk-assessment-index/

The page does not expose a JSON API; we parse the HTML with a
forgiving regex over a known anchor pattern. When the page structure
changes, this adapter fails gracefully (returns a row with risk_level
LOW and `raw_payload.parse_error=...` for ops triage).

Risk-level mapping per spec §11.8:
  index 0-30   → low
  index 31-60  → moderate
  index 61-100 → high
"""

from __future__ import annotations

import re
import time
from datetime import datetime, timezone as dt_tz
from decimal import Decimal

import requests
from django.utils import timezone

from spray.providers.base import (
    ProviderHealth,
    ProviderRateLimitError,
    ProviderResponseError,
)
from spray.providers.registry import register_external_risk

UC_IPM_URL = (
    "https://ipm.ucanr.edu/weather/grape-powdery-mildew-risk-assessment-index/"
)

# Anchored-on-text regex: looks for an integer near the words
# "risk index" or "RAI" on the page. Defensive — if the page reflows,
# we fall through to the no-match branch.
_INDEX_RE = re.compile(
    r"(?:risk\s*index|RAI)[^0-9]{0,40}([0-9]{1,3})", re.IGNORECASE | re.DOTALL
)


def _classify(value: int | None) -> str:
    if value is None:
        return "low"
    if value <= 30:
        return "low"
    if value <= 60:
        return "moderate"
    return "high"


def _hour_bucket(now: datetime | None = None) -> datetime:
    now = now or timezone.now()
    return now.replace(minute=0, second=0, microsecond=0)


@register_external_risk
class UcIpmGrapePmProvider:
    PROVIDER_SLUG = "uc_ipm_grape_pm"

    def fetch_index(self, region: str):
        from spray.models import ExternalRiskIndex

        started = time.time()
        try:
            resp = requests.get(
                UC_IPM_URL,
                timeout=20,
                headers={"User-Agent": "graft-spray/1.0 (+https://graftsystems.com)"},
            )
        except requests.RequestException as e:
            raise ProviderResponseError(f"network error: {e}") from e
        latency_ms = (time.time() - started) * 1000

        if resp.status_code == 429:
            raise ProviderRateLimitError("rate limited by UC IPM")
        if resp.status_code >= 500:
            raise ProviderResponseError(f"upstream {resp.status_code}")
        if resp.status_code >= 400:
            raise ProviderResponseError(f"http {resp.status_code}")

        text = resp.text or ""
        match = _INDEX_RE.search(text)
        value: Decimal | None = None
        parse_error: str | None = None
        if match:
            try:
                value = Decimal(match.group(1))
            except Exception as e:  # noqa: BLE001
                parse_error = f"value parse: {e}"
        else:
            parse_error = "regex did not match; page structure may have changed"

        risk_level = _classify(int(value) if value is not None else None)
        return ExternalRiskIndex(
            region=region,
            source=ExternalRiskIndex.Source.UC_IPM_GRAPE_PM,
            risk_index_value=value,
            risk_level=risk_level,
            pulled_at_hour=_hour_bucket(),
            raw_payload={
                "url": UC_IPM_URL,
                "status_code": resp.status_code,
                "latency_ms": latency_ms,
                "html_excerpt": text[:2000],
                "parse_error": parse_error,
            },
        )

    def health(self) -> ProviderHealth:
        started = time.time()
        try:
            resp = requests.head(UC_IPM_URL, timeout=10, allow_redirects=True)
        except requests.RequestException as e:
            return ProviderHealth(ok=False, detail=str(e))
        latency = (time.time() - started) * 1000
        if 200 <= resp.status_code < 400:
            return ProviderHealth(ok=True, latency_ms=latency)
        return ProviderHealth(
            ok=False, latency_ms=latency, detail=f"http {resp.status_code}"
        )
