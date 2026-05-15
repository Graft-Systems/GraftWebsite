/**
 * Vineyard detail + map page (M0-05 step 5).
 *
 * Renders the SprayMap on the left (~70%) and a side panel on the
 * right with the active block's editable fields.
 */
"use client";

import { useEffect, useMemo, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import { SprayMap, type BlockFeature } from "@/components/spray/SprayMap";
import { CaptureUploader } from "@/components/spray/CaptureUploader";
import {
  formatSprayHttpError,
  orgCanArchiveVineyards,
  useActiveOrg,
} from "@/lib/sprayApi";

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
  const [editable, setEditable] = useState(false);
  const [footprintExtend, setFootprintExtend] = useState(false);
  const [selectedId, setSelectedId] = useState<string | null>(null);

  useEffect(() => {
    if (!selectedId) setFootprintExtend(false);
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

  function selectBlock(blockId: string | null) {
    if (blockId !== selectedId) setFootprintExtend(false);
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

  const selectedBlock = blocks.find((b) => b.id === selectedId) ?? null;
  const canArchiveVineyard = orgCanArchiveVineyards(org);

  if (!org && !orgLoading) {
    return (
      <div className="p-6">
        <p className="text-sm text-foreground/60">Sign in to manage vineyards.</p>
      </div>
    );
  }

  return (
    <div className="-m-6 flex min-h-0 min-w-0 flex-1 flex-col">
      <div className="shrink-0 border-b border-border/40 bg-background/60 px-6 py-3">
        <Link
          href="/spray/vineyards"
          className="frame text-xs font-semibold text-foreground/60 transition-colors hover:text-amber"
        >
          ← Vineyards
        </Link>
        {vineyard && (
          <div className="mt-1 flex flex-wrap items-start justify-between gap-3">
            <h1 className="font-display text-xl">{vineyard.name}</h1>
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

      <div className="flex min-h-0 flex-1 flex-col md:flex-row md:items-stretch md:overflow-hidden">
        <div className="h-[min(45vh,24rem)] min-h-[280px] w-full min-w-0 shrink-0 md:h-auto md:min-h-0 md:flex-1">
          <SprayMap
            centroid={centroid}
            vineyardName={vineyard?.name ?? null}
            blocks={blockFeatures}
            selectedBlockId={selectedId}
            editable={editable}
            extendBlockId={footprintExtend ? selectedId : null}
            onBlockExtend={handleBlockExtend}
            onBlockSelect={selectBlock}
            onBlockCreate={handleBlockCreate}
            onBlockUpdate={handleBlockUpdate}
            className="h-full min-h-[280px] w-full md:min-h-0"
          />
        </div>

        <aside
          className="min-h-0 w-full shrink-0 border-t border-border/40 bg-background/40 p-5 [-webkit-overflow-scrolling:touch] [touch-action:pan-y] md:h-full md:min-h-0 md:w-80 md:max-w-[20rem] md:shrink-0 md:self-stretch md:overflow-y-auto md:overscroll-y-contain md:border-l md:border-t-0"
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
              footprintExtendActive={footprintExtend}
              onToggleFootprintExtend={() => {
                setFootprintExtend((x) => {
                  if (x) return false;
                  setEditable(false);
                  return true;
                });
              }}
              onClose={() => selectBlock(null)}
              onSave={(patch) => patchBlock(selectedBlock.id, patch)}
              onDelete={() => deleteBlock(selectedBlock.id)}
              onExport={() => exportGeoJSON(selectedBlock)}
              orgId={org.id}
            />
          )}
        </aside>
      </div>
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
  footprintExtendActive,
  onToggleFootprintExtend,
}: {
  block: Block;
  onClose: () => void;
  onSave: (patch: Partial<Block>) => Promise<void>;
  onDelete: () => Promise<void>;
  onExport: () => void;
  orgId: string;
  footprintExtendActive: boolean;
  onToggleFootprintExtend: () => void;
}) {
  const [name, setName] = useState(block.name);
  const [variety, setVariety] = useState(block.variety);
  const [training, setTraining] = useState(block.training_system);
  const [rowSpacing, setRowSpacing] = useState(block.row_spacing_m ?? "");

  async function handleSave() {
    await onSave({
      name,
      variety,
      training_system: training,
      row_spacing_m: rowSpacing || null,
    });
  }

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
          className="min-h-[44px] w-full rounded-md bg-amber px-4 py-2 frame text-xs font-semibold text-background transition-colors hover:bg-amber/90"
        >
          Save changes
        </button>
        <button
          type="button"
          onClick={onToggleFootprintExtend}
          className={`min-h-[44px] w-full rounded-md border px-4 py-2 frame text-xs font-semibold transition-colors ${
            footprintExtendActive
              ? "border-amber/70 bg-amber/15 text-foreground hover:bg-amber/25"
              : "border-border/60 text-foreground/85 hover:bg-background/80"
          }`}
        >
          {footprintExtendActive ? "Cancel extend" : "Add to footprint"}
        </button>
        {footprintExtendActive && (
          <p className="text-xs text-foreground/60">
            Draw a rectangle or polygon on the map; it merges into this block&apos;s geometry.
          </p>
        )}
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
          Captures
        </h3>
        <CaptureUploader
          orgId={orgId}
          blockId={block.id}
          onCaptureUploaded={() => {
            /* list lives on /spray/captures */
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
