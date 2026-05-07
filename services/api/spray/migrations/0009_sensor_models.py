"""M1.5 PR-D: Sensor connectors — IntegrationConnection, SensorStation,
SensorStationBlock, SensorReading, OAuthState (SA-2).

RLS:
- IntegrationConnection scopes by `org_id` directly (one-hop).
- SensorStation scopes by `connection.org_id`.
- SensorReading scopes by `station.connection.org_id`.
- SensorStationBlock + OAuthState rely on app-layer + parent-row RLS;
  the through-table is reachable only via station/block (both protected),
  and OAuthState is the OAuth handshake link itself with no org context
  pre-callback (HMAC-signed state binds to org_id).
"""

from __future__ import annotations

import uuid

from django.db import migrations, models


RLS_FORWARD_SQL = """
ALTER TABLE spray_integrationconnection ENABLE ROW LEVEL SECURITY;
ALTER TABLE spray_integrationconnection FORCE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS integrationconnection_org_isolation ON spray_integrationconnection;
CREATE POLICY integrationconnection_org_isolation ON spray_integrationconnection
    USING (org_id::text = current_setting('app.current_org_id', true))
    WITH CHECK (org_id::text = current_setting('app.current_org_id', true));

ALTER TABLE spray_sensorstation ENABLE ROW LEVEL SECURITY;
ALTER TABLE spray_sensorstation FORCE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS sensorstation_org_isolation ON spray_sensorstation;
CREATE POLICY sensorstation_org_isolation ON spray_sensorstation
    USING (
        (
            SELECT ic.org_id
            FROM spray_integrationconnection ic
            WHERE ic.id = connection_id
        )::text = current_setting('app.current_org_id', true)
    )
    WITH CHECK (
        (
            SELECT ic.org_id
            FROM spray_integrationconnection ic
            WHERE ic.id = connection_id
        )::text = current_setting('app.current_org_id', true)
    );

ALTER TABLE spray_sensorreading ENABLE ROW LEVEL SECURITY;
ALTER TABLE spray_sensorreading FORCE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS sensorreading_org_isolation ON spray_sensorreading;
CREATE POLICY sensorreading_org_isolation ON spray_sensorreading
    USING (
        (
            SELECT ic.org_id
            FROM spray_integrationconnection ic
            JOIN spray_sensorstation ss ON ss.connection_id = ic.id
            WHERE ss.id = station_id
        )::text = current_setting('app.current_org_id', true)
    )
    WITH CHECK (
        (
            SELECT ic.org_id
            FROM spray_integrationconnection ic
            JOIN spray_sensorstation ss ON ss.connection_id = ic.id
            WHERE ss.id = station_id
        )::text = current_setting('app.current_org_id', true)
    );
"""

RLS_REVERSE_SQL = """
DROP POLICY IF EXISTS sensorreading_org_isolation ON spray_sensorreading;
ALTER TABLE spray_sensorreading NO FORCE ROW LEVEL SECURITY;
ALTER TABLE spray_sensorreading DISABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS sensorstation_org_isolation ON spray_sensorstation;
ALTER TABLE spray_sensorstation NO FORCE ROW LEVEL SECURITY;
ALTER TABLE spray_sensorstation DISABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS integrationconnection_org_isolation ON spray_integrationconnection;
ALTER TABLE spray_integrationconnection NO FORCE ROW LEVEL SECURITY;
ALTER TABLE spray_integrationconnection DISABLE ROW LEVEL SECURITY;
"""


def _apply_rls_forward(apps, schema_editor):
    if schema_editor.connection.vendor != "postgresql":
        return
    schema_editor.execute(RLS_FORWARD_SQL)


def _apply_rls_reverse(apps, schema_editor):
    if schema_editor.connection.vendor != "postgresql":
        return
    schema_editor.execute(RLS_REVERSE_SQL)


