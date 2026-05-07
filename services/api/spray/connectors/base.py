"""SensorConnector Protocol + shared exceptions (M1.5 PR-D step 3).

Mirrors `spray.providers.base` shape so the worker's retry policy can
target the same exception classes (rate-limit retries with exponential
backoff, auth errors fail fast, response errors retry once).

A `SensorConnector` knows how to:
- list vendor stations bound to a connection
- fetch readings for one station since a watermark
- probe liveness

The connector receives a hydrated `IntegrationConnection` model
instance; it asks `credentials.decrypt_token_blob(connection.token_ciphertext)`
to get the plaintext token blob, then makes its HTTP calls. The
plaintext blob NEVER escapes the connector module.
"""

from __future__ import annotations

from dataclasses import dataclass
from datetime import datetime
from typing import TYPE_CHECKING, Protocol

if TYPE_CHECKING:
    from spray.models import (
        IntegrationConnection,
        SensorReading,
        SensorStation,
    )


# ---------------------------------------------------------------------
# Exceptions (parallel to spray.providers.base)
# ---------------------------------------------------------------------


class ConnectorError(Exception):
    """Base for connector errors."""


class ConnectorRateLimitError(ConnectorError):
    """Vendor returned 429. Worker retries with backoff."""


class ConnectorAuthError(ConnectorError):
    """OAuth token invalid + refresh failed. Mark connection needs_reauth."""


class ConnectorResponseError(ConnectorError):
    """5xx or malformed response. Worker retries once."""


# ---------------------------------------------------------------------
# Lightweight DTOs
# ---------------------------------------------------------------------


@dataclass
class VendorStation:
    """A station as the vendor reports it, before persistence.

    `lat`/`lon` may be `None` if the vendor doesn't return geometry on
    the list endpoint; the connector should still surface the station.
    """

    vendor_station_id: str
    name: str
    lat: float | None
    lon: float | None


@dataclass
class ConnectorHealth:
    ok: bool
    latency_ms: float | None = None
    detail: str = ""


# ---------------------------------------------------------------------
# Protocol
# ---------------------------------------------------------------------


class SensorConnector(Protocol):
    """Vendor-agnostic interface — one implementation per vendor."""

    VENDOR_SLUG: str  # "pessl" | "davis" | ...

    def list_stations(
        self, connection: "IntegrationConnection"
    ) -> list[VendorStation]:
        """List all stations the connection's account can see."""
        ...

    def fetch_readings(
        self,
        connection: "IntegrationConnection",
        station: "SensorStation",
        since: datetime,
    ) -> list["SensorReading"]:
        """Fetch + normalize readings for one station from `since` to now.

        The connector returns unsaved `SensorReading` instances; the
        polling task is responsible for `bulk_create(update_conflicts=True)`.
        """
        ...

    def health(self, connection: "IntegrationConnection") -> ConnectorHealth:
        """Liveness probe. Should NOT raise; returns ok=False on failure."""
        ...
