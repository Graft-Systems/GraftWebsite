"""Block verdict job — guards against publishing low-signal verdicts."""

from __future__ import annotations

from datetime import datetime, timezone
from unittest.mock import patch

import pytest
from django.contrib.gis.geos import Polygon

from spray.aggregation.block_verdict_job import execute_compute_block_verdict
from spray.aggregation.runners.base import HourlyObservation, WeatherWindow
from spray.models import Block, Org, Vineyard

pytestmark = pytest.mark.django_db


def _polygon():
    return Polygon(
        ((-122.0, 38.0), (-122.0, 38.01), (-121.99, 38.01), (-121.99, 38.0), (-122.0, 38.0)),
        srid=4326,
    )


@patch("spray.aggregation.block_verdict_job._build_weather_window")
def test_execute_compute_skips_when_few_temperature_hours(mock_bw):
    org = Org.objects.create(name="O", region="napa")
    vineyard = Vineyard.objects.unscoped().create(org=org, name="V")
    block = Block.objects.unscoped().create(
        vineyard=vineyard, name="B1", geom=_polygon()
    )
    vf = datetime(2026, 5, 12, 0, 0, tzinfo=timezone.utc)
    vt = datetime(2026, 5, 12, 23, 59, 59, tzinfo=timezone.utc)
    mock_bw.return_value = WeatherWindow(
        block_id=str(block.id),
        valid_from=vf,
        valid_to=vt,
        observations=[
            HourlyObservation(
                ts=datetime(2026, 5, 12, h, 0, tzinfo=timezone.utc),
                temp_c=None,
                rh_pct=None,
                leaf_wetness_min=None,
                wind_speed_ms=None,
                precip_mm=None,
            )
            for h in range(3)
        ],
    )

    assert execute_compute_block_verdict(str(block.id)) is False
