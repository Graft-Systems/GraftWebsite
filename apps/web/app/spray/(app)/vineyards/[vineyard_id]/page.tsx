/**
 * Vineyard detail + map page (M0-05 step 5).
 *
 * Renders the SprayMap on the left (~70%) and a side panel on the
 * right with the active block's editable fields.
 */
"use client";

import {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
  type Dispatch,
  type SetStateAction,
} from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import {
  SprayMap,
  type BlockFeature,
  type VineMapFeature,
  type VinePlacementMode,
} from "@/components/spray/SprayMap";
import { BlockVinePanel } from "@/components/spray/BlockVinePanel";
import { SprayMapAddressSearch } from "@/components/spray/SprayMapAddressSearch";
import { CaptureUploader } from "@/components/spray/CaptureUploader";
import {
  formatSprayHttpError,
  orgCanArchiveVineyards,
  useActiveOrg,
} from "@/lib/sprayApi";
import { SPRAY_REGION_OPTIONS } from "@/lib/sprayRegions";
import { useBlockVinePlacement } from "@/lib/useBlockVinePlacement";
import { defaultRowLengthM } from "@/lib/vinePlacementUtils";

export type VinePlacementHandlers = {
  placeSingleVine: (lngLat: [number, number]) => void;
  placeRowCommit: (segment: {
    start: [number, number];
    end: [number, number];
  }) => void;
  rowDefaultLengthM: number;
  busy: boolean;
  error: string | null;
  setError: (msg: string | null) => void;
  loadVines: () => Promise<void>;
};

type Vineyard = {
  id: string;
  name: string;
  region: string;
  centroid: GeoJSON.Point | null;
  archived_at: string | null;
};

type Block = {
  id: string;
  name: string;
  geom: GeoJSON.Polygon | GeoJSON.MultiPolygon;
  variety: string;
  training_system: string;
  row_spacing_m: string | null;
  archived_at: string | null;
};