class Migration(migrations.Migration):
    dependencies = [
        ("spray", "0008_aggregation_models"),
    ]

    operations = [
        migrations.CreateModel(
            name="IntegrationConnection",
            fields=[
                (
                    "id",
                    models.UUIDField(
                        default=uuid.uuid4,
                        editable=False,
                        primary_key=True,
                        serialize=False,
                    ),
                ),
                (
                    "vendor",
                    models.CharField(
                        choices=[
                            ("pessl", "Pessl FieldClimate"),
                            ("davis", "Davis WeatherLink"),
                            ("meter", "METER ZENTRA"),
                            ("sencrop", "Sencrop"),
                        ],
                        max_length=20,
                    ),
                ),
                ("vendor_account_id", models.CharField(max_length=120)),
                ("token_ciphertext", models.BinaryField()),
                (
                    "status",
                    models.CharField(
                        choices=[
                            ("active", "Active"),
                            ("needs_reauth", "Needs reauth"),
                            ("disconnected", "Disconnected"),
                        ],
                        default="active",
                        max_length=20,
                    ),
                ),
                ("connected_at", models.DateTimeField(auto_now_add=True)),
                ("disconnected_at", models.DateTimeField(blank=True, null=True)),
                ("last_health_at", models.DateTimeField(blank=True, null=True)),
                ("last_health_detail", models.CharField(blank=True, max_length=200)),
                (
                    "org",
                    models.ForeignKey(
                        on_delete=models.deletion.CASCADE,
                        related_name="integration_connections",
                        to="spray.org",
                    ),
                ),
            ],
            options={
                "constraints": [
                    models.UniqueConstraint(
                        fields=("org", "vendor", "vendor_account_id"),
                        name="unique_org_vendor_account",
                    ),
                ],
                "indexes": [
                    models.Index(
                        fields=["org", "vendor", "status"],
                        name="spray_ic_org_vendor_status_idx",
                    ),
                    models.Index(
                        fields=["status", "-connected_at"],
                        name="spray_ic_status_connectedat_idx",
                    ),
                ],
            },
        ),
        migrations.CreateModel(
            name="SensorStation",
            fields=[
                (
                    "id",
                    models.UUIDField(
                        default=uuid.uuid4,
                        editable=False,
                        primary_key=True,
                        serialize=False,
                    ),
                ),
                ("vendor_station_id", models.CharField(max_length=120)),
                ("name", models.CharField(blank=True, max_length=200)),
                (
                    "lat",
                    models.DecimalField(
                        blank=True, decimal_places=6, max_digits=9, null=True
                    ),
                ),
                (
                    "lon",
                    models.DecimalField(
                        blank=True, decimal_places=6, max_digits=9, null=True
                    ),
                ),
                ("last_seen_at", models.DateTimeField(blank=True, null=True)),
                ("created_at", models.DateTimeField(auto_now_add=True)),
                ("archived_at", models.DateTimeField(blank=True, null=True)),
                (
                    "connection",
                    models.ForeignKey(
                        on_delete=models.deletion.CASCADE,
                        related_name="stations",
                        to="spray.integrationconnection",
                    ),
                ),
            ],
            options={
                "constraints": [
                    models.UniqueConstraint(
                        fields=("connection", "vendor_station_id"),
                        name="unique_connection_vendor_station",
                    ),
                ],
                "indexes": [
                    models.Index(
                        fields=["connection", "-last_seen_at"],
                        name="spray_ss_conn_lastseen_idx",
                    ),
                ],
            },
        ),
        migrations.CreateModel(
            name="SensorStationBlock",
            fields=[
                (
                    "id",
                    models.UUIDField(
                        default=uuid.uuid4,
                        editable=False,
                        primary_key=True,
                        serialize=False,
                    ),
                ),
                ("linked_at", models.DateTimeField(auto_now_add=True)),
                (
                    "block",
                    models.ForeignKey(
                        on_delete=models.deletion.CASCADE,
                        to="spray.block",
                    ),
                ),
                (
                    "linked_by",
                    models.ForeignKey(
                        blank=True,
                        null=True,
                        on_delete=models.deletion.SET_NULL,
                        to="spray.user",
                    ),
                ),
                (
                    "station",
                    models.ForeignKey(
                        on_delete=models.deletion.CASCADE,
                        to="spray.sensorstation",
                    ),
                ),
            ],
            options={
                "constraints": [
                    models.UniqueConstraint(
                        fields=("station", "block"),
                        name="unique_station_block_link",
                    ),
                ],
            },
        ),
        migrations.AddField(
            model_name="sensorstation",
            name="linked_blocks",
            field=models.ManyToManyField(
                blank=True,
                related_name="sensor_stations",
                through="spray.SensorStationBlock",
                to="spray.block",
            ),
        ),
        migrations.CreateModel(
            name="SensorReading",
            fields=[
                (
                    "id",
                    models.UUIDField(
                        default=uuid.uuid4,
                        editable=False,
                        primary_key=True,
                        serialize=False,
                    ),
                ),
                ("ts", models.DateTimeField()),
                (
                    "air_temp_c",
                    models.DecimalField(
                        blank=True, decimal_places=2, max_digits=5, null=True
                    ),
                ),
                (
                    "rh_pct",
                    models.DecimalField(
                        blank=True, decimal_places=2, max_digits=5, null=True
                    ),
                ),
                (
                    "leaf_wetness_min",
                    models.DecimalField(
                        blank=True, decimal_places=1, max_digits=5, null=True
                    ),
                ),
                (
                    "precip_mm",
                    models.DecimalField(
                        blank=True, decimal_places=2, max_digits=6, null=True
                    ),
                ),
                (
                    "wind_speed_ms",
                    models.DecimalField(
                        blank=True, decimal_places=2, max_digits=5, null=True
                    ),
                ),
                (
                    "quality_flag",
                    models.CharField(
                        choices=[
                            ("ok", "OK"),
                            ("estimated", "Estimated"),
                            ("gap_filled", "Gap-filled"),
                            ("stale", "Stale"),
                            ("bad", "Bad"),
                        ],
                        default="ok",
                        max_length=20,
                    ),
                ),
                ("created_at", models.DateTimeField(auto_now_add=True)),
                (
                    "station",
                    models.ForeignKey(
                        on_delete=models.deletion.CASCADE,
                        related_name="readings",
                        to="spray.sensorstation",
                    ),
                ),
            ],
            options={
                "constraints": [
                    models.UniqueConstraint(
                        fields=("station", "ts"),
                        name="unique_station_ts_reading",
                    ),
                ],
                "indexes": [
                    models.Index(
                        fields=["station", "-ts"],
                        name="spray_sr_station_ts_idx",
                    ),
                    models.Index(
                        fields=["quality_flag", "-ts"],
                        name="spray_sr_quality_ts_idx",
                    ),
                ],
            },
        ),
        migrations.CreateModel(
            name="OAuthState",
            fields=[
                (
                    "id",
                    models.UUIDField(
                        default=uuid.uuid4,
                        editable=False,
                        primary_key=True,
                        serialize=False,
                    ),
                ),
                ("state", models.CharField(max_length=128, unique=True)),
                ("vendor", models.CharField(max_length=20)),
                ("redirect_after", models.CharField(blank=True, max_length=400)),
                ("created_at", models.DateTimeField(auto_now_add=True)),
                ("consumed_at", models.DateTimeField(blank=True, null=True)),
                ("expires_at", models.DateTimeField()),
                (
                    "org",
                    models.ForeignKey(
                        on_delete=models.deletion.CASCADE,
                        related_name="oauth_states",
                        to="spray.org",
                    ),
                ),
            ],
            options={
                "indexes": [
                    models.Index(
                        fields=["expires_at"],
                        name="spray_oauth_expires_idx",
                    ),
                    models.Index(
                        fields=["org", "vendor"],
                        name="spray_oauth_org_vendor_idx",
                    ),
                ],
            },
        ),
        migrations.RunPython(_apply_rls_forward, _apply_rls_reverse),
    ]
