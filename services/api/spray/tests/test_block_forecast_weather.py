"""Block forecast-weather endpoint (Visual Crossing daily window)."""

from __future__ import annotations

import json

import pytest
import responses
from django.contrib.gis.geos import GEOSGeometry
from django.test import override_settings

from spray.models import Block, Membership, Vineyard

pytestmark = pytest.mark.django_db

POLYGON_A = {
    "type": "Polygon",
    "coordinates": [
        [
            [-122.30, 38.30],
            [-122.30, 38.31],
            [-122.29, 38.31],
            [-122.29, 38.30],
            [-122.30, 38.30],
        ]
    ],
}


def _setup(auth_client, make_org, make_membership):
    client, user = auth_client()
    org = make_org()
    make_membership(user=user, org=org, role=Membership.Role.OWNER)
    geom = GEOSGeometry(json.dumps(POLYGON_A), srid=4326)
    v = Vineyard.objects.unscoped().create(org=org, name="V", region="napa")
    block = Block.objects.unscoped().create(vineyard=v, name="B1", geom=geom)
    return client, org, block


@override_settings(VISUAL_CROSSING_API_KEY="")
def test_forecast_weather_unavailable_without_key(auth_client, make_org, make_membership):
    client, org, block = _setup(auth_client, make_org, make_membership)
    resp = client.get(
        f"/api/spray/orgs/{org.id}/blocks/{block.id}/forecast-weather"
    )
    assert resp.status_code == 200
    assert resp.data["available"] is False
    assert resp.data["days"] == []


@override_settings(VISUAL_CROSSING_API_KEY="test-key")
@responses.activate
def test_forecast_weather_returns_days(auth_client, make_org, make_membership):
    client, org, block = _setup(auth_client, make_org, make_membership)
    from datetime import datetime, timedelta, timezone

    base = datetime.now(tz=timezone.utc).replace(hour=0, minute=0, second=0, microsecond=0)
    hours = [
        {
            "datetimeEpoch": int((base + timedelta(hours=h)).timestamp()),
            "temp": 18.0,
            "windspeed": 12.0,
            "precip": 0.0,
            "precipprob": 5.0,
        }
        for h in range(8)
    ]
    responses.add(
        responses.GET,
        responses.matchers.re.compile(r"https://weather\.visualcrossing\.com/.*"),
        json={"days": [{"hours": hours}]},
        status=200,
    )
    resp = client.get(
        f"/api/spray/orgs/{org.id}/blocks/{block.id}/forecast-weather"
    )
    assert resp.status_code == 200
    assert resp.data["available"] is True
    assert len(resp.data["days"]) == 7
    assert resp.data["days"][0]["temp_max_f"] is not None
