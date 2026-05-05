# M0-06 Plan — Weather Adapter (Napa/Sonoma) + SA-1 External Risk Indices

**Status:** PLAN ONLY. No implementation in this commit. Implementation begins after Benson approves.
**Branch:** `graft-spray/m0/weather-and-risk-feeds`
**PR target:** `graft-spray/main`
**Combines:** Original M0-06 (weather adapter) + M0-06b (SA-1 external risk index aggregator). Strategist called the merge: same worker, same provider abstraction, single PR review halves overhead.
**Depends on:** M0-04 (worker tier + emit_event + schema registry) merged. M0-03 (PostGIS schema) merged.
**Spec section reference:** [`Graft-Spray-App-Spec.md` §11](../Graft-Spray-App-Spec.md), §12, Appendix A SA-1. [`CODEBASE_PLAN.md` §6 PRs #6 + #6b](../CODEBASE_PLAN.md).
**Estimated diff size:** Large (~1,200 LoC backend, no frontend changes).
**Estimated effort:** 12-15 hours of backend implementation, plus ~10 minutes of Benson on Visual Crossing API key signup.

---

## 1. Goal

After this PR lands:

- A new `services/api/spray/providers/` package houses two protocols (`WeatherProvider`, `ExternalRiskIndexProvider`) and four adapters: Visual Crossing, Generic CSV (weather), UC IPM Grape PM RAI, uspest.org Grape PM.
- Two new Django models: `WeatherStation`, `WeatherObservation`. Plus M0-03's existing `ExternalRiskIndex` skeleton (this PR populates it via the SA-1 adapters).
- Per-vineyard provider selection via `Vineyard.settings["weather_provider"]` (no schema change, JSONField field).
- Region-default `WeatherStation` rows (one per supported AVA cluster) seeded by the migration.
- A Celery beat task `weather_pull.py` runs hourly, fans out one task per active station, dedups via `(station_id, ts)` unique constraint.
- A Celery beat task `external_risk_index.py` runs hourly, fans out one task per (region × source), dedups via `(region, source, hour_bucket)`.
- An async backfill task fires on Vineyard creation: pulls 14 days of hourly weather observations from the region-default provider so Gubler-Thomas (M1-07) has an initial baseline.
- Every successful pull emits a `weather.observation_pulled`, `weather.forecast_pulled`, or `external_risk_index.pulled` DataLakeEvent. Three new schema files in the registry. CI's `check_event_schemas.py` validates them at PR time.
- `WeatherProvider` and `ExternalRiskIndexProvider` health endpoints surface in a tiny ops view at `GET /api/spray/admin/provider-health` (Owner-only, used to triage outages).
- ~50 new tests (provider mocks via `responses`, Celery tasks called directly, idempotency on retry, schema-drift handling).

This PR does NOT yet wire:
- CIMIS station-specific observations (deferred to M0-06a — scout flagged it as Napa-optimal but VC's gridded data is sufficient for M0 launch).
- NOAA NWS forecast fallback (M0-06a).
- Open-Meteo paid alternate (M0-06a if VC quota becomes a problem).
- Davis WeatherLink / METER ATMOS-41 / Sencrop / Pessl iMETOS user integrations (M1-14, tied to `IntegrationConnection`).
- Tomorrow.io adapter — DROPPED. Their leaf wetness sits behind a sales-gated agriculture premium with no published price; we replace the spec's "alternate" slot with Open-Meteo at M0-06a.
- Météo-France ICOS, INTA Pampa — out of scope until the Burgundy/Mendoza expansion (M3+).

## 2. Decisions locked

| Topic | Resolution | Source |
|---|---|---|
| **Primary weather provider** | **Visual Crossing**. Free tier permits commercial use with attribution; only consumer API with leaf wetness pre-computed (CART-derived). Spec §4.3 default. | Scout brief; spec §12.3 |
| **Tomorrow.io** | **DROPPED.** Leaf wetness sales-gated, no published price. Spec's "alternate" slot reassigned to Open-Meteo (deferred to M0-06a). | Scout brief |
| Generic CSV escape hatch | Ships at M0-06 — covers any user with a station we haven't adapted. Format: ISO 8601 timestamp + named columns (temp_c, rh_pct, leaf_wetness_min, wind_speed_ms, precip_mm). | Strategist call |
| **SA-1 adapters** | **UC IPM Grape PM RAI + uspest.org Grape PM** ship together. Both are free, both are HTML-scrape adapters (neither has a JSON API), both are referenced by spec §11.7. | Spec §12.5 |
| Pull cadence | Hourly per station (weather) and hourly per region × source (SA-1). | Spec §11.5, §12.5 |
| Backfill | 14 days of hourly observations, async Celery task triggered on Vineyard create. | Spec §12.4 |
| Idempotency | `WeatherObservation` unique on `(station, ts)`, `bulk_create(update_conflicts=True)` on retry. `ExternalRiskIndex` unique on `(region, source, pulled_at)` truncated to the hour. | Builder brief |
| Per-vineyard provider | `Vineyard.settings["weather_provider"]` JSON field (existing, no migration). Region-default fallback via `region_default_for(vineyard.region)`. | Builder brief |
| `WeatherStation.org` | Nullable; regional defaults have `org=None` and `is_regional_default=True`. View layer filters `Q(org=request_org) \| Q(is_regional_default=True)`. No RLS policy on this table (allowing null org with wide read is incompatible with RLS without exception logic; view-layer gate is the lock). | Spec §9.1 + builder brief |
| `WeatherObservation` denorm | No `org_id` column on observations; tenancy resolved by joining through `station.org`. Highest-volume table; denorm would balloon storage. | Builder brief |
| Forecast horizon | 7 days (matches Visual Crossing's free-tier limit; covers spray-window planning). | Builder Q2 default |

## 3. Pre-flight checklist

- [ ] **Visual Crossing API key.** Sign up at https://www.visualcrossing.com/sign-up (free tier, 1,000 records/day). Add `VISUAL_CROSSING_API_KEY` env var to Render API service AND Render worker service.
- [ ] No new AWS / S3 changes (lake bucket from M0-04 already accepts the new event categories).
- [ ] No new Render Redis / worker provisioning (uses the M0-04 worker tier).
- [ ] CI postgres+postgis service from M0-03 still in place; new tests run on it.
- [ ] CHANGELOG.md updated.
- [ ] CODEBASE_PLAN.md PRs #6 and #6b rows marked closed in the same merge.

## 4. Implementation steps

### Step 1: Plan PR (THIS COMMIT)

This file is the only change.

### Step 2: Models

In `services/api/spray/models.py`, append:

```python
class WeatherStation(models.Model):
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    org = models.ForeignKey(
        Org, null=True, blank=True, on_delete=models.SET_NULL,
        related_name="weather_stations",
    )
    provider = models.CharField(max_length=40)         # adapter slug
    station_id = models.CharField(max_length=120)      # provider's identifier
    name = models.CharField(max_length=200, blank=True)
    location = gis_models.PointField(srid=4326)
    is_regional_default = models.BooleanField(default=False)
    region = models.CharField(
        max_length=20, choices=Org.Region.choices, default=Org.Region.OTHER
    )
    created_at = models.DateTimeField(auto_now_add=True)
    last_pull_at = models.DateTimeField(null=True, blank=True)

    class Meta:
        constraints = [
            models.UniqueConstraint(
                fields=["provider", "station_id"], name="unique_provider_station"
            ),
        ]
        indexes = [
            models.Index(fields=["org"]),
            models.Index(fields=["region", "is_regional_default"]),
        ]
        # No GIST index on location at M0-06 — only relevant when M0-06a
        # introduces "find nearest station" lookups.


class WeatherObservation(models.Model):
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    station = models.ForeignKey(
        WeatherStation, on_delete=models.CASCADE, related_name="observations"
    )
    ts = models.DateTimeField()
    temp_c = models.DecimalField(max_digits=5, decimal_places=2, null=True)
    rh_pct = models.DecimalField(max_digits=5, decimal_places=2, null=True)
    leaf_wetness_min = models.DecimalField(
        max_digits=5, decimal_places=2, null=True
    )
    wind_speed_ms = models.DecimalField(max_digits=6, decimal_places=2, null=True)
    precip_mm = models.DecimalField(max_digits=7, decimal_places=2, null=True)
    is_forecast = models.BooleanField(default=False)
    raw = models.JSONField(default=dict)

    class Meta:
        constraints = [
            models.UniqueConstraint(
                fields=["station", "ts"], name="unique_station_ts"
            ),
        ]
        indexes = [
            models.Index(fields=["station", "-ts"]),  # latest-N queries
        ]
```

`ExternalRiskIndex` already exists from M0-03's data-model declaration; this PR will land its initial migration if it wasn't created in M0-03.

### Step 3: Migration

`services/api/spray/migrations/0005_weather_models.py` creates the two tables, the unique constraints, and the indexes. Also seeds initial regional-default `WeatherStation` rows: one per supported AVA cluster (Napa, Sonoma, plus a placeholder "other" sentinel). Coordinates are AVA centroids.

### Step 4: Provider Protocol

`services/api/spray/providers/base.py`:

```python
from typing import Protocol
from dataclasses import dataclass

@dataclass
class ProviderHealth:
    ok: bool
    latency_ms: float | None
    detail: str = ""

class WeatherProvider(Protocol):
    PROVIDER_SLUG: str
    def fetch_observations(self, station, since): ...
    def fetch_forecast(self, station, days): ...
    def health(self): ...

class ExternalRiskIndexProvider(Protocol):
    PROVIDER_SLUG: str
    def fetch_index(self, region: str): ...
    def health(self): ...
```

`providers/registry.py` auto-discovers adapters by importing each module and indexing by `PROVIDER_SLUG`. Keeps the dispatch one-line: `registry.get_weather(slug).fetch_observations(...)`.

### Step 5: Visual Crossing adapter

`providers/visual_crossing.py`:

- Endpoint: `https://weather.visualcrossing.com/VisualCrossingWebServices/rest/services/timeline/{lat},{lon}/{since-iso}/{until-iso}?key={KEY}&unitGroup=metric&include=hours`
- Maps `temp` → `temp_c`, `humidity` → `rh_pct`, `feelslike` → ignored, `precip` → `precip_mm`, `windspeed` → `wind_speed_ms` (km/h to m/s × 0.2778), `leafwetnessindex` → `leaf_wetness_min` (binary 0/1 per hour scaled to 60).
- Raises `ProviderRateLimitError` on 429, `ProviderAuthError` on 401, `ProviderResponseError` on 5xx.
- Reads `VISUAL_CROSSING_API_KEY` from settings; raises `ImproperlyConfigured` if missing.

### Step 6: Generic CSV adapter

`providers/generic_csv.py`:

- No HTTP. Accepts a CSV file path or in-memory stream.
- Required columns: `ts` (ISO 8601). Optional columns: `temp_c, rh_pct, leaf_wetness_min, wind_speed_ms, precip_mm`. Any subset is OK.
- `fetch_observations` reads the file relative to a per-station `WeatherStation.settings["csv_path"]` config.
- `fetch_forecast` raises `NotImplementedError` (CSVs are historical only).
- Used by ops/admin to backfill stations from third-party exports without writing a bespoke adapter.

### Step 7: SA-1 adapters

`providers/uc_ipm_grape_pm.py`:

- Scrapes `https://ipm.ucanr.edu/weather/grape-powdery-mildew-risk-assessment-index/` for the daily index per California AVA.
- `fetch_index(region)` returns an `ExternalRiskIndex` instance with `risk_index_value` (0-100), `risk_level` (low/moderate/high per spec §11.8), and `raw_payload` capturing the full HTML excerpt for forensic replay.
- Caches HTML responses for 60 min in Redis to reduce traffic on UC IPM's servers.

`providers/uspest_grape_pm.py`:

- Same shape, scrapes `https://uspest.org/risk/grape_powdery_app`.
- Region maps Pacific Northwest (Sonoma is also covered; the PNW model extends to the Bay Area).

Both implement `health()` which probes the parent URL with HEAD and returns `ok=True` on 200.

### Step 8: Worker tasks

`services/worker/tasks/weather_pull.py`:

```python
@app.task(bind=True, max_retries=4, default_retry_delay=60,
          autoretry_for=(ProviderRateLimitError,), retry_backoff=True,
          retry_backoff_max=600)
def pull_station(self, station_id: str): ...

@app.task
def pull_all_active_stations(): ...

@app.task(bind=True, max_retries=2)
def backfill_vineyard_weather(self, vineyard_id: str): ...
```

`pull_all_active_stations` fans out via `pull_station.delay(...)` for each `WeatherStation` matching `is_regional_default=True OR org_id IS NOT NULL`.

`services/worker/tasks/external_risk_index.py`:

```python
@app.task(bind=True, max_retries=4, default_retry_delay=60,
          autoretry_for=(ProviderRateLimitError,), retry_backoff=True)
def pull_external_index(self, region: str, source: str): ...

@app.task
def pull_all_external_indices(): ...
```

Beat schedule additions in `services/worker/graft_worker/celery.py`:

```python
app.conf.beat_schedule.update({
    "weather-pull": {
        "task": "graft_worker.tasks.weather_pull.pull_all_active_stations",
        "schedule": 3600.0,
    },
    "external-risk-index-pull": {
        "task": "graft_worker.tasks.external_risk_index.pull_all_external_indices",
        "schedule": 3600.0,
    },
})
```

`services/worker/graft_worker/tasks/__init__.py` eagerly imports both new task modules (per the M0-04 autoload pattern).

### Step 9: Backfill trigger

In `services/api/spray/views.py`'s `VineyardListCreateView.post`, after `_emit_lake_event(category="vineyard.created", ...)`:

```python
# Async; vineyard creation response returns immediately.
from graft_worker.tasks.weather_pull import backfill_vineyard_weather
backfill_vineyard_weather.delay(str(vineyard.id))
```

The import is local to the view to avoid a worker-package import at API startup. If the worker package isn't on PYTHONPATH (test sandboxes that don't enqueue), the call still works because Celery's `delay()` only serializes the task name.

### Step 10: Schema registry entries

Three new files:
- `services/api/spray/schemas/events/weather/observation_pulled/v1.json`
- `services/api/spray/schemas/events/weather/forecast_pulled/v1.json`
- `services/api/spray/schemas/events/external_risk_index/pulled/v1.json`

All three set `additionalProperties: false`, require `station_id` (or `region` for the external risk one), `provider`, `obs_count` (or `index_value` for risk), `latest_ts`. CI's `check_event_schemas.py` from M0-04 validates them at PR time.

### Step 11: Provider-health admin endpoint

`GET /api/spray/admin/provider-health` returns:

```json
{
  "weather": {
    "visual_crossing": {"ok": true, "latency_ms": 312},
    "generic_csv":     {"ok": true, "latency_ms": null}
  },
  "external_risk_index": {
    "uc_ipm_grape_pm": {"ok": true, "latency_ms": 89},
    "uspest_grape_pm": {"ok": false, "latency_ms": null, "detail": "503 from upstream"}
  }
}
```

Permission: `IsOrgOwner`. Used for ops triage; M0-08 will add Sentry alerting.

### Step 12: Tests

`services/api/spray/tests/`:

- `test_visual_crossing.py` — happy path; 429 → `ProviderRateLimitError`; missing `VISUAL_CROSSING_API_KEY` → `ImproperlyConfigured`; partial-data response (some hourly slots missing); leaf-wetness mapping correctness; km/h → m/s wind unit conversion.
- `test_generic_csv.py` — minimal CSV (only `ts` + `temp_c`); full CSV; `fetch_forecast` raises `NotImplementedError`.
- `test_uc_ipm_grape_pm.py` — happy path with fixture HTML; 503 → graceful failure; risk_level mapping (low/moderate/high).
- `test_uspest_grape_pm.py` — same.
- `test_weather_models.py` — unique `(station, ts)` constraint enforced; `ExternalRiskIndex` likewise; `is_forecast` round-trip.
- `test_provider_registry.py` — auto-discovery loads all four adapters; unknown slug raises clear error.

`services/api/spray/tests/test_weather_pull.py` (worker tests under api dir per M0-04 pattern):

- Mocks Visual Crossing with `responses`. Tests:
  - `pull_station` writes N rows on first run, 0 new rows on idempotent re-run.
  - `pull_all_active_stations` fans out one subtask per regional default.
  - `backfill_vineyard_weather` pulls 14 days × 24 hours = 336 rows.
  - `emit_event` fires with correct `obs_count`.

`services/api/spray/tests/test_external_risk_pull.py`:

- Same shape for the SA-1 path.

`services/api/spray/tests/test_provider_health_endpoint.py`:

- `IsOrgOwner` enforces; non-owner gets 403; owner sees the JSON shape above.

### Step 13: Runbook + CHANGELOG + plan-doc

- `docs/runbooks/m0-06-weather.md` — Visual Crossing signup, env var configuration, smoke test (`python manage.py shell -c "from spray.providers.registry import get_weather; print(get_weather('visual_crossing').health())"`), monitoring (the new admin endpoint), rollback path.
- CHANGELOG.md gets the M0-06 entry covering both 06 and 06b.
- CODEBASE_PLAN.md PRs #6 and #6b both flip to closed.

### Step 14: Verification before merge

- [ ] Local: `docker compose up -d` then `python manage.py migrate` clean.
- [ ] Local: `pytest services/api/spray/tests/` all green (~145 tests after the +50).
- [ ] Local: `python services/worker/manage.py forward_now` still works (no regression on the M0-04 ETL).
- [ ] CI: build, Django check, schema-registry-check, pytest all green.
- [ ] Manual: with `VISUAL_CROSSING_API_KEY` set, `python manage.py shell` → call `pull_station(napa_default_station_id)` → verify rows land in Postgres, `forwarded_at IS NULL`, then the M0-04 ETL forwards them to S3 within 15 min.
- [ ] CHANGELOG + CODEBASE_PLAN.md rows updated.

## 5. Rollback plan

| Symptom | Fix |
|---|---|
| Visual Crossing API quota exhausted | The free tier hard-stops at 1,000 records/day. Symptom: 429s in worker logs, `WeatherObservation` writes drop to zero. Fix: upgrade to the $35/mo Pro plan (1M records/mo) via VC dashboard. No code change. |
| UC IPM HTML changes break the scraper | The adapter fails gracefully (logs error, no rows written); risk index recompute (M1-07) falls back to `is_estimated=True` on the engine output. M0-06a will introduce a snapshot+regression test for the HTML structure. |
| `WeatherStation.is_regional_default` seed fails on Render | Migration is idempotent; rerun. If the regional defaults are missing post-deploy, manually insert via `python manage.py shell`. |
| Backfill task floods the Visual Crossing free tier on a multi-vineyard import | The free tier is 1,000 records/day. 14 days × 24 hours = 336 records per vineyard. 3 vineyards saturates the quota. Fix: serialize backfills via a single-concurrency queue (`backfill` Celery routing key with `--concurrency=1`). Plan ships this in step 8 already. |

## 6. Risks introduced

| ID | Risk | Likelihood | Impact | Mitigation |
|---|---|---|---|---|
| **R44** (NEW) | Visual Crossing free-tier quota exhausted by backfill traffic before paid users justify the upgrade | Medium | Medium | Single-concurrency backfill queue; ops dashboard alerts at 80% utilization (M0-08). |
| **R45** (NEW) | UC IPM / uspest.org HTML structure changes break scrapers silently | Medium | Medium | Adapter `health()` probes the URL daily; failures surface in `/api/spray/admin/provider-health`. M0-06a adds snapshot tests. |
| **R46** (NEW) | `WeatherObservation` row volume balloons (1 station × 24 obs × 365 days = 8,760 rows/yr; ×N stations) | Low | Low | Postgres can handle this for years before partitioning matters. M0-04 lake forwarding ensures the operational store stays light. |
| **R47** (NEW) | Async backfill task fails silently on Vineyard creation, user never sees weather data | Medium | Medium | The backfill task's failure does NOT block vineyard creation. A `backfill_status` field on `Vineyard.settings` tracks pending/done/failed; M0-06a surfaces it in the UI. M0-06 just logs the failure to Sentry (when M1-19 lands). |
| **R48** (NEW) | Long-lived Visual Crossing API key in Render env (rotation discipline) | Low | Low | Same wart as M0-04's AWS keys. Rotation runbook lands in M0-08 alongside the IAM-role swap. |

## 7. Out of scope (deferred)

- **CIMIS adapter** (Napa/Sonoma California station observations). Scout flagged it as Napa-optimal; defer to M0-06a once VC's gridded data is proven sufficient.
- **NOAA NWS forecast fallback.** M0-06a, used when VC quota is hit.
- **Open-Meteo paid alternate.** M0-06a if commercial-tier needed; non-commercial free tier blocks adoption per Scout's licensing read.
- **Davis WeatherLink, METER ATMOS-41, Sencrop, Pessl iMETOS.** M1-14 (`IntegrationConnection`-based).
- **Tomorrow.io.** DROPPED entirely — sales-gated leaf wetness, no published price.
- **Météo-France ICOS, INTA Pampa.** M3+ (Burgundy/Mendoza expansion).
- **GIST index on `WeatherStation.location`.** Lands in M0-06a when "find nearest station" queries arrive.
- **Per-block virtual stations** (interpolated from nearest physical stations). M0-06a.
- **Hourly recompute trigger** ("recompute risk now" admin button). M1-07.

## 8. Effort estimate

| Step | Effort |
|---|---|
| 1 plan | 0 (this file) |
| 2 models | 0.75h |
| 3 migration + regional-default seed | 0.5h |
| 4 provider Protocol + registry | 0.75h |
| 5 Visual Crossing adapter | 1.5h |
| 6 Generic CSV adapter | 0.75h |
| 7 UC IPM + uspest scrapers | 2h |
| 8 Celery tasks + beat schedule | 1.5h |
| 9 backfill trigger | 0.5h |
| 10 schema registry entries | 0.5h |
| 11 provider-health admin endpoint | 0.75h |
| 12 tests (~50 new) | 3.5h |
| 13 runbook + CHANGELOG | 0.75h |
| 14 verification | 1h |
| **Total** | **~14.75h** (≈2 working days) |

## 9. Open questions for Benson

1. **Visual Crossing free tier vs Pro upgrade ($35/mo) on day one.** Free tier covers M0 development cleanly (1,000 records/day = 41 stations × 24 hours). When real users arrive and backfills compound, we'll need Pro. Default if silent: stay on free tier for M0-06; flag the upgrade in the runbook for "before beta launch."
2. **Sentry / Render alerting on adapter health.** M0-06 ships the `/admin/provider-health` endpoint but no automated alerting. Default: defer alerting to M0-08 (which adds Sentry across the board). Override if you want a quick polling cron now.
3. **CSV adapter UX surface.** M0-06 ships the CSV adapter as an ops/admin tool — no user UI for uploading a CSV. Default: keep it ops-only at M0-06; user-facing CSV upload lands with the Vineyards detail page in M0-06a or M1-14. Override if you want a one-line file picker on the vineyard map page now.
4. **Region-default station seed coordinates.** I'll seed Napa centroid (38.30, -122.31) and Sonoma centroid (38.57, -122.79) as the regional default station locations. Override if you want specific AVA centroids (Oakville, Rutherford, Howell Mountain etc.) — that's M0-06a anyway.

If silent on all four, defaults apply.

## 10. Strategist's broader call (for the record)

Per Strategist's frame, this PR is the last M0 "infra" milestone before the leapfrog to M1-09 (capture upload). After M0-06 lands, the recommendation is to **skip M0-07 and M0-08** and jump straight to M1-07 (Gubler-Thomas) + M1-08 (DMCast) + M1-09 (capture upload), which together give a Napa beta grower the visible loop: take a photo, get a disease risk readout backed by real weather. That triad is the demo that survives Benson's Moelis blackout starting June 1.

This plan does not commit to that ordering — it's Strategist's recommendation, surfaced here so the decision is conscious. M0-07 (notifications scaffold) and M0-08 (security hardening) can land in July nights and weekends post-Moelis.

## 11. Dependencies for downstream PRs

- **M1-07 (Gubler-Thomas)** depends on `WeatherObservation` rows existing (this PR seeds the pipeline).
- **M1-08 (DMCast)** same.
- **M1-12 (Recommendations)** depends on `ExternalRiskIndex` rows for SA-1 cross-reference (this PR populates them).
- **M1-14 (Integrations panel)** depends on the `WeatherProvider` Protocol from this PR — Davis/METER/Sencrop adapters slot into the existing registry.
