/**
 * Vineyard detail + map page (M0-05 step 5).
 *
 * Renders the SprayMap on the left (~70%) and a side panel on the
 * right with the active block's editable fields.
 */
"use client";

import { useEffect, useMemo, useState } from "react";
import { useParams } from "next/navigation";
import Link from "next/link";
import { SprayMap, type BlockFeature } from "@/components/spray/SprayMap";
import { CaptureUploader } from "@/components/spray/CaptureUploader";
import { useActiveOrg } from "@/lib/sprayApi";

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
  geom: GeoJSON.Polygon;
  variety: string;
  training_system: string;
  row_spacing_m: string | null;
  archived_at: string | null;
};

export default function VineyardDetailPage() {
  const params = useParams<{ vineyard_id: string }>();
  const vineyardId = params.vineyard_id;
  const { org, loading: orgLoading, authedFetch } = useActiveOrg();

  const [vineyard, setVineyard] = useState<Vineyard | null>(null);
  const [blocks, setBlocks] = useState<Block[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [editable, setEditable] = useState(false);
  const [selectedId, setSelectedId] = useState<string | null>(null);

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
      setError(`create block ${res.status}`);
      return;
    }
    const created = (await res.json()) as Block;
    setBlocks((prev) => [...prev, created]);
    setEditable(false);
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

  async function archiveBlock(blockId: string) {
    if (!org) return;
    if (!confirm("Archive this block?")) return;
    const res = await authedFetch(`/api/spray/orgs/${org.id}/blocks/${blockId}`, {
      method: "DELETE",
    });
    if (!res.ok) {
      setError(`archive ${res.status}`);
      return;
    }
    setBlocks((prev) => prev.filter((b) => b.id !== blockId));
    setSelectedId(null);
  }

  function handleBlockUpdate(_blockId: string, _geom: GeoJSON.Polygon) {
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

  const selectedBlock = blocks.find((b) => b.id === selectedId) ?? null;

  if (!org && !orgLoading) {
    return (
      <div className="p-6">
        <p className="text-sm text-foreground/60">Sign in to manage vineyards.</p>
      </div>
    );
  }

  return (
    <div className="-m-6 flex min-h-[50vh] flex-col md:h-[calc(100vh-4rem)]">
      <div className="border-b border-border/40 bg-background/60 px-6 py-3">
        <Link
          href="/spray/vineyards"
          className="frame text-xs font-semibold text-foreground/60 transition-colors hover:text-amber"
        >
          ← Vineyards
        </Link>
        {vineyard && (
          <h1 className="mt-1 font-display text-xl">{vineyard.name}</h1>
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

      <div className="flex min-h-0 flex-1 flex-col md:flex-row">
        <div className="min-h-[280px] min-h-[50vh] flex-1 min-w-0 touch-manipulation md:min-h-0">
          <SprayMap
            centroid={centroid}
            blocks={blockFeatures}
            selectedBlockId={selectedId}
            editable={editable}
            onBlockSelect={setSelectedId}
            onBlockCreate={handleBlockCreate}
            onBlockUpdate={handleBlockUpdate}
            className="h-full min-h-[280px] w-full md:min-h-0"
          />
        </div>

        <aside className="w-full shrink-0 overflow-auto border-t border-border/40 bg-background/40 p-5 md:w-80 md:border-l md:border-t-0">
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
                        onClick={() => setSelectedId(b.id)}
                        className="block min-h-[44px] w-full rounded-md border border-border/40 bg-background/40 px-3 py-3 text-left text-sm transition-colors hover:border-amber/60"
                      >
                        {b.name}
                      </button>
                    </li>
                  ))}
              </ul>
              <button
                type="button"
                onClick={() => setEditable((e) => !e)}
                className="mt-6 min-h-[44px] w-full rounded-md bg-amber px-4 py-2 frame text-xs font-semibold text-background transition-colors hover:bg-amber/90"
              >
                {editable ? "Cancel drawing" : "Draw new block"}
              </button>
              {editable && (
                <p className="mt-3 text-xs text-foreground/60">
                  Tap the map to add vertices. Double-tap to close the polygon.
                </p>
              )}
            </>
          )}

          {selectedBlock && org && (
            <BlockEditor
              block={selectedBlock}
              onClose={() => setSelectedId(null)}
              onSave={(patch) => patchBlock(selectedBlock.id, patch)}
              onArchive={() => archiveBlock(selectedBlock.id)}
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
  onArchive,
  onExport,
  orgId,
}: {
  block: Block;
  onClose: () => void;
  onSave: (patch: Partial<Block>) => Promise<void>;
  onArchive: () => Promise<void>;
  onExport: () => void;
  orgId: string;
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
          onClick={onExport}
          className="min-h-[44px] w-full rounded-md border border-border/60 px-4 py-2 frame text-xs font-semibold text-foreground/70 transition-colors hover:text-foreground"
        >
          Export GeoJSON
        </button>
        <button
          type="button"
          onClick={onArchive}
          className="min-h-[44px] w-full rounded-md border border-red-500/40 px-4 py-2 frame text-xs font-semibold text-red-400 transition-colors hover:border-red-500"
        >
          Archive
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
