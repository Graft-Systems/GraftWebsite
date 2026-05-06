# M0-06 Runbook — Weather Adapter + SA-1 Risk Indices

Manual operations Benson handles around merging M0-06 to `graft-spray/main`.

## 1. Visual Crossing API key

1. Go to https://www.visualcrossing.com/sign-up
2. Sign up with `graftsystems@gmail.com` (free tier, 1,000 records/day; commercial use OK with attribution)
3. Verify email
4. Dashboard → **Account** → copy the API key

## 2. Add `VISUAL_CROSSING_API_KEY` to Render

Add the same value to BOTH services so both the API (health-probe endpoint) and the worker (beat-pull tasks) can call Visual Crossing:

### API service (`graftwebsite`)

1. Render dashboard → `graftwebsite` → **Environment** tab
2. **Add Environment Variable** → key: `VISUAL_CROSSING_API_KEY`, value: paste from step 1
3. Save (auto-redeploy)

### Worker service (`graft-spray-worker`)

1. Render dashboard → `graft-spray-worker` → **Environment** tab
2. Add the same `VISUAL_CROSSING_API_KEY` variable
3. Save (auto-redeploy)

## 3. Smoke test

After both services redeploy, test the adapter from the API service shell:

```sh
# Render API service → Shell tab
python manage.py shell
>>> from spray.providers.registry import get_weather
>>> get_weather("visual_crossing").health()
ProviderHealth(ok=True, latency_ms=312.4, detail='')
```

Or hit the admin endpoint with a Clerk JWT:

```sh
curl https://graftwebsite.onrender.com/api/spray/admin/provider-health \
  -H "Authorization: Bearer <jwt>"
```

Expected:

```json
{
  "weather": {
    "visual_crossing": {"ok": true, "latency_ms": 312, "detail": ""},
    "generic_csv":     {"ok": true, "latency_ms": null, "detail": "local file adapter"}
  },
  "external_risk_index": {
    "uc_ipm_grape_pm": {"ok": true, "latency_ms": 89, "detail": ""},
    "uspest_grape_pm": {"ok": true, "latency_ms": 102, "detail": ""}
  }
}
```

## 4. Confirm the beat schedule fires

```sh
# Worker service → Logs tab → grep for hourly task triggers.
# You should see lines like:
[INFO/Beat] Scheduler: Sending due task weather-pull
[INFO/Beat] Scheduler: Sending due task external-risk-index-pull
```

The first weather-pull task may write 0 rows if no Vineyards have been created yet (the regional-default stations are seeded but no one has triggered a backfill). Once a vineyard is created, the backfill task pulls 14 days of history (~336 rows).

## 5. Watch the free-tier quota

Visual Crossing free tier: 1,000 records/day. The hourly pull task fetches the last 6 hours per active station, so 6 records/hour × 24 hours × N stations.

- 1 regional default × 6 records × 24 hours = 144 records/day (well within quota)
- Backfill on each Vineyard create: 14 × 24 = 336 records (one-time per vineyard)
- 3 vineyards backfilled in one day saturates the quota. The runbook for upgrading to the $35/mo Pro tier (1M records/mo) is a single click in Visual Crossing's dashboard.

## 6. Monitoring (deferred to M0-08)

For now, Render's process logs are the only visibility. M0-08 wires Sentry alerting on:
- `ProviderRateLimitError` rate
- `WeatherStation.last_pull_at` more than 2 hours stale
- `ExternalRiskIndex` rows older than 4 hours for active regions

Manual check until M0-08:

```sh
python manage.py shell
>>> from django.utils import timezone
>>> from datetime import timedelta
>>> from spray.models import WeatherStation, ExternalRiskIndex
>>> # Stations that haven't pulled in the last 2 hours.
>>> WeatherStation.objects.filter(
...     last_pull_at__lt=timezone.now() - timedelta(hours=2)
... ).count()
```

## 7. Rollback

| Symptom | Fix |
|---|---|
| Visual Crossing 401/403 across all pulls | API key wrong/expired. Regenerate in Visual Crossing dashboard, update both Render services. |
| UC IPM HTML changed; risk_level always low + `parse_error` | M0-06a will add a snapshot test + alert. For now, accept the degraded state; the `is_estimated` flag on RiskIndexRun (M1-07) will surface it to users. |
| Backfill task floods the quota on multi-vineyard imports | Set the worker's `--concurrency=1` for backfill queue. This is not the default at M0-06; if it becomes a problem, route backfill to a separate queue. |
| Weather pull blocks Postgres writes | Each pull writes ~6 rows in a single transaction; should not block. If you see lock contention, raise `services/worker/Procfile` worker count above 2 OR add `select_for_update(skip_locked=True)` on the WeatherStation row. |

## 8. M0-06a follow-ups

Already documented in the M0-06 plan §7 ("Out of scope"):
- CIMIS adapter (Napa station observations)
- NOAA NWS forecast fallback
- Open-Meteo paid alternate
- Davis WeatherLink, METER ATMOS-41, Sencrop, Pessl iMETOS
- HTML snapshot regression tests for UC IPM + uspest scrapers
