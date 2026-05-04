"""Provider registry tests (M0-06)."""

from __future__ import annotations

import pytest

from spray.providers import registry


def test_known_weather_slugs():
    slugs = set(registry.known_weather_slugs())
    assert "visual_crossing" in slugs
    assert "generic_csv" in slugs


def test_known_external_risk_slugs():
    slugs = set(registry.known_external_risk_slugs())
    assert "uc_ipm_grape_pm" in slugs
    assert "uspest_grape_pm" in slugs


def test_get_weather_unknown_raises():
    with pytest.raises(registry.UnknownProviderError):
        registry.get_weather("nope_not_real")


def test_region_default_weather_slug():
    assert registry.region_default_weather_slug("napa") == "visual_crossing"
    assert registry.region_default_weather_slug("sonoma") == "visual_crossing"
