"""M1.5 PR-C: RiskRecord + BlockVerdict tables + RLS policies (SA-2).

Both tables tenant-scope through `block.vineyard.org_id`, matching the
M1-09 Capture pattern. RLS policies traverse the same chain.
"""

from __future__ import annotations

import uuid

from django.db import migrations, models


RLS_FORWARD_SQL = """
ALTER TABLE spray_riskrecord ENABLE ROW LEVEL SECURITY;
ALTER TABLE spray_riskrecord FORCE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS riskrecord_org_isolation ON spray_riskrecord;
CREATE POLICY riskrecord_org_isolation ON spray_riskrecord
    USING (
        (
            SELECT v.org_id
            FROM spray_vineyard v
            JOIN spray_block b ON b.vineyard_id = v.id
            WHERE b.id = block_id
        )::text = current_setting('app.current_org_id', true)
    )
    WITH CHECK (
        (
            SELECT v.org_id
            FROM spray_vineyard v
            JOIN spray_block b ON b.vineyard_id = v.id
            WHERE b.id = block_id
        )::text = current_setting('app.current_org_id', true)
    );

ALTER TABLE spray_blockverdict ENABLE ROW LEVEL SECURITY;
ALTER TABLE spray_blockverdict FORCE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS blockverdict_org_isolation ON spray_blockverdict;
CREATE POLICY blockverdict_org_isolation ON spray_blockverdict
    USING (
        (
            SELECT v.org_id
            FROM spray_vineyard v
            JOIN spray_block b ON b.vineyard_id = v.id
            WHERE b.id = block_id
        )::text = current_setting('app.current_org_id', true)
    )
    WITH CHECK (
        (
            SELECT v.org_id
            FROM spray_vineyard v
            JOIN spray_block b ON b.vineyard_id = v.id
            WHERE b.id = block_id
        )::text = current_setting('app.current_org_id', true)
    );
"""

RLS_REVERSE_SQL = """
DROP POLICY IF EXISTS blockverdict_org_isolation ON spray_blockverdict;
ALTER TABLE spray_blockverdict NO FORCE ROW LEVEL SECURITY;
ALTER TABLE spray_blockverdict DISABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS riskrecord_org_isolation ON spray_riskrecord;
ALTER TABLE spray_riskrecord NO FORCE ROW LEVEL SECURITY;
ALTER TABLE spray_riskrecord DISABLE ROW LEVEL SECURITY;
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
        ("spray", "0007_membership_rls_relax"),
    ]

    operations = [
        migrations.CreateModel(
            name="RiskRecord",
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
                ("model_id", models.CharField(max_length=80)),
                ("model_version", models.CharField(max_length=32)),
                ("valid_from", models.DateTimeField()),
                ("valid_to", models.DateTimeField()),
                (
                    "pathogen",
                    models.CharField(
                        choices=[("powdery", "Powdery"), ("downy", "Downy")],
                        max_length=10,
                    ),
                ),
                (
                    "severity_1_10",
                    models.DecimalField(decimal_places=2, max_digits=4),
                ),
                ("raw_score", models.JSONField(default=dict)),
                ("thresholds_fired", models.JSONField(default=list)),
                ("input_snapshot_id", models.CharField(max_length=80)),
                ("confidence", models.DecimalField(decimal_places=4, max_digits=5)),
                ("citation_id", models.CharField(max_length=40)),
                ("created_at", models.DateTimeField(auto_now_add=True)),
                (
                    "block",
                    models.ForeignKey(
                        on_delete=models.deletion.CASCADE,
                        related_name="risk_records",
                        to="spray.block",
                    ),
                ),
            ],
            options={
                "constraints": [
                    models.UniqueConstraint(
                        fields=("block", "model_id", "valid_from"),
                        name="unique_block_model_window",
                    ),
                ],
                "indexes": [
                    models.Index(
                        fields=["block", "-valid_from"], name="spray_rr_block_validfrom_idx"
                    ),
                    models.Index(
                        fields=["pathogen", "-valid_from"],
                        name="spray_rr_pathogen_validfrom_idx",
                    ),
                    models.Index(
                        fields=["model_id", "-valid_from"],
                        name="spray_rr_model_validfrom_idx",
                    ),
                ],
            },
        ),
        migrations.CreateModel(
            name="BlockVerdict",
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
                ("date", models.DateField()),
                (
                    "powdery_severity_1_10",
                    models.DecimalField(decimal_places=2, max_digits=4),
                ),
                (
                    "downy_severity_1_10",
                    models.DecimalField(decimal_places=2, max_digits=4),
                ),
                (
                    "powdery_confidence",
                    models.DecimalField(decimal_places=4, max_digits=5),
                ),
                (
                    "downy_confidence",
                    models.DecimalField(decimal_places=4, max_digits=5),
                ),
                (
                    "action",
                    models.CharField(
                        choices=[
                            ("spray", "Spray"),
                            ("hold", "Hold"),
                            ("scout", "Scout"),
                        ],
                        max_length=10,
                    ),
                ),
                (
                    "urgency",
                    models.CharField(
                        choices=[
                            ("now", "Now"),
                            ("24h", "24h"),
                            ("72h", "72h"),
                            ("none", "None"),
                        ],
                        max_length=10,
                    ),
                ),
                ("drivers", models.JSONField(default=list)),
                ("split_summary", models.TextField(blank=True)),
                ("forecast_7d", models.JSONField(default=list)),
                ("advisory_events", models.JSONField(default=list)),
                ("model_versions", models.JSONField(default=dict)),
                ("generated_at", models.DateTimeField()),
                ("audit_hash", models.CharField(max_length=80)),
                ("created_at", models.DateTimeField(auto_now_add=True)),
                (
                    "block",
                    models.ForeignKey(
                        on_delete=models.deletion.CASCADE,
                        related_name="verdicts",
                        to="spray.block",
                    ),
                ),
            ],
            options={
                "constraints": [
                    models.UniqueConstraint(
                        fields=("block", "date"),
                        name="unique_block_date_verdict",
                    ),
                ],
                "indexes": [
                    models.Index(
                        fields=["block", "-date"], name="spray_bv_block_date_idx"
                    ),
                    models.Index(
                        fields=["action", "-date"], name="spray_bv_action_date_idx"
                    ),
                ],
            },
        ),
        migrations.RunPython(_apply_rls_forward, _apply_rls_reverse),
    ]
