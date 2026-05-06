"""Django signals — auto-recompute Vineyard.centroid (M0-05 step 6).

When a Block is created / updated / archived, the parent Vineyard's
`centroid` field is recomputed as the centroid of the union of all
live (non-archived) child Block geoms. Empty vineyard → centroid is
None.

Wired in `spray.apps.SprayConfig.ready()` so the signals attach at
Django startup. Skipped on non-Postgres backends because the GIS
union aggregate requires PostGIS.
"""

from __future__ import annotations

from django.contrib.gis.db.models import Union
from django.db import connection, transaction
from django.db.models.signals import post_delete, post_save
from django.dispatch import receiver

from spray.models import Block, Vineyard


def _recompute(vineyard_id) -> None:
    """Recompute and persist a single Vineyard's centroid."""
    if connection.vendor != "postgresql":
        return  # PostGIS-only operation; SQLite tests can opt out via mock.
    try:
        v = Vineyard.objects.unscoped().get(id=vineyard_id)
    except Vineyard.DoesNotExist:
        return

    union_qs = (
        Block.objects.unscoped()
        .filter(vineyard_id=vineyard_id, archived_at__isnull=True)
        .aggregate(geom__union=Union("geom"))
    )
    union = union_qs.get("geom__union")
    new_centroid = union.centroid if union else None
    if v.centroid != new_centroid:
        v.centroid = new_centroid
        v.save(update_fields=["centroid"])


@receiver(post_save, sender=Block)
def block_post_save(sender, instance, **kwargs):
    vid = instance.vineyard_id
    transaction.on_commit(lambda: _recompute(vid))


@receiver(post_delete, sender=Block)
def block_post_delete(sender, instance, **kwargs):
    vid = instance.vineyard_id
    transaction.on_commit(lambda: _recompute(vid))
