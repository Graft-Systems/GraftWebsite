from __future__ import annotations

import uuid

import django.db.models.deletion
from django.db import migrations, models


RLS_FORWARD_SQL = """
ALTER TABLE spray_sprayrecord ENABLE ROW LEVEL SECURITY;
ALTER TABLE spray_sprayrecord FORCE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS sprayrecord_org_isolation ON spray_sprayrecord;
CREATE POLICY sprayrecord_org_isolation ON spray_sprayrecord
    USING (
        (
            SELECT v.org_id
            FROM spray_block b
            JOIN spray_vineyard v ON v.id = b.vineyard_id
            WHERE b.id = block_id
        )::text = current_setting('app.current_org_id', true)
    )
    WITH CHECK (
        (
            SELECT v.org_id
            FROM spray_block b
            JOIN spray_vineyard v ON v.id = b.vineyard_id
            WHERE b.id = block_id
        )::text = current_setting('app.current_org_id', true)
    );
"""

RLS_REVERSE_SQL = """
DROP POLICY IF EXISTS sprayrecord_org_isolation ON spray_sprayrecord;
ALTER TABLE spray_sprayrecord NO FORCE ROW LEVEL SECURITY;
ALTER TABLE spray_sprayrecord DISABLE ROW LEVEL SECURITY;
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
        ("spray", "0009_sensor_models"),
    ]

    operations = [
        migrations.CreateModel(
            name="SprayRecord",
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
                ("applied_at", models.DateTimeField()),
                ("product", models.CharField(max_length=160)),
                ("rate", models.CharField(blank=True, max_length=80)),
                (
                    "target_disease",
                    models.CharField(
                        choices=[
                            ("powdery", "Powdery mildew"),
                            ("downy", "Downy mildew"),
                            ("both", "Powdery + downy mildew"),
                            ("other", "Other"),
                        ],
                        default="both",
                        max_length=20,
                    ),
                ),
                ("rei_hours", models.PositiveIntegerField(blank=True, null=True)),
                ("phi_days", models.PositiveIntegerField(blank=True, null=True)),
                ("applicator", models.CharField(blank=True, max_length=120)),
                ("notes", models.TextField(blank=True)),
                ("created_at", models.DateTimeField(auto_now_add=True)),
                ("updated_at", models.DateTimeField(auto_now=True)),
                ("archived_at", models.DateTimeField(blank=True, null=True)),
                (
                    "block",
                    models.ForeignKey(
                        on_delete=django.db.models.deletion.CASCADE,
                        related_name="spray_records",
                        to="spray.block",
                    ),
                ),
                (
                    "created_by",
                    models.ForeignKey(
                        blank=True,
                        null=True,
                        on_delete=django.db.models.deletion.SET_NULL,
                        related_name="spray_records",
                        to="spray.user",
                    ),
                ),
                (
                    "verdict",
                    models.ForeignKey(
                        blank=True,
                        null=True,
                        on_delete=django.db.models.deletion.SET_NULL,
                        related_name="spray_records",
                        to="spray.blockverdict",
                    ),
                ),
            ],
            options={
                "indexes": [
                    models.Index(
                        fields=["block", "-applied_at"],
                        name="spray_spray_block_applied_idx",
                    ),
                    models.Index(
                        fields=["target_disease", "-applied_at"],
                        name="spray_spray_target_applied_idx",
                    ),
                    models.Index(
                        fields=["archived_at", "-created_at"],
                        name="spray_spray_arch_created_idx",
                    ),
                ],
            },
        ),
        migrations.RunPython(_apply_rls_forward, _apply_rls_reverse),
    ]
