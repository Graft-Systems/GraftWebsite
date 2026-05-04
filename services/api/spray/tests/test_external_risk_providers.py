"""UC IPM + uspest scrapers tests (M0-06 SA-1)."""

from __future__ import annotations

import pytest
import responses

from spray.models import ExternalRiskIndex
from spray.providers.uc_ipm_grape_pm import UC_IPM_URL, UcIpmGrapePmProvider
from spray.providers.uspest_grape_pm import USPEST_URL, USPestGrapePmProvider


pytestmark = pytest.mark.django_db


@responses.activate
def test_uc_ipm_happy_path():
    responses.add(
        responses.GET,
        UC_IPM_URL,
        body="The current Risk Index for Napa is 45 (moderate).",
        status=200,
        content_type="text/html",
    )
    fresh = UcIpmGrapePmProvider().fetch_index(region="napa")
    assert fresh.risk_index_value == 45
    assert fresh.risk_level == "moderate"
    assert fresh.region == "napa"


@responses.activate
def test_uc_ipm_high_index():
    responses.add(
        responses.GET,
        UC_IPM_URL,
        body="risk index 78",
        status=200,
        content_type="text/html",
    )
    fresh = UcIpmGrapePmProvider().fetch_index(region="napa")
    assert fresh.risk_level == "high"


@responses.activate
def test_uc_ipm_no_match_falls_through():
    """Page reflowed without an integer near 'risk index' → low + parse_error."""
    responses.add(
        responses.GET,
        UC_IPM_URL,
        body="<html>page redesigned, no number visible</html>",
        status=200,
        content_type="text/html",
    )
    fresh = UcIpmGrapePmProvider().fetch_index(region="napa")
    assert fresh.risk_index_value is None
    assert fresh.risk_level == "low"
    assert fresh.raw_payload.get("parse_error") is not None


@responses.activate
def test_uspest_happy_path():
    responses.add(
        responses.GET,
        USPEST_URL,
        body="Score: 22 / Risk index: low",
        status=200,
        content_type="text/html",
    )
    fresh = USPestGrapePmProvider().fetch_index(region="sonoma")
    assert fresh.risk_index_value == 22
    assert fresh.risk_level == "low"
    assert fresh.source == ExternalRiskIndex.Source.USPEST_GRAPE_PM


@responses.activate
def test_uspest_500_raises():
    from spray.providers.base import ProviderResponseError

    responses.add(
        responses.GET, USPEST_URL, body="", status=500, content_type="text/html"
    )
    with pytest.raises(ProviderResponseError):
        USPestGrapePmProvider().fetch_index(region="sonoma")


@responses.activate
def test_uc_ipm_health_ok():
    responses.add(responses.HEAD, UC_IPM_URL, status=200)
    h = UcIpmGrapePmProvider().health()
    assert h.ok is True


@responses.activate
def test_uspest_health_failure():
    responses.add(responses.HEAD, USPEST_URL, status=503)
    h = USPestGrapePmProvider().health()
    assert h.ok is False
