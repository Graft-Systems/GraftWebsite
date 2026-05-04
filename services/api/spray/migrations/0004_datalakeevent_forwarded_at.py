"""M0-04 step 5: track lake forwarding state on DataLakeEvent.

Adds `forwarded_at`. The Celery worker stamps it after a successful S3
PUT. A partial index makes "find unforwarded events" fast as the lake
grows.
"""

from __future__ import annotations

from django.db import migrations, models


class Migration(migrations.Migration):
    dependencies = [
        ("spray", "0003_rls_policies"),
    ]

    operations = [
        migrations.AddField(
            model_name="datalakeevent",
            name="forwarded_at",
            field=models.DateTimeField(blank=True, null=True),
        ),
        # Partial index keeps the worker's hot-path query O(unforwarded-count)
        # rather than O(total-rows). Postgres-specific.
        migrations.RunSQL(
            sql=(
                "CREATE INDEX IF NOT EXISTS spray_dle_unforwarded_idx "
                "ON spray_datalakeevent (category, created_at) "
                "WHERE forwarded_at IS NULL;"
            ),
            reverse_sql="DROP INDEX IF EXISTS spray_dle_unforwarded_idx;",
        ),
    ]
