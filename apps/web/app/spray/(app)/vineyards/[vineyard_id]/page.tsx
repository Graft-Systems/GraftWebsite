/**
 * Vineyard detail + map page (M0-05 step 5).
 *
 * Renders the SprayMap on the left (~70%) and a side panel on the
 * right with the active block's editable fields. Switching to
 * draw-mode via "Draw new block" arms the polygon tool and saves
 * via POST. Selecting an existing polygon switches the side panel
 * into edit mode.
 */
"use client";

import { useEffect, useMemo, useState } from "react";
import { useParams } from "next/navigation";
import Link from "next/link";
import { useAuth } from "@clerk/nextjs";
import { SprayMap, type BlockFeature } from "@/components/spray/SprayMap";

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
  const { getToken, isSignedIn } = useAuth();

  const [orgId, setOrgId] = useState<string | null>(null);
  const [vineyard, setVineyard] = useState<Vineyard | null>(null);
  const [blocks, setBlocks] = useState<Block[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [editable, setEditable] = useState(false);
  const [selectedId, setSelectedId] = useState<string | null>(null);

  async function authedFetch(path: string, init?: RequestInit) {
    const token = await getToken();
    return fetch(path, {
      ...init,
      headers: {
        ...(init?.headers ?? {}),
        Authorization: `Bearer ${token}`,
      },
    });
  }

  useEffect(() => {
    let cancelled = false;
    async function load() {
      if (!isSignedIn) return;
      try {
        const meRes = await authedFetch("/api/spray/orgs/me");
        if (!meRes.ok) throw new Error(`orgs/me ${meRes.status}`);
        const meJson = (await meRes.json()) as {
          memberships: { org: { id: string } }[];
        };
        const oid = meJson.memberships?.[0]?.org.id;
        if (!oid) throw new Error("no membership");
        if (cancelled) return;
        setOrgId(oid);

        const [vRes, bRes] = await Promise.all([
          authedFetch(`/api/spray/orgs/${oid}/vineyards/${vineyardId}`),
          authedFetch(
            `/api/spray/orgs/${oid}/vineyards/${vineyardId}/blocks`
          ),
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
    load();
    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isSignedIn, vineyardId]);

  const blockFeatures: BlockFeature[] = useMemo(
    () =>
      blocks.map((b) => ({
        id: b.id,
        name: b.name,
        geom: b.geom,
        archived: b.archived_at !== null,
      })),
    [blocks]
  );

  const centroid: [number, number] | null = useMemo(() => {
    if (!vineyard?.centroid) return null;
    const [lng, lat] = vineyard.centroid.coordinates;
    return [lng, lat];
  }, [vineyard]);

  async function handleBlockCreate(geom: GeoJSON.Polygon) {
    if (!orgId) return;
    const name = `Block ${blocks.length + 1}`;
    const res = await authedFetch(
      `/api/spray/orgs/${orgId}/vineyards/${vineyardId}/blocks`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name, geom }),
      }
    );
    if (!res.ok) {
      setError(`create block failed: ${res.status}`);
      return;
    }
    const created = (await res.json()) as Block;
    setBlocks((bs) => [...bs, created]);
    setEditable(false);
    setSelectedId(created.id);
  }

  async function handleBlockUpdate(blockId: string, geom: GeoJSON.Polygon) {
    if (!orgId) return;
    const res = await authedFetch(
      `/api/spray/orgs/${orgId}/blocks/${blockId}`,
      {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ geom }),
      }
    );
    if (!res.ok) {
      setError(`update block failed: ${res.status}`);
      return;
    }
    const updated = (await res.json()) as Block;
    setBlocks((bs) => bs.map((b) => (b.id === blockId ? updated : b)));
  }

  async function patchBlock(blockId: string, body: Partial<Block>) {
    if (!orgId) return;
    const res = await authedFetch(
      `/api/spray/orgs/${orgId}/blocks/${blockId}`,
      {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      }
    );
    if (!res.ok) {
      setError(`update block failed: ${res.status}`);
      return;
    }
    const updated = (await res.json()) as Block;
    setBlocks((bs) => bs.map((b) => (b.id === blockId ? updated : b)));
  }

  async function archiveBlock(blockId: string) {
    if (!orgId) return;
    const res = await authedFetch(
      `/api/spray/orgs/${orgId}/blocks/${blockId}`,
      { method: "DELETE" }
    );
    if (!res.ok) {
      setError(`archive block failed: ${res.status}`);
      return;
    }
    setBlocks((bs) =>
      bs.map((b) =>
        b.id === blockId ? { ...b, archived_at: new Date().toISOString() } : b
      )
    );
    setSelectedId(null);
  }

  function exportGeoJSON(block: Block) {
    const blob = new Blob(
      [JSON.stringify({ type: "Feature", properties: { name: block.name }, geometry: block.geom })],
      { type: "application/geo+json" }
    );
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `${block.name.replace(/\s+/g, "_")}.geojson`;
    a.click();
    URL.revokeObjectURL(url);
  }

  const selectedBlock = blocks.find((b) => b.id === selectedId) ?? null;

  return (
    <div className="-m-6 flex h-[calc(100vh-4rem)] flex-col">
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

      <div className="flex flex-1 min-h-0">
        <div className="flex-1 min-w-0">
          <SprayMap
            centroid={centroid}
            blocks={blockFeatures}
            selectedBlockId={selectedId}
            editable={editable}
            onBlockSelect={setSelectedId}
            onBlockCreate={handleBlockCreate}
            onBlockUpdate={handleBlockUpdate}
          />
        </div>

        <aside className="w-80 shrink-0 overflow-auto border-l border-border/40 bg-background/40 p-5">
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
                        className="block w-full rounded-md border border-border/40 bg-background/40 px-3 py-2 text-left text-sm transition-colors hover:border-amber/60"
                      >
                        {b.name}
                      </button>
                    </li>
                  ))}
              </ul>
              <button
                type="button"
                onClick={() => setEditable((e) => !e)}
                className="mt-6 w-full rounded-md bg-amber px-4 py-2 frame text-xs font-semibold text-background transition-colors hover:bg-amber/90"
              >
                {editable ? "Cancel drawing" : "Draw new block"}
              </button>
              {editable && (
                <p className="mt-3 text-xs text-foreground/60">
                  Click on the map to add vertices. Double-click to close the polygon.
                </p>
              )}
            </>
          )}

          {selectedBlock && (
            <BlockEditor
              block={selectedBlock}
              onClose={() => setSelectedId(null)}
              onSave={(patch) => patchBlock(selectedBlock.id, patch)}
              onArchive={() => archiveBlock(selectedBlock.id)}
              onExport={() => exportGeoJSON(selectedBlock)}
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
}: {
  block: Block;
  onClose: () => void;
  onSave: (patch: Partial<Block>) => Promise<void>;
  onArchive: () => Promise<void>;
  onExport: () => void;
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
          className="text-xs text-foreground/50 hover:text-foreground"
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
          className="w-full rounded-md bg-amber px-4 py-2 frame text-xs font-semibold text-background transition-colors hover:bg-amber/90"
        >
          Save changes
        </button>
        <button
          type="button"
          onClick={onExport}
          className="w-full rounded-md border border-border/60 px-4 py-2 frame text-xs font-semibold text-foreground/70 transition-colors hover:text-foreground"
        >
          Export GeoJSON
        </button>
        <button
          type="button"
          onClick={onArchive}
          className="w-full rounded-md border border-red-500/40 px-4 py-2 frame text-xs font-semibold text-red-400 transition-colors hover:border-red-500"
        >
          Archive
        </button>
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
      <span className="frame text-[0.65rem] font-semibold uppercase tracking-wider text-foreground/60">
        {label}
      </span>
      <input
        type="text"
        inputMode={inputMode}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="mt-1 w-full rounded-md border border-border/40 bg-background/40 px-2 py-1.5 text-sm"
      />
    </label>
  );
}
