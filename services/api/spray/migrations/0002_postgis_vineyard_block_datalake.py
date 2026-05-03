"""M0-03 step 5: PostGIS extension + Vineyard / Block / DataLakeEvent.

Idempotent on extension creation (`IF NOT EXISTS`). The reverse migration
keeps the extensions in place; PostGIS extension drops can cascade-delete
spatial columns elsewhere in the database, which we never want as a
rollback effect.
"""

from __future__ import annotations

import uuid

import django.contrib.gis.db.models.fields
from django.db import migrations, models


def _create_postgis_forwards(apps, schema_editor):
    if schema_editor.connection.vendor != "postgresql":
        # SQLite test sandboxes etc. — nothing to do.
        return
    with schema_editor.connection.cursor() as cursor:
        cursor.execute("CREATE EXTENSION IF NOT EXISTS postgis;")
        cursor.execute("CREATE EXTENSION IF NOT EXISTS postgis_topology;")


def _create_postgis_reverse(apps, schema_editor):
    # Intentional no-op: dropping postgis can cascade-drop spatial columns
    # outside this app and is rarely the right move during a rollback.
    return


class Migration(migrations.Migration):
    dependencies = [
        ("spray", "0001_initial"),
    ]

    operations = [
        migrations.RunPython(_create_postgis_forwards, _create_postgis_reverse),
        migrations.CreateModel(
            name="Vineyard",
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
                ("name", models.CharField(max_length=200)),
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
                ("address", models.CharField(blank=True, max_length=400)),
                (
                    "centroid",
                    django.contrib.gis.db.models.fields.PointField(
                        blank=True, null=True, srid=4326
                    ),
                ),
                ("settings", models.JSONField(blank=True, default=dict)),
                ("created_at", models.DateTimeField(auto_now_add=True)),
                ("archived_at", models.DateTimeField(blank=True, null=True)),
                (
                    "org",
                    models.ForeignKey(
                        on_delete=models.deletion.CASCADE,
                        related_name="vineyards",
                        to="spray.org",
                    ),
                ),
            ],
            options={
                "indexes": [
                    models.Index(fields=["org"], name="spray_viney_org_id_idx"),
                    models.Index(
                        fields=["created_at"], name="spray_viney_created_idx"
                    ),
                ],
            },
        ),
        migrations.CreateModel(
            name="Block",
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
                ("name", models.CharField(max_length=120)),
                (
                    "geom",
                    django.contrib.gis.db.models.fields.PolygonField(srid=4326),
                ),
                ("variety", models.CharField(blank=True, max_length=80)),
                ("training_system", models.CharField(blank=True, max_length=80)),
                (
                    "row_spacing_m",
                    models.DecimalField(
                        blank=True, decimal_places=2, max_digits=4, null=True
                    ),
                ),
                ("settings", models.JSONField(blank=True, default=dict)),
                ("created_at", models.DateTimeField(auto_now_add=True)),
                ("archived_at", models.DateTimeField(blank=True, null=True)),
                (
                    "vineyard",
                    models.ForeignKey(
                        on_delete=models.deletion.CASCADE,
                        related_name="blocks",
                        to="spray.vineyard",
                    ),
                ),
            ],
            options={
                "indexes": [
                    models.Index(fields=["vineyard"], name="spray_block_viney_idx"),
                    models.Index(fields=["created_at"], name="spray_block_created_idx"),
                ],
            },
        ),
        migrations.CreateModel(
            name="DataLakeEvent",
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
                ("category", models.CharField(max_length=80)),
                ("schema_version", models.CharField(max_length=20)),
                ("payload", models.JSONField(blank=True, default=dict)),
                ("created_at", models.DateTimeField(auto_now_add=True)),
                (
                    "org",
                    models.ForeignKey(
                        blank=True,
                        null=True,
                        on_delete=models.deletion.SET_NULL,
                        related_name="data_lake_events",
                        to="spray.org",
                    ),
                ),
                (
                    "user",
                    models.ForeignKey(
                        blank=True,
                        null=True,
                        on_delete=models.deletion.SET_NULL,
                        related_name="data_lake_events",
                        to="spray.user",
                    ),
                ),
            ],
            options={
                "indexes": [
                    models.Index(
                        fields=["org", "category", "created_at"],
                        name="spray_dle_org_cat_idx",
                    ),
                    models.Index(fields=["created_at"], name="spray_dle_created_idx"),
                ],
            },
        ),
        # GIST indexes on spatial columns. Django's gis Index helpers exist
        # but have rough edges across Django 5.x; raw SQL is the path of
        # least surprise.
        migrations.RunSQL(
            sql=[
                "CREATE INDEX IF NOT EXISTS vineyard_centroid_gist "
                "ON spray_vineyard USING GIST (centroid);",
                "CREATE INDEX IF NOT EXISTS block_geom_gist "
                "ON spray_block USING GIST (geom);",
            ],
            reverse_sql=[
                "DROP INDEX IF EXISTS block_geom_gist;",
                "DROP INDEX IF EXISTS vineyard_centroid_gist;",
            ],
        ),
    ]
