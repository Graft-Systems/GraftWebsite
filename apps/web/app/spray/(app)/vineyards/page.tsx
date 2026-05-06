/**
 * Vineyards list page (M0-05 step 4).
 *
 * Lists Vineyards for the caller's active Org. Active Org = first
 * Membership returned by /api/spray/orgs/me, matching the M0-02a
 * OrgSwitcher heuristic. M0-05a will introduce explicit org switching.
 */
"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { useAuth } from "@clerk/nextjs";
import { CreateVineyardDialog } from "@/components/spray/CreateVineyardDialog";

type Vineyard = {
  id: string;
  name: string;
  region: string;
  archived_at: string | null;
};

type Membership = {
  org: { id: string; name: string };
};

export default function VineyardsPage() {
  const { getToken, isSignedIn } = useAuth();
  const [orgId, setOrgId] = useState<string | null>(null);
  const [orgName, setOrgName] = useState<string>("");
  const [vineyards, setVineyards] = useState<Vineyard[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [showCreate, setShowCreate] = useState(false);

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
        const meJson = (await meRes.json()) as { memberships: Membership[] };
        const first = meJson.memberships?.[0];
        if (!first) {
          if (!cancelled) {
            setOrgId(null);
            setVineyards([]);
          }
          return;
        }
        if (cancelled) return;
        setOrgId(first.org.id);
        setOrgName(first.org.name);

        const vRes = await authedFetch(`/api/spray/orgs/${first.org.id}/vineyards`);
        if (!vRes.ok) throw new Error(`vineyards ${vRes.status}`);
        const list = (await vRes.json()) as Vineyard[];
        if (!cancelled) setVineyards(list);
      } catch (e) {
        if (!cancelled) setError(e instanceof Error ? e.message : "load failed");
      }
    }
    load();
    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isSignedIn]);

  async function handleCreate(name: string, region: string) {
    if (!orgId) return;
    const res = await authedFetch(`/api/spray/orgs/${orgId}/vineyards`, {
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
    <div className="mx-auto max-w-5xl">
      <header className="flex items-baseline justify-between">
        <div>
          <h1 className="font-display text-3xl">Vineyards</h1>
          {orgName && (
            <p className="mt-1 text-sm text-foreground/60">in {orgName}</p>
          )}
        </div>
        <button
          type="button"
          onClick={() => setShowCreate(true)}
          disabled={!orgId}
          className="rounded-md bg-amber px-4 py-2 frame text-xs font-semibold text-background transition-colors hover:bg-amber/90 disabled:opacity-40"
        >
          Create vineyard
        </button>
      </header>

      {error && (
        <p className="mt-6 rounded-md border border-red-500/50 bg-red-500/10 p-3 text-sm text-red-300">
          {error}
        </p>
      )}

      {vineyards === null && !error && (
        <p className="mt-12 text-foreground/50">Loading...</p>
      )}

      {vineyards && vineyards.length === 0 && (
        <div className="mt-12 rounded-md border border-dashed border-border/40 p-12 text-center">
          <p className="text-foreground/70">
            No vineyards yet. Click <strong>Create vineyard</strong> to get started.
          </p>
        </div>
      )}

      {vineyards && vineyards.length > 0 && (
        <ul className="mt-10 grid gap-4 md:grid-cols-2">
          {vineyards
            .filter((v) => v.archived_at === null)
            .map((v) => (
              <li
                key={v.id}
                className="rounded-md border border-border/40 bg-background/40 p-5"
              >
                <h2 className="font-display text-xl">{v.name}</h2>
                <p className="mt-1 text-xs uppercase tracking-wider text-foreground/50">
                  {v.region}
                </p>
                <Link
                  href={`/spray/vineyards/${v.id}`}
                  className="mt-4 inline-flex frame text-xs font-semibold text-amber transition-colors hover:text-amber/80"
                >
                  Open map →
                </Link>
              </li>
            ))}
        </ul>
      )}

      {showCreate && (
        <CreateVineyardDialog
          onClose={() => setShowCreate(false)}
          onSubmit={handleCreate}
        />
      )}
    </div>
  );
}
