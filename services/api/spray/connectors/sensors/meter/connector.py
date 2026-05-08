"""METER SensorConnector implementation (M1.5 PR-E).

Polling adapter — gap-fill only. Real-time data flows through the
webhook receiver in `webhook.py`.
"""

from __future__ import annotations

import logging
import time
from datetime import datetime
from typing import Any

from spray.connectors import credentials
from spray.connectors.base import (
    ConnectorAuthError,
    ConnectorHealth,
    SensorConnector,
    VendorStation,
)
from spray.connectors.registry import register
from spray.connectors.sensors.meter.client import MeterClient
from spray.connectors.sensors.meter.normalizer import normalize_poll_response


logger = logging.getLogger(__name__)


@register("meter")
class MeterConnector(SensorConnector):
    VENDOR_SLUG = "meter"

    def list_stations(self, connection) -> list[VendorStation]:
        client = self._client_for(connection)
        try:
            devices = client.list_devices()
        except ConnectorAuthError:
            self._mark_needs_reauth(connection)
            raise

        out: list[VendorStation] = []
        for d in devices:
            if not isinstance(d, dict):
                continue
            sn = str(d.get("device_sn") or d.get("sn") or "")
            if not sn:
                continue
            out.append(
                VendorStation(
                    vendor_station_id=sn,
                    name=str(d.get("device_name") or d.get("name") or sn),
                    lat=_safe_float(d.get("latitude")),
                    lon=_safe_float(d.get("longitude")),
                )
            )
        return out

    def fetch_readings(self, connection, station, since: datetime) -> list:
        from spray.models import SensorReading

        client = self._client_for(connection)
        try:
            payload = client.fetch_readings(
                device_sn=station.vendor_station_id, since=since
            )
        except ConnectorAuthError:
            self._mark_needs_reauth(connection)
            raise

        rows = normalize_poll_response(payload)
        readings: list[SensorReading] = []
        for row in rows:
            ts = row.get("ts")
            if ts is None:
                continue
            readings.append(
                SensorReading(
                    station=station,
                    ts=ts,
                    air_temp_c=row.get("air_temp_c"),
                    rh_pct=row.get("rh_pct"),
                    leaf_wetness_min=row.get("leaf_wetness_min"),
                    precip_mm=row.get("precip_mm"),
                    wind_speed_ms=row.get("wind_speed_ms"),
                    quality_flag=SensorReading.QualityFlag.OK,
                )
            )
        return readings

    def health(self, connection) -> ConnectorHealth:
        start = time.monotonic()
        try:
            client = self._client_for(connection)
            ok, detail = client.health()
        except ConnectorAuthError as exc:
            return ConnectorHealth(ok=False, latency_ms=None, detail=f"auth: {exc}")
        except Exception as exc:  # noqa: BLE001
            return ConnectorHealth(ok=False, latency_ms=None, detail=f"err: {exc}")
        elapsed_ms = round((time.monotonic() - start) * 1000, 1)
        return ConnectorHealth(ok=ok, latency_ms=elapsed_ms, detail=detail)

    # -----------------------------------------------------------------
    # Internals
    # -----------------------------------------------------------------

    def _client_for(self, connection) -> MeterClient:
        creds = credentials.decrypt_token_blob(connection.token_ciphertext)
        return MeterClient(creds=creds)

    @staticmethod
    def _mark_needs_reauth(connection) -> None:
        from spray.models import IntegrationConnection

        connection.status = IntegrationConnection.Status.NEEDS_REAUTH
        connection.save(update_fields=["status"])


def _safe_float(value: Any) -> float | None:
    if value is None:
        return None
    try:
        return float(value)
    except (TypeError, ValueError):
        return None
