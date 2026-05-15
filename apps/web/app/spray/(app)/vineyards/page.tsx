/**
 * Vineyards list page (M0-05 step 4).
 *
 * Lists Vineyards for the caller's active Org. Active Org = first
 * membership from /api/spray/orgs/me (pilot limitation until org switcher
 * threads X-Org-Id everywhere).
 */
"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useCallback, useEffect, useState } from "react";
import { CreateVineyardDialog } from "@/components/spray/CreateVineyardDialog";
import { formatSprayHttpError, orgCanArchiveVineyards, useActiveOrg } from "@/lib/sprayApi";

type VineyardCentroid = {
  type: "Point";
  coordinates: [number, number];
};

type Vineyard = {
  id: string;
  name: string;
  region: string;
  address?: string;
  centroid?: VineyardCentroid | null;
  settings?: Record<string, unknown>;
  created_at?: string;
  archived_at: string | null;
  block_count?: number;
};

const REGION_LABELS: Record<string, string> = {
  napa: "Napa",
  sonoma: "Sonoma",
  burgundy: "Burgundy",
  bordeaux: "Bordeaux",
  mendoza: "Mendoza",
  other: "Other",
};

function formatRegionLabel(region: string) {
  const key = region.toLowerCase();
  return REGION_LABELS[key] ?? region.replace(/_/g, " ");
}

function formatAddedAt(iso: string | undefined) {
  if (!iso) return null;
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return null;
  return new Intl.DateTimeFormat(undefined, {
    month: "short",
    day: "numeric",
    year: "numeric",
  }).format(d);
}

function formatCentroidLine(centroid: VineyardCentroid | null | undefined) {
  if (!centroid?.coordinates || centroid.coordinates.length < 2) {
    return "No map pin yet — open the vineyard to draw blocks.";
  }
  const [lng, lat] = centroid.coordinates;
  return `Approx. map center · ${lat.toFixed(3)}°, ${lng.toFixed(3)}°`;
}

function formatBlockCount(n: number | undefined) {
  const c = typeof n === "number" && Number.isFinite(n) ? n : 0;
  if (c === 1) return "1 block";
  return `${c} blocks`;
}

