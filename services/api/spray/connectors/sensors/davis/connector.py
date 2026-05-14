"""Davis SensorConnector implementation (M1.5 PR-E).

Wraps `client.DavisClient` + `normalizer.normalize_historic_response`
behind the vendor-agnostic `SensorConnector` Protocol.
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
from spray.connectors.sensors.davis.client import DavisClient, is_davis_public_demo_station_id
from spray.connectors.sensors.davis.normalizer import (
    normalize_historic_response,
)


logger = logging.getLogger(__name__)


@register("davis")
class DavisConnector(SensorConnector):
    VENDOR_SLUG = "davis"

    def list_stations(self, connection) -> list[VendorStation]:
        client = self._client_for(connection, station_id=None)
        try:
            stations = client.list_stations()
        except ConnectorAuthError:
            self._mark_needs_reauth(connection)
            raise

        out: list[VendorStation] = []
        for s in stations:
            if not isinstance(s, dict):
                continue
            sid = str(s.get("station_id") or s.get("station_id_uuid") or "")
            if not sid:
                continue
            out.append(
                VendorStation(
                    vendor_station_id=sid,
                    name=str(s.get("station_name") or s.get("name") or sid),
                    lat=_safe_float(s.get("latitude")),
                    lon=_safe_float(s.get("longitude")),
                )
            )
        return out

    def fetch_readings(self, connection, station, since: datetime) -> list:
        from spray.models import SensorReading

        client = self._client_for(connection, station.vendor_station_id)
        try:
            payload = client.fetch_historic(
                station_id=station.vendor_station_id, since=since
            )
        except ConnectorAuthError:
            self._mark_needs_reauth(connection)
            raise

        rows = normalize_historic_response(payload)
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
            client = self._client_for(connection, station_id=None)
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

    def _client_for(
        self, connection, station_id: str | None
    ) -> DavisClient:
        creds = credentials.decrypt_token_blob(connection.token_ciphertext)
        demo = bool(is_davis_public_demo_station_id(station_id))
        if demo:
            return DavisClient(creds=creds, demo_mode=True)
        return DavisClient(creds=creds)

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
