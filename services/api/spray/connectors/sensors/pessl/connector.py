"""Pessl SensorConnector implementation (M1.5 PR-D step 6).

Wraps `client.PesslClient` + `normalizer.normalize_data_response` behind
the vendor-agnostic `SensorConnector` Protocol so the polling task and
registry don't import vendor-specific details.

Token-rotation contract: every call accepts a hydrated
`IntegrationConnection`; the client's `on_token_refresh` callback writes
the new ciphertext back via `credentials.encrypt_token_blob` in a single
DB save. If refresh itself fails, the connector raises
`ConnectorAuthError` and the caller marks `status="needs_reauth"`.
"""

from __future__ import annotations

import logging
import time
from datetime import datetime
from typing import Any

from django.db import transaction

from spray.connectors import credentials
from spray.connectors.base import (
    ConnectorAuthError,
    ConnectorHealth,
    SensorConnector,
    VendorStation,
)
from spray.connectors.registry import register
from spray.connectors.sensors.pessl.client import PesslClient
from spray.connectors.sensors.pessl.normalizer import normalize_data_response


logger = logging.getLogger(__name__)


@register("pessl")
class PesslConnector(SensorConnector):
    VENDOR_SLUG = "pessl"

    def list_stations(self, connection) -> list[VendorStation]:
        client = self._client_for(connection)
        try:
            payload = client.list_stations()
        except ConnectorAuthError:
            self._mark_needs_reauth(connection)
            raise

        out: list[VendorStation] = []
        if not isinstance(payload, list):
            return out
        for entry in payload:
            if not isinstance(entry, dict):
                continue
            vsid = str(entry.get("name") or entry.get("station_id") or entry.get("id") or "")
            if not vsid:
                continue
            display = (
                entry.get("info", {}).get("custom_name")
                if isinstance(entry.get("info"), dict)
                else None
            ) or entry.get("name") or vsid
            position = entry.get("position") or entry.get("location") or {}
            lat = lon = None
            if isinstance(position, dict):
                geo = position.get("geo") or position
                if isinstance(geo, dict):
                    lat = _safe_float(geo.get("lat") or geo.get("latitude"))
                    lon = _safe_float(geo.get("lon") or geo.get("lng") or geo.get("longitude"))
            out.append(
                VendorStation(
                    vendor_station_id=vsid, name=str(display), lat=lat, lon=lon
                )
            )
        return out

    def fetch_readings(self, connection, station, since: datetime) -> list:
        # Return SensorReading instances (unsaved); caller bulk_creates.
        from spray.models import SensorReading

        client = self._client_for(connection)
        try:
            payload = client.fetch_raw_data(
                vendor_station_id=station.vendor_station_id, since=since
            )
        except ConnectorAuthError:
            self._mark_needs_reauth(connection)
            raise

        rows = normalize_data_response(payload)
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

    def _client_for(self, connection) -> PesslClient:
        token_blob = credentials.decrypt_token_blob(connection.token_ciphertext)

        def _persist_refreshed(new_blob: dict[str, Any]) -> None:
            with transaction.atomic():
                connection.token_ciphertext = credentials.encrypt_token_blob(new_blob)
                connection.save(update_fields=["token_ciphertext"])

        return PesslClient(token_blob=token_blob, on_token_refresh=_persist_refreshed)

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
