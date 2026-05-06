"""Provider Protocols + shared exceptions (M0-06 step 4).

Spec §12.1 defines the WeatherProvider Protocol; §12.5 the
ExternalRiskIndexProvider Protocol. Both share a small set of
exception types so the worker's retry policy can target the right
class (rate-limit retries with exponential backoff, auth errors fail
fast, response errors retry once).
"""

from __future__ import annotations

from dataclasses import dataclass
from datetime import datetime
from typing import TYPE_CHECKING, Protocol

if TYPE_CHECKING:
    from spray.models import (
        ExternalRiskIndex,
        WeatherObservation,
        WeatherStation,
    )


# ---------------------------------------------------------------------
# Exceptions
# ---------------------------------------------------------------------


class ProviderError(Exception):
    """Base class for provider-related errors."""


class ProviderRateLimitError(ProviderError):
    """Provider returned 429. Worker retries with exponential backoff."""


class ProviderAuthError(ProviderError):
    """API key invalid/missing. No retry; surface to ops dashboard."""


class ProviderResponseError(ProviderError):
    """5xx or malformed response. Worker retries once."""


# ---------------------------------------------------------------------
# Health
# ---------------------------------------------------------------------


@dataclass
class ProviderHealth:
    ok: bool
    latency_ms: float | None = None
    detail: str = ""


# ---------------------------------------------------------------------
# Protocols
# ---------------------------------------------------------------------


class WeatherProvider(Protocol):
    """Hourly weather observations + forecasts for a single station."""

    PROVIDER_SLUG: str

    def fetch_observations(
        self, station: "WeatherStation", since: datetime
    ) -> list["WeatherObservation"]:
        """Return historical observations from `since` to "now"."""
        ...

    def fetch_forecast(
        self, station: "WeatherStation", days: int
    ) -> list["WeatherObservation"]:
        """Return hourly forecast observations for `days` days out."""
        ...

    def health(self) -> ProviderHealth:
        """Liveness probe. Should NOT raise; returns ok=False on failure."""
        ...


class ExternalRiskIndexProvider(Protocol):
    """Hourly aggregation of public extension-service risk indices (SA-1)."""

    PROVIDER_SLUG: str

    def fetch_index(self, region: str) -> "ExternalRiskIndex":
        """Return the latest index value for `region`."""
        ...

    def health(self) -> ProviderHealth:
        ...
