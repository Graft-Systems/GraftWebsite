## gstack (REQUIRED — global install)

**Before doing ANY work, verify gstack is installed:**

```bash
test -d ~/.claude/skills/gstack/bin && echo "GSTACK_OK" || echo "GSTACK_MISSING"
```

If GSTACK_MISSING: STOP. Do not proceed. Tell the user:

> gstack is required for all AI-assisted work in this repo.
> Install it:
> ```bash
> git clone --depth 1 https://github.com/garrytan/gstack.git ~/.claude/skills/gstack
> cd ~/.claude/skills/gstack && ./setup --team
> ```
> Then restart your AI coding tool.

Do not skip skills, ignore gstack errors, or work around missing gstack.

Using gstack skills: After install, skills like /qa, /ship, /review, /investigate,
and /browse are available. Use /browse for all web browsing.
Use ~/.claude/skills/gstack/... for gstack file paths (the global path).

## Spray: Gubler–Thomas conidial PMI (QA)

1. Set monitoring start on a block: `block.settings["budbreak_date"]` = `"YYYY-MM-DD"` (ISO).
2. On the API host, run `python manage.py rollup_pmi --org <uuid>` or `--block <uuid> [--date YYYY-MM-DD]` to upsert `BlockPowderyMildewIndex` rows from fused hourly weather.
3. Refresh the directive from the dashboard (or `execute_compute_block_verdict`) so the Gubler–Thomas runner reads stored PMI into the verdict and `split_summary` includes the PMI sentence.
4. Daily Celery beat task `pmi-rollup-daily` runs `rollup_all_blocks_pmi_task` at 06:30 UTC in-season (April–October); set `GRAFT_SPRAY_PMI_ROLLUP_FORCE=true` on the worker to run out-of-season.