export default function VineyardsPage() {
  const pathname = usePathname();
  const { org, loading: orgLoading, authedFetch } = useActiveOrg();
  const [vineyards, setVineyards] = useState<Vineyard[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [showCreate, setShowCreate] = useState(false);
  const [deletingId, setDeletingId] = useState<string | null>(null);

  const reloadVineyards = useCallback(async () => {
    if (!org) {
      setVineyards([]);
      return;
    }
    setVineyards(null);
    setError(null);
    try {
      const vRes = await authedFetch(`/api/spray/orgs/${org.id}/vineyards`);
      if (!vRes.ok) throw new Error(`vineyards ${vRes.status}`);
      const list = (await vRes.json()) as Vineyard[];
      setVineyards(list);
    } catch (e) {
      setError(e instanceof Error ? e.message : "load failed");
    }
  }, [authedFetch, org]);

  // Refetch when landing on this page (including back from a vineyard detail).
  useEffect(() => {
    if (pathname !== "/spray/vineyards") return;
    void reloadVineyards();
  }, [pathname, reloadVineyards]);

  // Refresh block counts when returning to the tab.
  useEffect(() => {
    if (pathname !== "/spray/vineyards") return;
    const onVisible = () => {
      if (document.visibilityState === "visible") void reloadVineyards();
    };
    document.addEventListener("visibilitychange", onVisible);
    return () => document.removeEventListener("visibilitychange", onVisible);
  }, [pathname, reloadVineyards]);

  async function handleCreate(name: string, region: string) {
    if (!org) return;
    const res = await authedFetch(`/api/spray/orgs/${org.id}/vineyards`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name, region }),
    });
    if (!res.ok) {
      setError(`create failed: ${res.status}`);
      return;
    }
    const created = (await res.json()) as Vineyard;
    setVineyards((vs) => [...(vs ?? []), created]);
    setShowCreate(false);
  }

  async function handleDeleteVineyard(v: Vineyard) {
    if (!org) return;
    if (
      !window.confirm(
        `Archive vineyard “${v.name}”? All blocks under it will be archived.`,
      )
    ) {
      return;
    }
    setDeletingId(v.id);
    setError(null);
    try {
      const res = await authedFetch(`/api/spray/orgs/${org.id}/vineyards/${v.id}`, {
        method: "DELETE",
      });
      if (res.status === 204) {
        setVineyards((vs) => (vs ?? []).filter((x) => x.id !== v.id));
        return;
      }
      setError(await formatSprayHttpError(res));
    } catch (e) {
      setError(e instanceof Error ? e.message : "Delete failed");
    } finally {
      setDeletingId(null);
    }
  }

  const canDeleteVineyard = orgCanArchiveVineyards(org);

  return (
    <div className="w-full max-w-3xl pb-24 md:pb-0">
      <header className="flex flex-col gap-5 border-b border-border/30 pb-8 sm:flex-row sm:items-start sm:justify-between sm:gap-8 sm:pb-10">
        <div className="min-w-0 space-y-2">
          <h1 className="font-display text-3xl tracking-tight">Vineyards</h1>
          {org && (
            <p className="text-sm text-foreground/60">in {org.name}</p>
          )}
          {!org && !orgLoading && (
            <p className="max-w-xl text-sm text-foreground/55">
              No org membership yet — complete onboarding or ask an owner to invite you.
              (Pilot uses your first org only; multi-org switching is not wired.)
            </p>
          )}
        </div>
        <button
          type="button"
          onClick={() => setShowCreate(true)}
          disabled={!org}
          className="shrink-0 self-start rounded-md bg-amber px-4 py-2.5 frame text-xs font-semibold uppercase tracking-wide text-background transition-colors hover:bg-amber/90 disabled:opacity-40"
        >
          Create vineyard
        </button>
      </header>

      {error && (
        <p className="mt-6 rounded-md border border-red-500/50 bg-red-500/10 p-3 text-sm text-red-300">
          {error}
        </p>
      )}

      {vineyards === null && org && !error && (
        <div className="mt-10 h-40 animate-pulse rounded-md border border-border/40 bg-foreground/5" />
      )}

      {vineyards && vineyards.length === 0 && org && (
        <p className="mt-10 text-sm text-foreground/60">
          No vineyards yet. Create one to start drawing blocks.
        </p>
      )}

      {vineyards && vineyards.length > 0 && (
        <ul className="mt-10 space-y-3">
          {vineyards
            .filter((v) => v.archived_at === null)
            .map((v) => (
              <li key={v.id}>
                <div className="flex items-stretch gap-2 rounded-md border border-border/40 bg-background/40 transition-colors hover:border-amber/50">
                  <Link
                    href={`/spray/vineyards/${v.id}`}
                    className="flex min-w-0 flex-1 flex-col gap-2 px-4 py-4"
                  >
                    <div className="min-w-0 space-y-1.5">
                      <span className="block font-display text-lg leading-snug">
                        {v.name}
                      </span>
                      <p className="text-xs leading-relaxed text-foreground/55">
                        <span className="font-medium text-foreground/70">
                          {formatRegionLabel(v.region)}
                        </span>
                        <span aria-hidden> · </span>
                        <span className="text-foreground/60">
                          {formatBlockCount(v.block_count)}
                        </span>
                        {formatAddedAt(v.created_at) ? (
                          <>
                            {" "}
                            <span aria-hidden>·</span> Added{" "}
                            {formatAddedAt(v.created_at)}
                          </>
                        ) : null}
                      </p>
                      {v.address?.trim() ? (
                        <p className="text-xs leading-relaxed text-foreground/50">
                          {v.address.trim()}
                        </p>
                      ) : null}
                      <p className="text-[0.7rem] leading-relaxed text-foreground/45">
                        {formatCentroidLine(v.centroid)}
                      </p>
                    </div>
                  </Link>
                  {canDeleteVineyard && (
                    <button
                      type="button"
                      onClick={() => void handleDeleteVineyard(v)}
                      disabled={deletingId === v.id}
                      className="shrink-0 rounded-r-md border-l border-border/40 px-3 py-3 frame text-xs font-semibold uppercase tracking-wide text-red-300/90 transition-colors hover:bg-red-500/10 hover:text-red-200 disabled:opacity-40"
                    >
                      {deletingId === v.id ? "…" : "Delete"}
                    </button>
                  )}
                </div>
              </li>
            ))}
        </ul>
      )}

      {org && vineyards && vineyards.length > 0 && !canDeleteVineyard && (
        <p className="mt-4 text-xs text-foreground/45">
          Deleting a vineyard archives it and its blocks. Only organization owners and
          admins see the delete action.
        </p>
      )}

      {showCreate && org && (
        <CreateVineyardDialog
          onClose={() => setShowCreate(false)}
          onSubmit={handleCreate}
        />
      )}
    </div>
  );
}
