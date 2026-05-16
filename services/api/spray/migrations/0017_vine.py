from django.db import migrations, models
import django.contrib.gis.db.models.fields
import uuid


class Migration(migrations.Migration):

    dependencies = [
        ("spray", "0016_capture_notes"),
    ]

    operations = [
        migrations.CreateModel(
            name="Vine",
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
                    "location",
                    django.contrib.gis.db.models.fields.PointField(srid=4326),
                ),
                ("row_index", models.PositiveIntegerField()),
                ("vine_index", models.PositiveIntegerField()),
                (
                    "status",
                    models.CharField(
                        choices=[
                            ("ok", "OK"),
                            ("watch", "Watch"),
                            ("alert", "Alert"),
                        ],
                        default="ok",
                        max_length=10,
                    ),
                ),
                ("label", models.CharField(blank=True, max_length=80)),
                ("settings", models.JSONField(blank=True, default=dict)),
                ("created_at", models.DateTimeField(auto_now_add=True)),
                ("archived_at", models.DateTimeField(blank=True, null=True)),
                (
                    "block",
                    models.ForeignKey(
                        on_delete=models.deletion.CASCADE,
                        related_name="vines",
                        to="spray.block",
                    ),
                ),
            ],
        ),
        migrations.AddIndex(
            model_name="vine",
            index=models.Index(
                fields=["block", "row_index", "vine_index"],
                name="spray_vine_block__b8e2a1_idx",
            ),
        ),
        migrations.AddIndex(
            model_name="vine",
            index=models.Index(
                fields=["block", "archived_at"],
                name="spray_vine_block__a4f3c2_idx",
            ),
        ),
        migrations.AddConstraint(
            model_name="vine",
            constraint=models.UniqueConstraint(
                condition=models.Q(("archived_at__isnull", True)),
                fields=("block", "row_index", "vine_index"),
                name="unique_active_vine_position_per_block",
            ),
        ),
    ]
