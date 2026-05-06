# M0-05 Plan — Satellite Map + Polygon Draw

**Status:** PLAN ONLY. No implementation in this commit. Implementation begins after Benson approves.
**Branch:** `graft-spray/m0/maps-polygon-draw`
**PR target:** `graft-spray/main`
**Depends on:** M0-03 (PR #10) merged. M0-03 ships the Block + Vineyard PostGIS models and the CRUD API; M0-05 adds the map UI that draws polygons and posts them.
**Spec section reference:** [`Graft-Spray-App-Spec.md` §8.12](../Graft-Spray-App-Spec.md), §8.9 (heatmap, deferred to M1+). [`CODEBASE_PLAN.md` §6 PR #5](../CODEBASE_PLAN.md). Open Question Q4 (Mapbox vs MapLibre) RESOLVED in this plan §2.
**Estimated diff size:** Medium-Large (~900 LoC frontend, no backend changes).
**Estimated effort:** 5 to 8 hours of frontend implementation, no Render or env-var changes.

---

## 1. Goal

After this PR lands:

- A new `/spray/vineyards` page lists the caller's Vineyards with a "Create vineyard" button.
- A new `/spray/vineyards/<vineyard_id>` page shows the Vineyard's map, the existing Blocks rendered as colored polygons, a draw-polygon tool, and a side panel for naming / editing the active Block.
- MapLibre GL renders satellite imagery (Esri World Imagery basemap, free with attribution) at sub-meter resolution where available.
- `@mapbox/mapbox-gl-draw` (works with MapLibre too) provides the polygon-draw interaction: click to add vertices, double-click or Enter to close, drag handles to refine.
- Polygons round-trip through the existing M0-03 Block API: drawn polygons POST to `/api/spray/orgs/<org>/vineyards/<vid>/blocks`, edits PATCH, archive DELETEs.
- `Vineyard.centroid` auto-updates to the centroid of constituent block geoms whenever a block is added / edited / archived.
- Each block's polygon is selectable; selection opens a side panel with name, variety, training_system, row_spacing, settings.
- "Export GeoJSON" button on a Block downloads its `geom` as a `.geojson` file.

This PR does NOT yet wire:
- Heatmap overlay (§8.9) — M1-12 once recommendations land.
- Parcel-boundary snapping — depends on a tax-parcel data layer (deferred to M0-05a).
- Water-polygon warning — depends on a water-mask raster (deferred to M0-05a).
- Edit history / immutable revisions — M0-08 (audit hardening).
- iOS map parity — M2.

## 2. Decisions locked

| Topic | Resolution | Source |
|---|---|---|
| Map library | **MapLibre GL JS** (free, OSS, MapBox-API-compatible). Mapbox GL fallback when imagery quality demands it (M0-05a if needed). | Spec §8.12, Q4 |
| Basemap (default) | **Esri World Imagery** raster tiles via the Esri public service (free with attribution; <100k requests/day cap suits M0-M1) | This plan §3 |
| Basemap (alt) | **MapTiler Cloud** ($0/free tier, 100k tiles/mo) — switchable by env var, no code change | This plan §3 |
| Polygon-draw lib | `@mapbox/mapbox-gl-draw` (Apache 2.0, works with MapLibre) | This plan §4.4 |
| Coordinate system | **EPSG:4326** (WGS84 lat/lon) end-to-end; matches PostGIS Block.geom | M0-03 |
| Centroid recompute | On every Block create/update/archive, server-side. Implemented as a Django signal in this PR. | This plan §4.6 |
| Polygon validation | Closed ring (first vertex == last), >=4 vertices (3 unique + closing), no self-intersection. Validated client-side before POST; server returns 400 on malformed geom (caught by GEOSGeometry parser today). | This plan §4.5 |
| URL convention | `/spray/vineyards` (list), `/spray/vineyards/<id>` (detail+map). Matches the M0-02a "Vineyards" sidebar nav placeholder. | M0-02a |

## 3. Pre-flight checklist

- [ ] No Mapbox API key needed at default settings. If we later switch to Mapbox imagery, that triggers the Mapbox account decision (Q4 alt path).
- [ ] No Render env-var changes.
- [ ] No Vercel env-var changes.
- [ ] `pnpm --filter @graft/web build` passes locally and in CI.
- [ ] `pnpm --filter @graft/web test` passes (~10 new tests).
- [ ] CHANGELOG.md updated.
- [ ] CODEBASE_PLAN.md PR #5 row flipped to ready-for-merge.

## 4. Implementation steps

### Step 1: Plan PR (THIS COMMIT)

This file is the only change.

### Step 2: Install MapLibre + draw deps

```sh
pnpm --filter @graft/web add maplibre-gl @mapbox/mapbox-gl-draw
pnpm --filter @graft/web add -D @types/mapbox__mapbox-gl-draw
```

The existing `mapbox-gl` and `react-map-gl` deps stay (used by the marketing `/tool` page); MapLibre is additive.

### Step 3: SprayMap component

`apps/web/components/spray/SprayMap.tsx` (client component):

- Props: `centroid: [lng, lat] | null`, `blocks: Block[]`, `onBlockSelect`, `onBlockCreate`, `onBlockUpdate`, `onBlockArchive`, `editable: boolean`.
- Mounts a MapLibre map with Esri World Imagery raster style (style URL: `https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}` with attribution).
- Initial camera: centered on `centroid` if set, else fitBounds to all block geoms, else default Napa centroid (`[-122.31, 38.30]`) at zoom 10.
- Renders existing blocks as a `geojson` source with a fill layer (50% opacity, region-themed amber) and a line layer (1px white stroke).
- When `editable`, instantiates `MapboxDraw` and wires:
  - `draw.create` → `onBlockCreate(geometry)`
  - `draw.update` → `onBlockUpdate(blockId, geometry)`
  - Click on a non-draw fill → `onBlockSelect(blockId)`
- Disposes the map on unmount.

### Step 4: Vineyards list page

`apps/web/app/spray/(app)/vineyards/page.tsx`:

- Server component.
- Reads memberships via the auth token, picks the active org (or shows "create your first org" if none — defers org-create to M0-02b which doesn't exist yet; for M0-05 we just use the user's first Membership.org).
- Fetches `GET /api/spray/orgs/<org>/vineyards`.
- Renders a list of cards: name, region, # blocks, "Open map" link.
- "Create vineyard" button opens a modal (`<CreateVineyardDialog />`); on submit POSTs and routes to the new vineyard's detail page.

### Step 5: Vineyard detail + map page

`apps/web/app/spray/(app)/vineyards/[vineyard_id]/page.tsx` (client component because the map is interactive):

- Fetches the Vineyard + its Blocks.
- Renders `<SprayMap />` taking ~70% of the viewport, with a side panel taking the rest:
  - When no block selected: list of blocks + "Draw new block" button (which flips `editable` on and arms the polygon tool).
  - When a block selected: editable form with name, variety, training_system, row_spacing, settings JSON, plus "Export GeoJSON" + "Archive" buttons.
- Side-panel save calls `PATCH /api/spray/orgs/<org>/blocks/<block_id>`.
- "Export GeoJSON" generates a download from the in-memory geom (no extra API call needed).

### Step 6: Centroid recompute

A new `services/api/spray/signals.py` (or inline in `models.py`) listens for `post_save` and `post_delete` on Block and recomputes the parent Vineyard's centroid as the union centroid of all live (non-archived) child blocks. Implemented with PostGIS:

```python
from django.contrib.gis.db.models.aggregates import Union
def recompute_vineyard_centroid(vineyard):
    union = Block.objects.unscoped().filter(
        vineyard=vineyard, archived_at__isnull=True
    ).aggregate(Union("geom"))["geom__union"]
    vineyard.centroid = union.centroid if union else None
    vineyard.save(update_fields=["centroid"])
```

Hooked via a `post_save`/`post_delete` signal that calls this in a `transaction.on_commit` so the new block is visible to the recompute.

### Step 7: Tests

`apps/web/__tests__/spray-map.test.tsx`:
- Renders SprayMap with empty blocks → confirms the map container mounts.
- Mocks `maplibregl.Map` to avoid jsdom canvas issues.
- Asserts `onBlockCreate` fires with the right geometry when MapboxDraw emits a `draw.create`.

`apps/web/__tests__/vineyards-list.test.tsx`:
- Mocks the `fetch` for `/api/spray/orgs/<org>/vineyards` and asserts list renders.
- Asserts "Create vineyard" button triggers POST.

`services/api/spray/tests/test_centroid_recompute.py`:
- Create Vineyard with no blocks → centroid is None.
- Add 2 blocks → centroid is the union centroid.
- Archive 1 block → centroid recomputes from remaining live block.
- Archive last block → centroid back to None.

### Step 8: CHANGELOG + plan-doc updates

- CHANGELOG.md gets the M0-05 entry.
- CODEBASE_PLAN.md PR #5 row updated.

### Step 9: Verification before merge

- [ ] Manual E2E on Vercel preview:
  - [ ] `/spray/vineyards` shows the list (empty state OK).
  - [ ] Create a Vineyard → land on detail page with empty map.
  - [ ] Click "Draw new block" → cursor becomes a crosshair, click to add vertices, double-click to close.
  - [ ] Polygon saves; refresh; polygon still there.
  - [ ] Click polygon → side panel shows name field; rename; save.
  - [ ] Click "Export GeoJSON" → download a valid `.geojson` with the polygon.
  - [ ] Click "Archive" → polygon disappears from map; refresh confirms.
- [ ] CI: build, lint, type-check, vitest, pytest all green.
- [ ] CHANGELOG + plan-doc rows updated.

## 5. Rollback plan

If anything breaks after merge:

- **R1 — Esri tile service rate-limits us.** Switch the basemap URL to MapTiler Cloud via env var. No code redeploy needed if env var lookup is at runtime.
- **R2 — Centroid recompute deadlocks under concurrent block writes.** Wrap the recompute in `transaction.on_commit` and `select_for_update` the parent Vineyard. If still flaky, drop the signal and recompute lazily in the API view layer.
- **R3 — MapLibre GL canvas crashes on certain mobile browsers.** Conditionally fall back to Mapbox GL via Q4 alt path; one-line env var swap.
- **R4 — Polygon validation rejects valid drawings.** Soften client-side checks; rely on PostGIS `ST_IsValid` server-side which is the canonical truth.

## 6. Risks introduced

| ID | Risk | Likelihood | Impact | Mitigation |
|---|---|---|---|---|
| **R39** (NEW) | Esri public tile service ToS change blocks free use | Low | Medium | MapTiler Cloud as drop-in alternative; runbook covers the swap. |
| **R40** (NEW) | MapLibre GL bundle size impacts marketing Lighthouse | Low | Low | Map components are inside `app/spray/(app)/**` and code-split by Next.js by default; marketing routes don't import them. |
| **R41** (NEW) | `@mapbox/mapbox-gl-draw` version mismatch with MapLibre causes silent draw failures | Medium | Low | Pin both to known-compatible versions; integration test in CI. |
| **R42** (NEW) | User draws an invalid polygon (self-intersecting) and confuses PostGIS later | Medium | Medium | Client validates before POST; server's `GEOSGeometry` parser catches at save; tests cover both paths. |
| **R43** (NEW) | Centroid recompute signal fires N times for a bulk operation, slow | Low | Low | Wrap callers in `transaction.on_commit` and dedupe by vineyard_id. Bulk-import path lands in M0-05a anyway. |

## 7. Out of scope (deferred)

- Heatmap overlay — M1-12 (depends on Recommendation engine).
- Parcel-boundary snapping — M0-05a (needs tax-parcel layer).
- Water-polygon warning — M0-05a (needs water mask raster).
- Edit history / immutable revisions — M0-08 (audit).
- iOS / React Native map parity — M2.
- KML / shapefile bulk import — M0-05a.

## 8. Effort estimate

| Step | Effort |
|---|---|
| 1 plan | 0 (this file) |
| 2 deps | 0.25h |
| 3 SprayMap component | 2h |
| 4 vineyards list page | 1h |
| 5 vineyard detail + map | 2h |
| 6 centroid recompute | 0.5h |
| 7 tests | 1.5h |
| 8 CHANGELOG / docs | 0.25h |
| 9 verification | 0.5h |
| **Total** | **~8h** |

## 9. Open questions for Benson

1. **Default basemap.** Esri World Imagery is free (with attribution) and ships sub-meter in Napa/Sonoma. MapTiler Cloud is also free at small scale. Default if silent: Esri.
2. **Default map start location for a fresh Vineyard.** Napa centroid (`-122.31, 38.30`) at zoom 10. Override only if you want a different origin.
3. **Brand color for live blocks.** Default amber `#c08a3e` matching the Spray brand. Override only if you want green / red / etc.
4. **Cascade-archive behavior.** When a block is archived, do its child entities (future capture rows, recommendations) cascade-archive? Default: nothing else exists yet at M0-05, so this question reactivates at M1-09.

If silent on all four, defaults apply.

## 10. Dependencies for downstream PRs

- **M0-05a (parcel snapping + KML import)** depends on this PR's SprayMap component.
- **M1-12 (heatmap)** layers on top of SprayMap.
- **M2 mobile** ports the polygon UX to React Native maps.
