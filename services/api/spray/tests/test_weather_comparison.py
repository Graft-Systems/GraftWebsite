"""GET /blocks/<id>/weather-comparison — historic sensor vs Visual Crossing."""

from __future__ import annotations

from datetime import datetime, timedelta, timezone as dt_timezone
from decimal import Decimal
from unittest.mock import patch

import pytest
from django.contrib.gis.geos import Polygon
from django.utils import timezone as dj_tz

from spray.models import (
    Block,
    IntegrationConnection,
    Membership,
    SensorReading,
    SensorStation,
    Vineyard,
)

pytestmark = pytest.mark.django_db

FIXED_NOW = datetime(2026, 5, 15, 18, 0, 0, tzinfo=dt_timezone.utc)


def _polygon():
    return Polygon(
        (
            (-122.0, 38.0),
            (-122.0, 38.01),
            (-121.99, 38.01),
            (-121.99, 38.0),
            (-122.0, 38.0),
        ),
        srid=4326,
    )


def _fake_vc_days(lat, lon, start, end):
    del lat, lon
    out = []
    cur = start
    while cur <= end:
        out.append({"date": cur.isoformat(), "temp_max_f": 72.0})
        cur += timedelta(days=1)
    return out, None


def test_weather_comparison_vc_and_sensor(auth_client, make_org, make_membership, monkeypatch):
    monkeypatch.setattr(
        "spray.providers.visual_crossing.fetch_daily_weather_window",
        _fake_vc_days,
    )

    client, user = auth_client()
    org = make_org()
    make_membership(user=user, org=org, role=Membership.Role.ADMIN)
    vineyard = Vineyard.objects.create(org=org, name="Estate", region=org.region)
    block = Block.objects.create(vineyard=vineyard, name="North", geom=_polygon())

    conn = IntegrationConnection.objects.create(
        org=org,
        vendor=IntegrationConnection.Vendor.DAVIS,
        vendor_account_id="acct1",
        token_ciphertext=b"\x00\x01",
    )
    station = SensorStation.objects.create(
        connection=conn,
        vendor_station_id="st1",
        name="Field",
    )
    station.linked_blocks.add(block)

    reading_day = FIXED_NOW.date() - timedelta(days=7)
    SensorReading.objects.create(
        station=station,
        ts=dj_tz.make_aware(
            datetime.combine(reading_day, datetime.min.time()),
            dt_timezone.utc,
        ),
        air_temp_c=Decimal("26.67"),
    )

    with patch("django.utils.timezone.now", return_value=FIXED_NOW):
        resp = client.get(
            f"/api/spray/orgs/{org.id}/blocks/{block.id}/weather-comparison?days=14",
        )

    assert resp.status_code == 200, getattr(resp, "data", resp.content)
    rows = resp.data["results"]
    assert len(rows) == 15

    by_date = {r["date"]: r for r in rows}
    mid = by_date[reading_day.isoformat()]
    assert mid["actual_max_f"] == pytest.approx(80.0, rel=1e-3)
    assert mid["virtual_max_f"] == pytest.approx(72.0)
    assert all(r["virtual_max_f"] == 72.0 for r in rows if r["virtual_max_f"] is not None)
