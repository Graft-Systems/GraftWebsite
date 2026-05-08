/**
 * Spray dashboard (M1.5 PR-F).
 *
 * Pulls the active org's vineyards, expands every vineyard's blocks,
 * fetches the latest BlockVerdict per block, and renders a VerdictCard
 * grid. Blocks without a verdict (no aggregation has run yet — out of
 * season, fresh block, etc.) render an empty placeholder so the grower
 * still sees the block exists.
 *
 * Active Org = first Membership returned by /api/spray/orgs/me, matching
 * the rest of the spray app. Org switching lands later (M0-05a follow-up).
 */
"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { useAuth, useUser } from "@clerk/nextjs";
import { VerdictCard, type Verdict } from "@/components/spray/VerdictCard";

type Membership = { org: { id: string; name: string } };
type Vineyard = { id: string; name: string; archived_at: string | null };
type Block = {
  id: string;
  name: string;
  vineyard_id: string;
  archived_at: string | null;
};

type BlockEntry = {
  block: Block;
  vineyardName: string;
  verdict: Verdict | null;
};

export default function SprayDashboardPage() {
  const { user } = useUser();
  const { getToken, isSignedIn } = useAuth();
  const greeting = user?.firstName
    ? `Welcome back, ${user.firstName}.`
    : "Welcome back.";

  const [orgId, setOrgId] = useState<string | null>(null);
  const [orgName, setOrgName] = useState<string>("");
  const [entries, setEntries] = useState<BlockEntry[] | null>(null);
  const [error, setError] = useState<string | null>(null);

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
        const me = (await meRes.json()) as { memberships: Membership[] };
        const first = me.memberships?.[0];
        if (!first) {
          if (!cancelled) setEntries([]);
          return;
        }
        const orgId = first.org.id;
        if (!cancelled) {
          setOrgId(orgId);
          setOrgName(first.org.name);
        }

        const vRes = await authedFetch(`/api/spray/orgs/${orgId}/vineyards`);
        if (!vRes.ok) throw new Error(`vineyards ${vRes.status}`);
        const vineyards = ((await vRes.json()) as Vineyard[]).filter(
          (v) => v.archived_at === null,
        );

        const blockLists = await Promise.all(
          vineyards.map(async (v) => {
            const r = await authedFetch(
              `/api/spray/orgs/${orgId}/vineyards/${v.id}/blocks`,
            );
            if (!r.ok) return { vineyard: v, blocks: [] as Block[] };
            const blocks = ((await r.json()) as Block[]).filter(
              (b) => b.archived_at === null,
            );
            return { vineyard: v, blocks };
          }),
        );

        const flat: { block: Block; vineyardName: string }[] = [];
        for (const { vineyard, blocks } of blockLists) {
          for (const b of blocks) {
            flat.push({ block: b, vineyardName: vineyard.name });
          }
        }

        const filled = await Promise.all(
          flat.map(async ({ block, vineyardName }) => {
            const r = await authedFetch(
              `/api/spray/orgs/${orgId}/blocks/${block.id}/verdicts/latest`,
            );
            const verdict = r.ok ? ((await r.json()) as Verdict) : null;
            return { block, vineyardName, verdict };
          }),
        );

        if (!cancelled) setEntries(filled);
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

  return (
    <div className="mx-auto max-w-6xl">
      <header>
        <h1 className="font-display text-3xl">{greeting}</h1>
        <p className="mt-2 text-foreground/60">
          {orgName
            ? `Latest verdicts for blocks in ${orgName}.`
            : "Latest verdicts for your blocks."}
        </p>
      </header>

      {error && (
        <p className="mt-6 rounded-md border border-red-500/50 bg-red-500/10 p-3 text-sm text-red-300">
          {error}
        </p>
      )}

      {entries === null && !error && (
        <p className="mt-12 text-foreground/50">Loading...</p>
      )}

      {entries && entries.length === 0 && (
        <div className="mt-12 rounded-md border border-dashed border-border/40 p-12 text-center">
          <p className="text-foreground/70">
            No blocks yet. Head to{" "}
            <Link href="/spray/vineyards" className="text-amber hover:underline">
              Vineyards
            </Link>{" "}
            to draw your first block. Verdicts compute hourly during the
            growing season once a block exists.
          </p>
        </div>
      )}

      {entries && entries.length > 0 && (
        <div className="mt-8 grid gap-4 md:grid-cols-2 xl:grid-cols-3">
          {entries.map(({ block, vineyardName, verdict }) =>
            verdict ? (
              <VerdictCard
                key={block.id}
                verdict={verdict}
                blockName={`${vineyardName} · ${block.name}`}
                orgId={orgId ?? undefined}
              />
            ) : (
              <article
                key={block.id}
                className="rounded-md border border-dashed border-border/40 bg-background/30 p-5"
              >
                <p className="frame text-[0.65rem] font-semibold uppercase tracking-wider text-foreground/50">
                  {vineyardName} · {block.name}
                </p>
                <p className="mt-3 text-sm text-foreground/60">
                  No verdict yet. The aggregation engine fires hourly during
                  the growing season (April–October UTC). Check back once the
                  next run completes.
                </p>
              </article>
            ),
          )}
        </div>
      )}
    </div>
  );
}
