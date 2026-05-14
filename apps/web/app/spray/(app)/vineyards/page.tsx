/**
 * Vineyards list page (M0-05 step 4).
 *
 * Lists Vineyards for the caller's active Org. Active Org = first
 * membership from /api/spray/orgs/me (pilot limitation until org switcher
 * threads X-Org-Id everywhere).
 */
"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { CreateVineyardDialog } from "@/components/spray/CreateVineyardDialog";
import { useActiveOrg } from "@/lib/sprayApi";

type Vineyard = {
  id: string;
  name: string;
  region: string;
  archived_at: string | null;
};

export default function VineyardsPage() {
  const { org, loading: orgLoading, authedFetch } = useActiveOrg();
  const [vineyards, setVineyards] = useState<Vineyard[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [showCreate, setShowCreate] = useState(false);

  useEffect(() => {
    if (!org) {
      setVineyards([]);
      return;
    }
    const orgId = org.id;
    let cancelled = false;
    setVineyards(null);
    async function load() {
      try {
        const vRes = await authedFetch(`/api/spray/orgs/${orgId}/vineyards`);
        if (!vRes.ok) throw new Error(`vineyards ${vRes.status}`);
        const list = (await vRes.json()) as Vineyard[];
        if (!cancelled) setVineyards(list);
      } catch (e) {
        if (!cancelled) setError(e instanceof Error ? e.message : "load failed");
      }
    }
    void load();
    return () => {
      cancelled = true;
    };
  }, [authedFetch, org]);

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

  return (
    <div className="mx-auto max-w-5xl pb-24 md:pb-0">
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
                <Link
                  href={`/spray/vineyards/${v.id}`}
                  className="flex items-center justify-between rounded-md border border-border/40 bg-background/40 px-4 py-3 transition-colors hover:border-amber/50"
                >
                  <span className="font-display text-lg">{v.name}</span>
                  <span className="text-xs uppercase text-foreground/50">{v.region}</span>
                </Link>
              </li>
            ))}
        </ul>
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
