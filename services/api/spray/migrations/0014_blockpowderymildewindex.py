# Generated manually for Gubler-Thomas PMI daily storage

import uuid

from django.db import migrations, models
import django.db.models.deletion


class Migration(migrations.Migration):

    dependencies = [
        ("spray", "0013_rename_spray_bv_block_date_idx_spray_block_block_i_159112_idx_and_more"),
    ]

    operations = [
        migrations.CreateModel(
            name="BlockPowderyMildewIndex",
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
                ("pmi", models.PositiveSmallIntegerField()),
                ("risk_tier", models.CharField(max_length=16)),
                ("phase", models.CharField(max_length=16)),
                ("details", models.JSONField(default=dict)),
                ("created_at", models.DateTimeField(auto_now_add=True)),
                ("updated_at", models.DateTimeField(auto_now=True)),
                (
                    "block",
                    models.ForeignKey(
                        on_delete=django.db.models.deletion.CASCADE,
                        related_name="powdery_mildew_indices",
                        to="spray.block",
                    ),
                ),
            ],
        ),
        migrations.AddConstraint(
            model_name="blockpowderymildewindex",
            constraint=models.UniqueConstraint(
                fields=("block", "date"),
                name="unique_block_pmi_date",
            ),
        ),
        migrations.AddIndex(
            model_name="blockpowderymildewindex",
            index=models.Index(
                fields=["block", "-date"],
                name="spray_bpmi_block_date_idx",
            ),
        ),
    ]
