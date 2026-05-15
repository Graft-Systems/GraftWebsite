"""Force PMI rollup for QA (``manage.py rollup_pmi``)."""

from __future__ import annotations

from datetime import date, datetime, timezone

from django.core.management.base import BaseCommand

from spray.models import Block
from spray.pmi_rollup import execute_rollup_block_pmi, rollup_all_blocks_pmi


class Command(BaseCommand):
    help = "Recompute BlockPowderyMildewIndex from fused hourly weather."

    def add_arguments(self, parser) -> None:
        parser.add_argument(
            "--org",
            type=str,
            default=None,
            help="Limit to blocks in this org UUID",
        )
        parser.add_argument(
            "--block",
            type=str,
            default=None,
            help="Single block UUID",
        )
        parser.add_argument(
            "--date",
            type=str,
            default=None,
            help="Through date YYYY-MM-DD (UTC calendar day); default today UTC",
        )

    def handle(self, *args, **options) -> None:
        org_id = options.get("org")
        block_id = options.get("block")
        raw_date = options.get("date")
        through = (
            date.fromisoformat(raw_date)
            if raw_date
            else datetime.now(tz=timezone.utc).date()
        )

        if block_id:
            n = execute_rollup_block_pmi(block_id, through)
            self.stdout.write(self.style.SUCCESS(f"Upserted {n} PMI row(s) for block."))
            return

        qs = Block.objects.unscoped().filter(archived_at__isnull=True)
        if org_id:
            qs = qs.filter(vineyard__org_id=org_id)
        total = 0
        for bid in qs.values_list("id", flat=True).distinct():
            total += execute_rollup_block_pmi(str(bid), through)
        self.stdout.write(
            self.style.SUCCESS(f"Upserted {total} PMI row(s) across blocks.")
        )
