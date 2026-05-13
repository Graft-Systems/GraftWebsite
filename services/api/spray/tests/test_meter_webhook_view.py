"""METER webhook view tests (M1.5 PR-E step 8).

End-to-end through the Django view: HMAC validation, payload routing
to the right SensorStation, idempotent upsert, lake event emission.
"""

from __future__ import annotations

import json

import pytest
from cryptography.fernet import Fernet
from django.contrib.gis.geos import Point, Polygon
from django.test import Client, override_settings

from spray.connectors import credentials
from spray.connectors.sensors.meter.webhook import compute_signature
from spray.models import (
    Block,
    DataLakeEvent,
    IntegrationConnection,
    Org,
    SensorReading,
    SensorStation,
    Vineyard,
)


pytestmark = pytest.mark.django_db
TEST_KEY = Fernet.generate_key().decode()
WEBHOOK_PATH = "/api/spray/integrations/meter/webhook"
SECRET = "test-meter-webhook-secret-x" * 2  # fixed for predictable HMAC


def _build_meter_setup():
    org = Org.objects.create(name="P", region="napa")
    v = Vineyard.objects.create(
        org=org, name="V", region="napa", centroid=Point(-122.3, 38.3, srid=4326)
    )
    poly = Polygon(
        ((-122.3, 38.3), (-122.3, 38.4), (-122.2, 38.4), (-122.2, 38.3), (-122.3, 38.3)),
        srid=4326,
    )
    block = Block.objects.create(vineyard=v, name="B", geom=poly, variety="cab")
    with override_settings(SPRAY_INTEGRATION_FERNET_KEY=TEST_KEY):
        ct = credentials.encrypt_token_blob(
            {"token": "T", "webhook_secret": SECRET}
        )
    conn = IntegrationConnection.objects.create(
        org=org,
        vendor=IntegrationConnection.Vendor.METER,
        vendor_account_id="acct-1",
        token_ciphertext=ct,
    )
    station = SensorStation.objects.create(
        connection=conn,
        vendor_station_id="z6-12345",
        name="North",
    )
    return org, conn, station, block


def _push_payload():
    return {
        "device": {"device_sn": "z6-12345"},
        "readings": [
            {
                "datetime": "2026-05-07T03:00:00Z",
                "measurements": [
                    {"name": "Air Temperature", "value": 18.4},
                    {"name": "Relative Humidity", "value": 88},
                ],
            },
            {
                "datetime": "2026-05-07T04:00:00Z",
                "measurements": [
                    {"name": "Air Temperature", "value": 19.1},
                ],
            },
        ],
    }


def _post_signed(client, body_dict, secret=SECRET):
    """Form-encode `body_dict` and sign the raw body."""
    from urllib.parse import urlencode

    data_json = json.dumps(body_dict)
    body_str = urlencode({"data": data_json})
    body_bytes = body_str.encode()
    sig = compute_signature(secret, body_bytes)
    return client.post(
        WEBHOOK_PATH,
        data=body_bytes,
        content_type="application/x-www-form-urlencoded",
        HTTP_X_MET_SIGNATURE=sig,
    )


@override_settings(SPRAY_INTEGRATION_FERNET_KEY=TEST_KEY)
def test_webhook_happy_path_persists_and_emits():
    org, _conn, station, _block = _build_meter_setup()
    client = Client()
    resp = _post_signed(client, _push_payload())
    assert resp.status_code == 202
    body = resp.json()
    assert body["reading_count"] == 2
    assert SensorReading.objects.unscoped().filter(station=station).count() == 2
    station.refresh_from_db()
    assert station.last_seen_at is not None
    # One reading_pulled per row + one webhook_received.
    assert (
        DataLakeEvent.objects.for_org(org)
        .filter(category="sensor.reading_pulled")
        .count()
        == 2
    )
    assert (
        DataLakeEvent.objects.for_org(org)
        .filter(category="sensor.webhook_received")
        .count()
        == 1
    )


@override_settings(SPRAY_INTEGRATION_FERNET_KEY=TEST_KEY)
def test_webhook_rejects_missing_signature():
    _build_meter_setup()
    client = Client()
    from urllib.parse import urlencode

    body = urlencode({"data": json.dumps(_push_payload())}).encode()
    resp = client.post(
        WEBHOOK_PATH,
        data=body,
        content_type="application/x-www-form-urlencoded",
    )
    assert resp.status_code == 400


@override_settings(SPRAY_INTEGRATION_FERNET_KEY=TEST_KEY)
def test_webhook_rejects_bad_signature():
    _build_meter_setup()
    client = Client()
    resp = _post_signed(client, _push_payload(), secret="wrong-secret")
    assert resp.status_code == 401
    assert SensorReading.objects.unscoped().count() == 0


@override_settings(SPRAY_INTEGRATION_FERNET_KEY=TEST_KEY)
def test_webhook_rejects_unknown_device():
    _build_meter_setup()
    client = Client()
    payload = _push_payload()
    payload["device"]["device_sn"] = "z6-not-ours"
    resp = _post_signed(client, payload)
    assert resp.status_code == 401
    assert SensorReading.objects.unscoped().count() == 0


@override_settings(SPRAY_INTEGRATION_FERNET_KEY=TEST_KEY)
def test_webhook_idempotent_on_replay():
    _org, _conn, station, _block = _build_meter_setup()
    client = Client()
    _post_signed(client, _push_payload())
    _post_signed(client, _push_payload())
    # Same (station, ts) keys upserted; row count unchanged.
    assert SensorReading.objects.unscoped().filter(station=station).count() == 2


@override_settings(SPRAY_INTEGRATION_FERNET_KEY=TEST_KEY)
def test_webhook_skips_disconnected_connection():
    _org, conn, _station, _block = _build_meter_setup()
    conn.status = IntegrationConnection.Status.DISCONNECTED
    conn.save(update_fields=["status"])
    client = Client()
    resp = _post_signed(client, _push_payload())
    # Disconnected connection's station is filtered out → 401 (constant
    # reject shape across "doesn't exist" + "disconnected").
    assert resp.status_code == 401
