"""Provider registry — slug -> class lookup (M0-06 step 4).

Adapters self-register via their `PROVIDER_SLUG` class attribute. This
module imports each adapter eagerly so the registry is populated at
import time. Importers don't need to know which providers exist; they
just call `get_weather("visual_crossing")` or
`get_external_risk("uc_ipm_grape_pm")`.
"""

from __future__ import annotations

from typing import Type

from spray.providers.base import ExternalRiskIndexProvider, WeatherProvider


class UnknownProviderError(KeyError):
    """Raised when a slug doesn't resolve to a registered adapter."""


_WEATHER: dict[str, Type[WeatherProvider]] = {}
_EXTERNAL_RISK: dict[str, Type[ExternalRiskIndexProvider]] = {}


def register_weather(cls: Type[WeatherProvider]) -> Type[WeatherProvider]:
    slug = getattr(cls, "PROVIDER_SLUG", None)
    if not slug:
        raise ValueError(f"weather provider {cls!r} missing PROVIDER_SLUG")
    _WEATHER[slug] = cls
    return cls


def register_external_risk(
    cls: Type[ExternalRiskIndexProvider],
) -> Type[ExternalRiskIndexProvider]:
    slug = getattr(cls, "PROVIDER_SLUG", None)
    if not slug:
        raise ValueError(f"external risk provider {cls!r} missing PROVIDER_SLUG")
    _EXTERNAL_RISK[slug] = cls
    return cls


def get_weather(slug: str) -> WeatherProvider:
    cls = _WEATHER.get(slug)
    if cls is None:
        raise UnknownProviderError(
            f"no weather provider registered for slug {slug!r}; "
            f"known: {sorted(_WEATHER)}"
        )
    return cls()


def get_external_risk(slug: str) -> ExternalRiskIndexProvider:
    cls = _EXTERNAL_RISK.get(slug)
    if cls is None:
        raise UnknownProviderError(
            f"no external risk provider registered for slug {slug!r}; "
            f"known: {sorted(_EXTERNAL_RISK)}"
        )
    return cls()


def known_weather_slugs() -> list[str]:
    return sorted(_WEATHER)


def known_external_risk_slugs() -> list[str]:
    return sorted(_EXTERNAL_RISK)


def region_default_weather_slug(region: str) -> str:
    """Default weather provider for a region (spec §4.3)."""
    # M0-06: Visual Crossing covers Napa/Sonoma/Mendoza out of the box;
    # other regions also default to Visual Crossing until M0-06a brings
    # online a region-specific adapter (Météo-France ICOS for Burgundy/Bordeaux,
    # INTA Pampa for Mendoza).
    return "visual_crossing"


# Eager import so adapters self-register on package import.
# Imports MUST live at module bottom to avoid circular imports
# (each adapter imports from registry to call register_*).
from spray.providers import (  # noqa: E402, F401
    generic_csv,
    uc_ipm_grape_pm,
    uspest_grape_pm,
    visual_crossing,
)
