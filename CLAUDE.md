## Spray: Gubler–Thomas conidial PMI (QA)

1. Set monitoring start on a block: `block.settings["budbreak_date"]` = `"YYYY-MM-DD"` (ISO).
2. On the API host, run `python manage.py rollup_pmi --org <uuid>` or `--block <uuid> [--date YYYY-MM-DD]` to upsert `BlockPowderyMildewIndex` rows from fused hourly weather.
3. Refresh the directive from the dashboard (or `execute_compute_block_verdict`) so the Gubler–Thomas runner reads stored PMI into the verdict and `split_summary` includes the PMI sentence.
4. Daily Celery beat task `pmi-rollup-daily` runs `rollup_all_blocks_pmi_task` at 06:30 UTC in-season (April–October); set `GRAFT_SPRAY_PMI_ROLLUP_FORCE=true` on the worker to run out-of-season.
