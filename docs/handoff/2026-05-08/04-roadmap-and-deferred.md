# Roadmap + Deferred Work

What's queued, what's been intentionally skipped, what risks are being tracked.

## Queued PRs (in priority order, Strategist-recommended)

### PR-G - Sentinel-2 zonal stats via CDSE

- Source: spec §12B (Satellite & Remote Sensing).
- Free imagery via Copernicus Data Space Ecosystem Statistical API.
- s2cloudless for cloud masking; NDRE + NDWI zonal stats per block (median, P10, P90, CV).
- Per-block daily zonal-stat job → time-series store → anomaly detection (Z-score, CUSUM).
- Feeds ensemble engine as `vigor_anomaly_z` feature.
- Risk register entry R22: CDSE quota caps; commercial Sentinel Hub tier costs scale per farm count.
- Why this matters: visual demo story for non-technical wineries. "Here's your vineyard from space" is universally legible.
- Spec section to read first: §12B.1 "Honest scope" - satellite is canopy vigor + post-symptomatic damage extent, NOT pre-symptomatic detection.

### PR-H - Advisory feeds (UC IPM, BSV, INRAE, INTA)

- Source: spec §12C.
- Public + government feeds across California / Burgundy / Bordeaux / Mendoza.
- Each feed has a parser; all normalize to `advisory_event/ingested/v1.json` schema (already in registry from PR-B).
- Spanish + French translation step for INTA + BSV + INRAE.
- Multi-language briefs land here too (PR-F.5 ships EN-US only).
- Risk register entry R19: source HTML changes break the parser; defensive regex + snapshot regression tests.

### PR-D.5 / PR-E.5 - Sensor-fed WeatherWindow enrichment for ensemble runners

- Right now the aggregation engine reads only the regional-default WeatherStation.
- This PR routes SensorReading rows from connected stations into the per-block WeatherWindow that runners see.
- Material impact: leaf-wetness from Pessl/Davis sensors is real, not Gleason CART estimated → confidence on the verdict goes up.

### PR-F.5.1 - LLM-authored structured fields

- Current PR-F.5 LLM scope: prose paragraphs only.
- This follow-up would let the LLM author `split_summary` and per-driver explanations (still bounded by P-Cite verifier).

## Deferred / explicitly out of scope

| Item | Spec ref | Why deferred |
|---|---|---|
| Streaming LLM responses to UI | §13B.3 | Deterministic fallback renders instantly anyway; streaming adds complexity for a marginal UX win |
| Multi-language briefs | §13B.3 | EN-US only at MVP; bundle with PR-H translation work |
| Email-as-IO via AgentMail | §13A, §17 | Q17 resolution: AgentMail committed for post-MVP. Per-org feature flag at MVP+ |
| Per-grower tone customization (formal vs casual) | §13B.3 | Phase 2; current default is Claude's neutral-professional voice |
| LLM model A/B testing or eval harness | §13B.3 | Phase 2; would build a Brier-score eval framework |
| METER v5 migration | §12A.1 | METER ZENTRA v5 ships in 2026; pin v4 for now |
| Sencrop OAuth | §12A.2 | Phase 2; module-activation flow |
| Pessl HMAC-SHA256 single-account fallback | §12A.1 | Partner-app OAuth is the MVP path; this is for users without partner access |
| KMS-backed credential rotation | §17.1 | Post-MVP; Fernet with env-var key is good for MVP |
| Per-org Davis rate-limit tracking via Redis | §12A.1 | Phase 2; for now we surface 429 + back off; account-wide limit is 1000/hr |
| PDF audit-log MVP+ - multi-page, with weather charts | §13B.5 | Current PDF is single-page summary; richer report can come after first winery feedback |
| iOS multipart upload for files >5MB | §8.5 | M1-09 ships single-part only; multipart is M2 |
| Sign in with Apple | §20.2 | M2 per spec |

## Active risks being tracked

From `docs/spec/CODEBASE_PLAN.md` §13. The ones relevant to active work:

- **R21 (SA-2): Sensor vendor API churn.** Davis, Pessl, METER all version their APIs. Mitigation: vendor adapter pattern + contract tests + CI alert on schema drift.
- **R22 (SA-2): Satellite quota overage.** CDSE has rate caps; commercial Sentinel Hub tier scales with farm count. Mitigation: per-org quota meters; paid-tier trigger logged before user-facing degradation.
- **R23 (SA-2): Model disagreement UX.** Growers may distrust verdicts when `split_summary` shows frequent disagreement. Mitigation: in-app onboarding explains ensembles; "why this verdict?" expander surfaces drivers + citations.
- **R24 (SA-2): Agent architecture lock-in.** Picking AgentMail / Letta now and migrating later costs weeks. Mitigation: every external-runtime choice sits behind a thin adapter package.
- **D1 (PR-D plan): Pessl partner-app approval delay.** Pessl reviews manually. Mitigation: dev against `responses`-mocked fixtures; live-smoke when approval lands.
- **E1 (PR-E plan): METER webhook public path → DDoS / spam.** Mitigation: HMAC validation rejects unsigned requests fast; Cloudflare in front of Render absorbs L4 noise.
- **F1 (PR-F.5 plan): LLM hallucinates a number that coincidentally matches a verdict number.** Mitigation: verifier matches atoms exactly to specific verdict fields, not approximate-equal.

## Queued bug fixes (not blockers)

- **Caffi primary 2009 test assertion is wrong.** `test_caffi_primary_no_rain_no_infection` expects `conditions_met == 0` but with mean_temp 14°C ≥ 11°C threshold the runner correctly returns 1. Fix: drop fixture temp to 8°C so all 3 conditions truly fail, then 0 is correct.
- **Regression test for the RLS-GUC + atomic bug fixed in PR-29.** Add a test that creates an Org + Block, PATCHes via the DRF client, asserts 200. Would have caught the original bug.
- **`IntegrationStationListView.get` holds Postgres connection during vendor HTTP call.** Documented in code; refactor candidate is to hoist the HTTP call before the atomic block (same pattern as `DavisConnectView`).

## What Benson would do next if he had time

1. **Live-smoke the no-hardware demo end to end.** Wait for an aggregation tick to produce a verdict, click into the audit PDF, verify LLM prose works.
2. **Reach out to Pessl for partner-app credentials.** Liaison can draft the email; needs Benson's sign-off before sending.
3. **PR-G or PR-H.** Strategist's pick is PR-G because the visual story is more universally legible to non-technical wineries.
4. **First winery pilot - Far Niente.** John McCarthy (Director Vineyard Ops) is the warmest contact. Customer signal already validated; the ask is "give us read access to your Davis station + we'll send you daily verdicts."

## Strategic context

- Moelis IB internship starts 2026-06-01. Builds + customer outreach slow dramatically once that hits.
- Sentinel-2 + advisory feeds are not demo blockers. The decision-intelligence pipeline (sensors → ensemble → verdict → card → brief → PDF) is the whole story.
- "If you see mold, it's already too late" is the line every winery has used. That's the entire wedge.
