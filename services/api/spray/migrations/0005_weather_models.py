"""M0-06 step 3: WeatherStation + WeatherObservation + ExternalRiskIndex.

Also seeds initial regional-default WeatherStation rows for the supported
AVA clusters (Napa, Sonoma) using Visual Crossing as the provider. Other
regions get placeholder stations so the per-region dispatch always has a
target; concrete provider configs land in M0-06a.
"""

from __future__ import annotations

import uuid

import django.contrib.gis.db.models.fields
from django.db import migrations, models


def _seed_regional_defaults(apps, schema_editor):
    """Create one regional-default Visual Crossing station per region."""
    if schema_editor.connection.vendor != "postgresql":
        return
    WeatherStation = apps.get_model("spray", "WeatherStation")
    from django.contrib.gis.geos import Point

    seeds = [
        # (region, name, lat, lon)
        ("napa", "Napa AVA centroid", 38.30, -122.31),
        ("sonoma", "Sonoma AVA centroid", 38.57, -122.79),
        ("burgundy", "Burgundy regional default", 47.05, 4.83),
        ("bordeaux", "Bordeaux regional default", 44.84, -0.58),
        ("mendoza", "Mendoza regional default", -32.89, -68.84),
        ("other", "Default fallback (no concrete coverage)", 38.30, -122.31),
    ]
    for region, name, lat, lon in seeds:
        WeatherStation.objects.get_or_create(
            provider="visual_crossing",
            station_id=f"vc-region-{region}",
            defaults={
                "region": region,
                "name": name,
                "location": Point(lon, lat, srid=4326),
                "is_regional_default": True,
            },
        )


def _unseed_regional_defaults(apps, schema_editor):
    if schema_editor.connection.vendor != "postgresql":
        return
    WeatherStation = apps.get_model("spray", "WeatherStation")
    WeatherStation.objects.filter(
        provider="visual_crossing",
        station_id__startswith="vc-region-",
        is_regional_default=True,
    ).delete()


class Migration(migrations.Migration):
    dependencies = [
        ("spray", "0004_datalakeevent_forwarded_at"),
    ]

    operations = [
        migrations.CreateModel(
            name="WeatherStation",
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
                ("provider", models.CharField(max_length=40)),
                ("station_id", models.CharField(max_length=120)),
                ("name", models.CharField(blank=True, max_length=200)),
                (
                    "location",
                    django.contrib.gis.db.models.fields.PointField(srid=4326),
                ),
                ("is_regional_default", models.BooleanField(default=False)),
                (
                    "region",
                    models.CharField(
                        choices=[
                            ("napa", "Napa"),
                            ("sonoma", "Sonoma"),
                            ("burgundy", "Burgundy"),
                            ("bordeaux", "Bordeaux"),
                            ("mendoza", "Mendoza"),
                            ("other", "Other"),
                        ],
                        default="other",
                        max_length=20,
                    ),
                ),
                ("settings", models.JSONField(blank=True, default=dict)),
                ("created_at", models.DateTimeField(auto_now_add=True)),
                ("last_pull_at", models.DateTimeField(blank=True, null=True)),
                (
                    "org",
                    models.ForeignKey(
                        blank=True,
                        null=True,
                        on_delete=models.deletion.SET_NULL,
                        related_name="weather_stations",
                        to="spray.org",
                    ),
                ),
            ],
            options={
                "constraints": [
                    models.UniqueConstraint(
                        fields=("provider", "station_id"),
                        name="unique_provider_station",
                    ),
                ],
                "indexes": [
                    models.Index(fields=["org"], name="spray_ws_org_idx"),
                    models.Index(
                        fields=["region", "is_regional_default"],
                        name="spray_ws_region_default_idx",
                    ),
                ],
            },
        ),
        migrations.CreateModel(
            name="WeatherObservation",
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
                    "temp_c",
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
                        blank=True, decimal_places=2, max_digits=5, null=True
                    ),
                ),
                (
                    "wind_speed_ms",
                    models.DecimalField(
                        blank=True, decimal_places=2, max_digits=6, null=True
                    ),
                ),
                (
                    "precip_mm",
                    models.DecimalField(
                        blank=True, decimal_places=2, max_digits=7, null=True
                    ),
                ),
                ("is_forecast", models.BooleanField(default=False)),
                ("raw", models.JSONField(blank=True, default=dict)),
                (
                    "station",
                    models.ForeignKey(
                        on_delete=models.deletion.CASCADE,
                        related_name="observations",
                        to="spray.weatherstation",
                    ),
                ),
            ],
            options={
                "constraints": [
                    models.UniqueConstraint(
                        fields=("station", "ts"), name="unique_station_ts"
                    ),
                ],
                "indexes": [
                    models.Index(
                        fields=["station", "-ts"], name="spray_wo_station_ts_desc_idx"
                    ),
                ],
            },
        ),
        migrations.CreateModel(
            name="ExternalRiskIndex",
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
                ("region", models.CharField(max_length=40)),
                (
                    "source",
                    models.CharField(
                        choices=[
                            ("uc_ipm_grape_pm", "UC IPM Grape PM RAI"),
                            ("uspest_grape_pm", "uspest.org Grape PM"),
                        ],
                        max_length=40,
                    ),
                ),
                (
                    "risk_index_value",
                    models.DecimalField(
                        blank=True, decimal_places=2, max_digits=6, null=True
                    ),
                ),
                (
                    "risk_level",
                    models.CharField(
                        choices=[
                            ("low", "Low"),
                            ("moderate", "Moderate"),
                            ("high", "High"),
                        ],
                        default="low",
                        max_length=10,
                    ),
                ),
                ("pulled_at", models.DateTimeField(auto_now_add=True)),
                (
                    "pulled_at_hour",
                    models.DateTimeField(
                        help_text="pulled_at truncated to the hour; primary dedup field."
                    ),
                ),
                ("raw_payload", models.JSONField(blank=True, default=dict)),
            ],
            options={
                "constraints": [
                    models.UniqueConstraint(
                        fields=("region", "source", "pulled_at_hour"),
                        name="unique_region_source_hour",
                    ),
                ],
                "indexes": [
                    models.Index(
                        fields=["region", "source", "-pulled_at_hour"],
                        name="spray_eri_lookup_idx",
                    ),
                    models.Index(fields=["pulled_at"], name="spray_eri_pulled_idx"),
                ],
            },
        ),
        migrations.RunPython(_seed_regional_defaults, _unseed_regional_defaults),
    ]