export default function VineyardDetailPage() {
  const params = useParams<{ vineyard_id: string }>();
  const router = useRouter();
  const vineyardId = params.vineyard_id;
  const { org, loading: orgLoading, authedFetch } = useActiveOrg();

  const [vineyard, setVineyard] = useState<Vineyard | null>(null);
  const [blocks, setBlocks] = useState<Block[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [deletingVineyard, setDeletingVineyard] = useState(false);
  const [editingVineyard, setEditingVineyard] = useState(false);
  const [editName, setEditName] = useState("");
  const [editRegion, setEditRegion] = useState("");
  const [savingVineyard, setSavingVineyard] = useState(false);
  const [editable, setEditable] = useState(false);
  const [footprintExtend, setFootprintExtend] = useState(false);
  const [footprintErase, setFootprintErase] = useState(false);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [vines, setVines] = useState<VineMapFeature[]>([]);
  const [vinePlacementMode, setVinePlacementMode] = useState<VinePlacementMode>(null);
  const [selectedVineId, setSelectedVineId] = useState<string | null>(null);
  const [rowIndex, setRowIndex] = useState("1");
  const [rowCount, setRowCount] = useState("12");
  const [vineNodeScale, setVineNodeScale] = useState(1.0);
  const mapFlyToRef = useRef<((lng: number, lat: number, zoom?: number) => void) | null>(
    null,
  );

  const selectedBlock = blocks.find((b) => b.id === selectedId) ?? null;

  const toggleFootprintExtend = useCallback(() => {
    setFootprintExtend((x) => {
      if (x) return false;
      setFootprintErase(false);
      setEditable(false);
      setVinePlacementMode(null);
      return true;
    });
  }, []);

  const toggleFootprintErase = useCallback(() => {
    setFootprintErase((x) => {
      if (x) return false;
      setFootprintExtend(false);
      setEditable(false);
      setVinePlacementMode(null);
      return true;
    });
  }, []);

  const toggleBlockEditable = useCallback(() => {
    setEditable((x) => {
      if (x) return false;
      setFootprintExtend(false);
      setFootprintErase(false);
      setVinePlacementMode(null);
      return true;
    });
  }, []);

  const {
    busy,
    error: vineError,
    setError: setVineError,
    loadVines,
    placeSingleVine,
    placeRowCommit,
    updateVineStatus,
    deleteVine,
    clearRow,
  } = useBlockVinePlacement({
    orgId: org?.id ?? null,
    blockId: selectedBlock?.id ?? null,
    blockGeom: selectedBlock?.geom ?? null,
    authedFetch,
    vines,
    onVinesChange: setVines,
    rowIndex,
    rowCount,
    onPlacementModeChange: setVinePlacementMode,
  });

  const onVineMapClick = useCallback((lngLat: [number, number]) => {
    void placeSingleVine(lngLat);
  }, [placeSingleVine]);

  const onVineRowCommit = useCallback(
    (segment: { start: [number, number]; end: [number, number] }) => {
      void placeRowCommit(segment);
    },
    [placeRowCommit],
  );

  useEffect(() => {
    if (!selectedId) setFootprintExtend(false);
  }, [selectedId]);

  useEffect(() => {
    setVines([]);
    setVinePlacementMode(null);
    setSelectedVineId(null);
  }, [selectedId]);

  useEffect(() => {
    if (!org || !vineyardId) return;
    const orgId = org.id;
    let cancelled = false;
    async function load() {
      try {
        const [vRes, bRes] = await Promise.all([
          authedFetch(`/api/spray/orgs/${orgId}/vineyards/${vineyardId}`),
          authedFetch(`/api/spray/orgs/${orgId}/vineyards/${vineyardId}/blocks`),
        ]);
        if (!vRes.ok) throw new Error(`vineyard ${vRes.status}`);
        if (!bRes.ok) throw new Error(`blocks ${bRes.status}`);

        if (cancelled) return;
        setVineyard(await vRes.json());
        setBlocks(await bRes.json());
      } catch (e) {
        if (!cancelled) setError(e instanceof Error ? e.message : "load failed");
      }
    }
    void load();
    return () => {
      cancelled = true;
    };
  }, [authedFetch, org, vineyardId]);

  const blockFeatures: BlockFeature[] = useMemo(
    () =>
      blocks.map((b) => ({
        id: b.id,
        name: b.name,
        geom: b.geom,
        archived: b.archived_at !== null,
      })),
    [blocks],
  );

  const centroid: [number, number] | null = useMemo(() => {
    if (!vineyard?.centroid) return null;
    const [lng, lat] = vineyard.centroid.coordinates;
    return [lng, lat];
  }, [vineyard]);

  async function handleBlockExtend(blockId: string, geom: GeoJSON.Polygon) {
    if (!org) return;
    const res = await authedFetch(`/api/spray/orgs/${org.id}/blocks/${blockId}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ append_geom: geom }),
    });
    if (!res.ok) {
      setError(await formatSprayHttpError(res));
      throw new Error("block extend failed");
    }
    const updated = (await res.json()) as Block;
    setBlocks((prev) => prev.map((b) => (b.id === updated.id ? updated : b)));
    setFootprintExtend(false);
  }

  async function handleBlockErase(blockId: string, geom: GeoJSON.Polygon) {
    if (!org) return;
    const res = await authedFetch(`/api/spray/orgs/${org.id}/blocks/${blockId}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ subtract_geom: geom }),
    });
    if (!res.ok) {
      setError(await formatSprayHttpError(res));
      throw new Error("block erase failed");
    }
    const updated = (await res.json()) as Block;
    setBlocks((prev) => prev.map((b) => (b.id === updated.id ? updated : b)));
    setFootprintErase(false);
  }

  function selectBlock(blockId: string | null) {
    if (blockId !== selectedId) {
      setFootprintExtend(false);
      setFootprintErase(false);
      setVinePlacementMode(null);
    }
    setSelectedId(blockId);
  }

  async function handleBlockCreate(geom: GeoJSON.Polygon) {
    if (!org) return;
    const name = `Block ${blocks.length + 1}`;
    const res = await authedFetch(
      `/api/spray/orgs/${org.id}/vineyards/${vineyardId}/blocks`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name, geom, variety: "Unknown", training_system: "VSP" }),
      },
    );
    if (!res.ok) {
      setError(await formatSprayHttpError(res));
      throw new Error("block create failed");
    }
    const created = (await res.json()) as Block;
    setBlocks((prev) => [...prev, created]);
    setEditable(false);

    const [vRes, bRes] = await Promise.all([
      authedFetch(`/api/spray/orgs/${org.id}/vineyards/${vineyardId}`),
      authedFetch(`/api/spray/orgs/${org.id}/vineyards/${vineyardId}/blocks`),
    ]);
    if (vRes.ok) setVineyard((await vRes.json()) as Vineyard);
    if (bRes.ok) setBlocks((await bRes.json()) as Block[]);
  }

  async function patchBlock(blockId: string, patch: Partial<Block>) {
    if (!org) return;
    const res = await authedFetch(`/api/spray/orgs/${org.id}/blocks/${blockId}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(patch),
    });
    if (!res.ok) {
      setError(`patch block ${res.status}`);
      return;
    }
    const updated = (await res.json()) as Block;
    setBlocks((prev) => prev.map((b) => (b.id === updated.id ? updated : b)));
  }

  async function deleteBlock(blockId: string) {
    if (!org) return;
    if (!confirm("Delete this block? This cannot be undone.")) return;
    const res = await authedFetch(`/api/spray/orgs/${org.id}/blocks/${blockId}`, {
      method: "DELETE",
    });
    if (!res.ok) {
      setError(`delete block ${res.status}`);
      return;
    }
    setBlocks((prev) => prev.filter((b) => b.id !== blockId));
    setSelectedId(null);
  }

  function handleBlockUpdate(_geom: GeoJSON.Polygon) {
    /* vertex drag edit mode not wired — polygon replace uses PATCH from editor */
  }

  function exportGeoJSON(block: Block) {
    const blob = new Blob([JSON.stringify(block.geom, null, 2)], {
      type: "application/geo+json",
    });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `${block.name.replace(/\s+/g, "-")}.geojson`;
    a.click();
    URL.revokeObjectURL(url);
  }

  async function archiveVineyard() {
    if (!org || !vineyard) return;
    if (
      !window.confirm(
        `Archive vineyard “${vineyard.name}”? All blocks here will be archived and removed from the active list.`,
      )
    ) {
      return;
    }
    setDeletingVineyard(true);
    setError(null);
    try {
      const res = await authedFetch(`/api/spray/orgs/${org.id}/vineyards/${vineyardId}`, {
        method: "DELETE",
      });
      if (res.status === 204) {
        router.push("/spray/vineyards");
        return;
      }
      setError(await formatSprayHttpError(res));
    } catch (e) {
      setError(e instanceof Error ? e.message : "Could not archive vineyard");
    } finally {
      setDeletingVineyard(false);
    }
  }

  function startEditVineyard() {
    if (!vineyard) return;
    setEditName(vineyard.name);
    setEditRegion(vineyard.region);
    setEditingVineyard(true);
  }

  async function saveVineyardEdit() {
    if (!org || !vineyard) return;
    setSavingVineyard(true);
    setError(null);
    try {
      const res = await authedFetch(`/api/spray/orgs/${org.id}/vineyards/${vineyardId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: editName.trim(), region: editRegion }),
      });
      if (!res.ok) {
        setError(await formatSprayHttpError(res));
        return;
      }
      setVineyard((await res.json()) as Vineyard);
      setEditingVineyard(false);
    } finally {
      setSavingVineyard(false);
    }
  }

  const canArchiveVineyard = orgCanArchiveVineyards(org);

  if (!org && !orgLoading) {
    return (
      <div className="p-6">
        <p className="text-sm text-foreground/60">Sign in to manage vineyards.</p>
      </div>
    );
  }

  return (
    <div className="-m-4 flex flex-1 flex-col overflow-hidden md:-m-6 md:h-[calc(100vh-4rem)] md:flex-row">
      <div className="flex min-w-0 flex-1 flex-col border-b border-border/40 md:border-b-0">
        <div className="shrink-0 bg-background/60 px-6 py-3">
          <Link
            href="/spray/vineyards"
            className="frame text-xs font-semibold text-foreground/60 transition-colors hover:text-amber"
          >
            ← Vineyards
          </Link>
          {vineyard && (
            <div className="mt-1 flex flex-wrap items-start justify-between gap-3">
              <h1 className="font-display text-xl">{vineyard.name}</h1>
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={startEditVineyard}
                  className="rounded-md border border-border/40 px-3 py-1.5 frame text-xs font-semibold uppercase tracking-wide text-foreground/60 transition-colors hover:border-amber/60 hover:text-amber"
                >
                  Edit
                </button>
                {canArchiveVineyard && (
                  <button
                    type="button"
                    onClick={() => void archiveVineyard()}
                    disabled={deletingVineyard}
                    className="shrink-0 rounded-md border border-red-500/40 px-3 py-1.5 frame text-xs font-semibold uppercase tracking-wide text-red-300 transition-colors hover:bg-red-500/10 disabled:opacity-40"
                  >
                    {deletingVineyard ? "Archiving…" : "Delete vineyard"}
                  </button>
                )}
              </div>
            </div>
          )}
          {vineyard && editingVineyard && (
            <div className="mt-2 flex flex-wrap items-end gap-2">
              <label className="flex flex-col gap-1">
                <span className="text-xs text-foreground/50">Name</span>
                <input
                  value={editName}
                  onChange={(e) => setEditName(e.target.value)}
                  className="h-9 rounded-md border border-border/40 bg-background/60 px-3 text-sm"
                />
              </label>
              <label className="flex flex-col gap-1">
                <span className="text-xs text-foreground/50">Region</span>
                <select
                  value={editRegion}
                  onChange={(e) => setEditRegion(e.target.value)}
                  className="h-9 rounded-md border border-border/40 bg-background/60 px-3 text-sm"
                >
                  {SPRAY_REGION_OPTIONS.map((o) => (
                    <option key={o.value} value={o.value}>
                      {o.label}
                    </option>
                  ))}
                </select>
              </label>
              <button
                type="button"
                onClick={() => void saveVineyardEdit()}
                disabled={savingVineyard || !editName.trim()}
                className="h-9 rounded-md bg-amber px-4 frame text-xs font-semibold text-background transition-colors hover:bg-amber/90 disabled:opacity-40"
              >
                {savingVineyard ? "Saving…" : "Save"}
              </button>
              <button
                type="button"
                onClick={() => setEditingVineyard(false)}
                className="h-9 rounded-md border border-border/40 px-3 frame text-xs font-semibold text-foreground/60 transition-colors hover:text-foreground"
              >
                Cancel
              </button>
            </div>
          )}
        </div>

        {error && (
          <p className="mx-6 mt-3 rounded-md border border-red-500/50 bg-red-500/10 p-3 text-sm text-red-300">
            {error}
          </p>
        )}

        {vineyard && !centroid && (
          <p className="mx-6 mt-3 rounded-md border border-amber/40 bg-amber/10 p-3 text-sm text-amber">
            This vineyard has no map centroid yet. The map defaults to Napa until coordinates are set.
          </p>
        )}

        <div className="flex min-h-0 flex-1 flex-col">
          <div className="shrink-0 space-y-3 border-b border-border/40 bg-background/50 px-4 py-3">
            <SprayMapAddressSearch
              className="max-w-md"
              onFlyTo={(lng, lat) => mapFlyToRef.current?.(lng, lat)}
            />

            {selectedBlock && org && (
              <div className="flex flex-col gap-3 lg:flex-row lg:items-stretch">
                <div className="min-w-0 flex-1 rounded-lg border border-border/50 bg-background/80 p-3">
                  <p className="text-[0.65rem] font-semibold uppercase tracking-wider text-foreground/55">
                    Block footprint
                  </p>
                  <div className="mt-2 flex flex-wrap items-center gap-2">
                    <button
                      type="button"
                      onClick={toggleFootprintExtend}
                      disabled={footprintErase || editable}
                      className={`min-h-[36px] rounded-md border px-3 py-1.5 frame text-xs font-semibold transition-colors disabled:opacity-40 ${
                        footprintExtend
                          ? "border-amber/70 bg-amber/15 text-foreground hover:bg-amber/25"
                          : "border-border/60 text-foreground/85 hover:bg-background/80"
                      }`}
                    >
                      {footprintExtend ? "Cancel extend" : "Add to footprint"}
                    </button>
                    <button
                      type="button"
                      onClick={toggleFootprintErase}
                      disabled={footprintExtend || editable}
                      className={`min-h-[36px] rounded-md border px-3 py-1.5 frame text-xs font-semibold transition-colors disabled:opacity-40 ${
                        footprintErase
                          ? "border-red-500/50 bg-red-500/10 text-red-300 hover:bg-red-500/20"
                          : "border-border/60 text-foreground/85 hover:bg-background/80"
                      }`}
                    >
                      {footprintErase ? "Cancel erase" : "Erase from footprint"}
                    </button>
                  </div>
                  {footprintExtend && (
                    <p className="mt-2 text-[0.65rem] leading-relaxed text-foreground/55">
                      Draw a rectangle or polygon on the map (top-left). Shapes merge into this
                      block.
                    </p>
                  )}
                  {footprintErase && (
                    <p className="mt-2 text-[0.65rem] leading-relaxed text-amber/90">
                      Draw a rectangle or polygon on the map. Shapes are subtracted from this
                      block.
                    </p>
                  )}
                </div>

                {!footprintExtend && !footprintErase && !editable && (
                  <div className="min-w-0 flex-[1.4] rounded-lg border border-amber/30 bg-background/80 p-3">
                    <p className="text-[0.65rem] font-semibold uppercase tracking-wider text-foreground/55">
                      Vine map
                    </p>
                    <div className="mt-2">
                      <BlockVinePanel
                        blockId={selectedBlock.id}
                        placementMode={vinePlacementMode}
                        onPlacementModeChange={(mode) => {
                          setVinePlacementMode(mode);
                          if (mode) {
                            setEditable(false);
                            setFootprintExtend(false);
                          }
                        }}
                        rowIndex={rowIndex}
                        onRowIndexChange={setRowIndex}
                        rowCount={rowCount}
                        onRowCountChange={setRowCount}
                        nodeScale={vineNodeScale}
                        onNodeScaleChange={setVineNodeScale}
                        busy={busy}
                        error={vineError}
                        setError={setVineError}
                      />
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>

          <div className="relative min-h-[280px] flex-1">
            <SprayMap
            centroid={centroid}
            vineyardName={vineyard?.name ?? null}
            blocks={blockFeatures}
            selectedBlockId={selectedId}
            editable={editable && !vinePlacementMode}
            extendBlockId={footprintExtend && !vinePlacementMode ? selectedId : null}
            onBlockExtend={handleBlockExtend}
            eraseBlockId={footprintErase && !vinePlacementMode ? selectedId : null}
            onBlockErase={handleBlockErase}
            onBlockSelect={selectBlock}
            onBlockCreate={handleBlockCreate}
            onBlockUpdate={handleBlockUpdate}
            vines={selectedId ? vines : []}
            selectedVineId={selectedVineId}
            vinePlacementMode={selectedId ? vinePlacementMode : null}
            onVineSelect={setSelectedVineId}
            onVineMapClick={selectedId ? onVineMapClick : undefined}
            onVineRowCommit={selectedId ? onVineRowCommit : undefined}
            vineRowPreviewCount={parseInt(rowCount, 10) || 0}
            rowDefaultLengthM={defaultRowLengthM(
              selectedBlock?.row_spacing_m,
              parseInt(rowCount, 10) || 12,
            )}
            vineNodeScale={vineNodeScale}
            suppressBlockSelect={vinePlacementMode != null}
            showAddressSearch={false}
            onMapReady={({ flyTo }) => {
              mapFlyToRef.current = flyTo;
            }}
            className="h-full w-full"
          />
          </div>
        </div>
      </div>

      <aside
        className="flex h-1/2 w-full shrink-0 flex-col overflow-y-auto border-t border-border/40 bg-background/40 p-5 [-webkit-overflow-scrolling:touch] md:h-full md:w-80 md:max-w-[20rem] md:border-l md:border-t-0"
        data-lenis-prevent
      >
          {!selectedBlock && (
            <>
              <h2 className="frame text-xs font-semibold uppercase tracking-wider text-foreground/60">
                Blocks ({blockFeatures.length})
              </h2>
              <ul className="mt-4 space-y-2">
                {blocks
                  .filter((b) => b.archived_at === null)
                  .map((b) => (
                    <li key={b.id}>
                      <button
                        type="button"
                        onClick={() => selectBlock(b.id)}
                        className="block min-h-[44px] w-full rounded-md border border-border/40 bg-background/40 px-3 py-3 text-left text-sm transition-colors hover:border-amber/60"
                      >
                        {b.name}
                      </button>
                    </li>
                  ))}
              </ul>
              <button
                type="button"
                onClick={() => {
                  setFootprintExtend(false);
                  setEditable((e) => !e);
                }}
                className="mt-6 min-h-[44px] w-full rounded-md bg-amber px-4 py-2 frame text-xs font-semibold text-background transition-colors hover:bg-amber/90"
              >
                {editable ? "Cancel drawing" : "Draw new block"}
              </button>
              {editable && (
                <p className="mt-3 text-xs text-foreground/60">
                  Use the map toolbar: <strong>Rectangle</strong> (click-drag) or{" "}
                  <strong>Polygon</strong> (tap corners, then Done). Esc cancels polygon points.
                </p>
              )}
            </>
          )}

          {selectedBlock && org && (
            <BlockEditor
              block={selectedBlock}
              onClose={() => selectBlock(null)}
              onSave={(patch) => patchBlock(selectedBlock.id, patch)}
              onDelete={() => deleteBlock(selectedBlock.id)}
              onExport={() => exportGeoJSON(selectedBlock)}
              orgId={org.id}
              authedFetch={authedFetch}
              vines={vines}
              selectedVineId={selectedVineId}
              onSelectVine={setSelectedVineId}
              updateVineStatus={updateVineStatus}
              deleteVine={deleteVine}
              clearRow={clearRow}
              busy={busy}
            />
          )}
        </aside>
      </div>
  );
}

function BlockEditor({
  block,
  onClose,
  onSave,
  onDelete,
  onExport,
  orgId,
  authedFetch,
  vines,
  selectedVineId,
  onSelectVine,
  updateVineStatus,
  deleteVine,
  clearRow,
  busy,
}: {
  block: Block;
  onClose: () => void;
  onSave: (patch: Partial<Block>) => Promise<void>;
  onDelete: () => Promise<void>;
  onExport: () => void;
  orgId: string;
  authedFetch: (path: string, init?: RequestInit) => Promise<Response>;
  vines: VineMapFeature[];
  selectedVineId: string | null;
  onSelectVine: (id: string | null) => void;
  updateVineStatus: (vineId: string, status: VineMapFeature["status"]) => Promise<void>;
  deleteVine: (vineId: string, onSelectVine: (id: string | null) => void) => Promise<void>;
  clearRow: (row: number, onSelectVine: (id: string | null) => void) => Promise<void>;
  busy: boolean;
}) {
  const [name, setName] = useState(block.name);
  const [variety, setVariety] = useState(block.variety);
  const [training, setTraining] = useState(block.training_system);
  const [rowSpacing, setRowSpacing] = useState(block.row_spacing_m ?? "");
  const [saving, setSaving] = useState(false);
  const [saveSuccess, setSaveSuccess] = useState(false);
  const [captures, setCaptures] = useState<import("@/components/spray/CaptureUploader").UploadedCapture[]>([]);
  const [loadingCaptures, setLoadingCaptures] = useState(false);

  useEffect(() => {
    setName(block.name);
    setVariety(block.variety);
    setTraining(block.training_system);
    setRowSpacing(block.row_spacing_m ?? "");
    setSaveSuccess(false);
    void loadCaptures();
  }, [block.id]);

  async function loadCaptures() {
    setLoadingCaptures(true);
    try {
      const res = await authedFetch(`/api/spray/orgs/${orgId}/captures?block_id=${block.id}&limit=6`);
      if (res.ok) {
        setCaptures(await res.json());
      }
    } catch {
      /* ignore */
    } finally {
      setLoadingCaptures(false);
    }
  }

  async function handleSave() {
    setSaving(true);
    setSaveSuccess(false);
    try {
      await onSave({
        name,
        variety,
        training_system: training,
        row_spacing_m: rowSpacing || null,
      });
      setSaveSuccess(true);
      setTimeout(() => setSaveSuccess(false), 3000);
    } finally {
      setSaving(false);
    }
  }

  const vinesByRow = useMemo(() => {
    const map = new Map<number, VineMapFeature[]>();
    for (const v of vines) {
      const list = map.get(v.row_index) ?? [];
      list.push(v);
      map.set(v.row_index, list);
    }
    for (const list of map.values()) {
      list.sort((a, b) => a.vine_index - b.vine_index);
    }
    return [...map.entries()].sort((a, b) => a[0] - b[0]);
  }, [vines]);

  const selectedVine = vines.find((v) => v.id === selectedVineId) ?? null;
  const STATUS_OPTIONS: { value: VineMapFeature["status"]; label: string }[] = [
    { value: "ok", label: "OK" },
    { value: "watch", label: "Watch" },
    { value: "alert", label: "Alert" },
  ];

  return (
    <>
      <div className="flex items-center justify-between">
        <h2 className="font-display text-lg">{block.name}</h2>
        <button
          type="button"
          onClick={onClose}
          className="min-h-[44px] min-w-[44px] text-xs text-foreground/50 hover:text-foreground"
        >
          ✕
        </button>
      </div>

      <div className="mt-6 space-y-4">
        <Field label="Name" value={name} onChange={setName} />
        <Field label="Variety" value={variety} onChange={setVariety} />
        <Field label="Training system" value={training} onChange={setTraining} />
        <Field
          label="Row spacing (m)"
          value={rowSpacing}
          onChange={setRowSpacing}
          inputMode="decimal"
        />
      </div>

      <div className="mt-8 space-y-2">
        <button
          type="button"
          onClick={handleSave}
          disabled={saving}
          className={`min-h-[44px] w-full rounded-md px-4 py-2 frame text-xs font-semibold transition-all ${
            saveSuccess
              ? "bg-emerald-500 text-background"
              : "bg-amber text-background hover:bg-amber/90 disabled:opacity-50"
          }`}
        >
          {saving ? "Saving…" : saveSuccess ? "✓ Saved" : "Save changes"}
        </button>
        <button
          type="button"
          onClick={onExport}
          className="min-h-[44px] w-full rounded-md border border-border/60 px-4 py-2 frame text-xs font-semibold text-foreground/70 transition-colors hover:text-foreground"
        >
          Export GeoJSON
        </button>
        <button
          type="button"
          onClick={onDelete}
          className="min-h-[44px] w-full rounded-md border border-red-500/40 px-4 py-2 frame text-xs font-semibold text-red-400 transition-colors hover:border-red-500"
        >
          Delete block
        </button>
      </div>

      <div className="mt-8">
        <h3 className="frame text-xs font-semibold uppercase tracking-wider text-foreground/60">
          Vines
        </h3>
        <p className="mt-1 text-[0.65rem] text-foreground/50">
          {vines.length} vine{vines.length === 1 ? "" : "s"} on this block
        </p>

        {selectedVine && (
          <div className="mt-4 rounded-md border border-amber/30 bg-amber/5 p-3">
            <p className="text-xs font-semibold text-foreground/80">
              Row {selectedVine.row_index} · Vine {selectedVine.vine_index}
            </p>
            <label className="mt-2 block text-xs text-foreground/60">
              Status
              <select
                value={selectedVine.status}
                disabled={busy}
                onChange={(e) =>
                  void updateVineStatus(
                    selectedVine.id,
                    e.target.value as VineMapFeature["status"],
                  )
                }
                className="mt-1 w-full rounded-md border border-border/40 bg-background/60 px-2 py-1.5 text-sm"
              >
                {STATUS_OPTIONS.map((o) => (
                  <option key={o.value} value={o.value}>
                    {o.label}
                  </option>
                ))}
              </select>
            </label>
            <button
              type="button"
              disabled={busy}
              onClick={() => void deleteVine(selectedVine.id, onSelectVine)}
              className="mt-2 text-xs text-red-300 hover:text-red-200"
            >
              Remove vine
            </button>
          </div>
        )}

        <ul className="mt-4 max-h-40 space-y-2 overflow-y-auto text-xs">
          {vinesByRow.length === 0 && (
            <li className="text-foreground/45">No vines mapped yet. Use the tools on the map to add vines.</li>
          )}
          {vinesByRow.map(([row, rowVines]) => (
            <li
              key={row}
              className="flex items-center justify-between gap-2 rounded-md border border-border/30 bg-background/30 px-2 py-1.5"
            >
              <span className="font-medium text-foreground/70">
                Row {row} · {rowVines.length} vines
              </span>
              <button
                type="button"
                disabled={busy}
                onClick={() => void clearRow(row, onSelectVine)}
                className="text-[0.65rem] text-red-300/80 hover:text-red-300"
              >
                Clear
              </button>
            </li>
          ))}
        </ul>
      </div>

      <div className="mt-8 border-t border-border/40 pt-8">
        <div className="flex items-center justify-between gap-2">
          <h3 className="frame text-xs font-semibold uppercase tracking-wider text-foreground/60">
            Captures
          </h3>
          {captures.length > 0 && (
            <Link
              href="/spray/captures"
              className="text-[0.65rem] font-semibold text-amber hover:underline"
            >
              View all
            </Link>
          )}
        </div>

        {captures.length > 0 && (
          <div className="mt-3 grid grid-cols-3 gap-2">
            {captures.map((c) => (
              <Link
                key={c.id}
                href={`/spray/captures/${c.id}`}
                className="aspect-square overflow-hidden rounded-md border border-border/30 bg-background/40 transition-colors hover:border-amber/50"
              >
                {c.download_url ? (
                  <img
                    src={c.download_url}
                    alt=""
                    className="h-full w-full object-cover"
                  />
                ) : (
                  <div className="flex h-full items-center justify-center text-[0.6rem] text-foreground/40">
                    {c.status}
                  </div>
                )}
              </Link>
            ))}
          </div>
        )}

        {loadingCaptures && captures.length === 0 && (
          <div className="mt-3 grid grid-cols-3 gap-2">
            {[1, 2, 3].map((i) => (
              <div key={i} className="aspect-square animate-pulse rounded-md bg-foreground/5" />
            ))}
          </div>
        )}

        <CaptureUploader
          orgId={orgId}
          blockId={block.id}
          onCaptureUploaded={() => {
            void loadCaptures();
          }}
        />
      </div>
    </>
  );
}


function Field({
  label,
  value,
  onChange,
  inputMode,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  inputMode?: "decimal" | "text";
}) {
  return (
    <label className="block">
      <span className="text-sm text-foreground/60">{label}</span>
      <input
        value={value}
        onChange={(e) => onChange(e.target.value)}
        inputMode={inputMode}
        className="mt-1 w-full rounded-md border border-border/40 bg-background/60 px-3 py-2"
      />
    </label>
  );
}
