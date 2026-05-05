"""Weather + external-risk-index provider abstractions (M0-06).

Two parallel layers:
  - WeatherProvider: hourly observations + forecasts per station
  - ExternalRiskIndexProvider: hourly aggregation of public extension
    services (UC IPM, uspest.org) per region

Each adapter sets `PROVIDER_SLUG` so `registry.py` can auto-discover
without a hardcoded map.
"""

from spray.providers.base import (  # noqa: F401
    ExternalRiskIndexProvider,
    ProviderAuthError,
    ProviderHealth,
    ProviderRateLimitError,
    ProviderResponseError,
    WeatherProvider,
)
