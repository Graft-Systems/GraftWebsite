"""Davis SensorConnector wiring (demo station + client selection)."""

from __future__ import annotations

from unittest.mock import MagicMock, patch

import pytest
from django.test import override_settings

from spray.connectors.sensors.davis.client import DAVIS_DEMO_STATION_UUID
from spray.connectors.sensors.davis.connector import DavisConnector


@override_settings(DAVIS_DEMO_MODE=False)
@patch("spray.connectors.sensors.davis.connector.credentials.decrypt_token_blob")
def test_client_for_public_demo_station_forces_demo_mode(mock_decrypt):
    mock_decrypt.return_value = {"api_key": "k", "api_secret": "s"}
    conn = MagicMock()
    c = DavisConnector()
    demo_client = c._client_for(conn, DAVIS_DEMO_STATION_UUID)
    assert demo_client._demo_mode is True
    live_client = c._client_for(conn, "owned-station-uuid")
    assert live_client._demo_mode is False
