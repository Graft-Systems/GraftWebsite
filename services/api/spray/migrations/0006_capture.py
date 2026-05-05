"""M1-09 step 3: Capture model + RLS policy."""

from __future__ import annotations

import uuid

from django.db import migrations, models


CAPTURE_RLS_FORWARD_SQL = """
ALTER TABLE spray_capture ENABLE ROW LEVEL SECURITY;
ALTER TABLE spray_capture FORCE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS capture_org_isolation ON spray_capture;
CREATE POLICY capture_org_isolation ON spray_capture
    USING (
        (
            SELECT v.org_id
            FROM spray_block b
            JOIN spray_vineyard v ON v.id = b.vineyard_id
            WHERE b.id = block_id
        )::text
        = current_setting('app.current_org_id', true)
    )
    WITH CHECK (
        (
            SELECT v.org_id
            FROM spray_block b
            JOIN spray_vineyard v ON v.id = b.vineyard_id
            WHERE b.id = block_id
        )::text
        = current_setting('app.current_org_id', true)
    );
"""

CAPTURE_RLS_REVERSE_SQL = """
DROP POLICY IF EXISTS capture_org_isolation ON spray_capture;
ALTER TABLE spray_capture NO FORCE ROW LEVEL SECURITY;
ALTER TABLE spray_capture DISABLE ROW LEVEL SECURITY;
"""


def _apply_rls_forward(apps, schema_editor):
    if schema_editor.connection.vendor != "postgresql":
        return
    schema_editor.execute(CAPTURE_RLS_FORWARD_SQL)


def _apply_rls_reverse(apps, schema_editor):
    if schema_editor.connection.vendor != "postgresql":
        return
    schema_editor.execute(CAPTURE_RLS_REVERSE_SQL)


class Migration(migrations.Migration):
    dependencies = [
        ("spray", "0005_weather_models"),
    ]

    operations = [
        migrations.CreateModel(
            name="Capture",
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
                    "kind",
                    models.CharField(
                        choices=[("photo", "Photo"), ("video", "Video")],
                        max_length=10,
                    ),
                ),
                ("s3_key", models.CharField(max_length=400, unique=True)),
                ("size_bytes", models.BigIntegerField(blank=True, null=True)),
                ("mime_type", models.CharField(blank=True, max_length=80)),
                (
                    "taken_at",
                    models.DateTimeField(blank=True, db_index=True, null=True),
                ),
                ("uploaded_at", models.DateTimeField(blank=True, null=True)),
                (
                    "status",
                    models.CharField(
                        choices=[
                            ("pending", "Pending"),
                            ("uploaded", "Uploaded"),
                            ("failed", "Failed"),
                        ],
                        default="pending",
                        max_length=10,
                    ),
                ),
                ("created_at", models.DateTimeField(auto_now_add=True)),
                ("archived_at", models.DateTimeField(blank=True, null=True)),
                (
                    "block",
                    models.ForeignKey(
                        on_delete=models.deletion.CASCADE,
                        related_name="captures",
                        to="spray.block",
                    ),
                ),
                (
                    "uploader",
                    models.ForeignKey(
                        blank=True,
                        null=True,
                        on_delete=models.deletion.SET_NULL,
                        related_name="captures",
                        to="spray.user",
                    ),
                ),
            ],
            options={
                "indexes": [
                    models.Index(
                        fields=["block", "-uploaded_at"],
                        name="spray_cap_block_up_desc_idx",
                    ),
                    models.Index(
                        fields=["status", "created_at"],
                        name="spray_cap_status_created_idx",
                    ),
                ],
            },
        ),
        migrations.RunPython(_apply_rls_forward, _apply_rls_reverse),
    ]
