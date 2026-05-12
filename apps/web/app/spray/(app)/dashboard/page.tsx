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
type SetupStep = {
  id: string;
  label: string;
  complete: boolean;
  href: string;
};
type SetupSummary = {
  counts: {
    vineyards: number;
    blocks: number;
    active_integrations: number;
    mapped_stations: number;
    verdicts: number;
    unmapped_stations: number;
    stale_stations: number;
    stale_integrations: number;
    never_seen_stations: number;
    never_checked_integrations: number;
  };
  steps: SetupStep[];
  warnings: string[];
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
  const [setup, setSetup] = useState<SetupSummary | null>(null);
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

        const setupRes = await authedFetch(`/api/spray/orgs/${orgId}/setup-summary`);
        if (setupRes.ok && !cancelled) {
          setSetup((await setupRes.json()) as SetupSummary);
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

      {setup && <SetupChecklist setup={setup} />}

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
              <NoVerdictCard
                key={block.id}
                blockName={`${vineyardName} · ${block.name}`}
                setup={setup}
              />
            ),
          )}
        </div>
      )}
    </div>
  );
}

function SetupChecklist({ setup }: { setup: SetupSummary }) {
  const completeCount = setup.steps.filter((step) => step.complete).length;
  const next = setup.steps.find((step) => !step.complete);

  return (
    <section className="mt-8 rounded-md border border-border/40 bg-background/40 p-5">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <p className="frame text-[0.65rem] font-semibold uppercase tracking-wider text-foreground/50">
            Pilot setup
          </p>
          <h2 className="mt-2 font-display text-xl">
            {completeCount === setup.steps.length
              ? "Ready for daily directives"
              : "15 minutes to first directive"}
          </h2>
          <p className="mt-1 text-sm text-foreground/60">
            {setup.counts.blocks} block(s), {setup.counts.active_integrations} active
            integration(s), {setup.counts.mapped_stations} mapped station(s).
          </p>
        </div>
        {next && (
          <Link
            href={next.href}
            className="rounded-md bg-amber px-4 py-2 frame text-xs font-semibold text-background transition-colors hover:bg-amber/90"
          >
            Next: {next.label}
          </Link>
        )}
      </div>

      <ol className="mt-5 grid gap-2 md:grid-cols-5">
        {setup.steps.map((step) => (
          <li
            key={step.id}
            className={`rounded-md border px-3 py-3 text-sm ${
              step.complete
                ? "border-emerald-500/40 bg-emerald-500/10 text-emerald-200"
                : "border-border/40 bg-background/40 text-foreground/60"
            }`}
          >
            <Link href={step.href} className="block">
              <span className="frame text-[0.6rem] uppercase tracking-wider">
                {step.complete ? "Done" : "Needed"}
              </span>
              <span className="mt-1 block">{step.label}</span>
            </Link>
          </li>
        ))}
      </ol>

      {setup.warnings.length > 0 && (
        <ul className="mt-4 space-y-1 text-xs text-amber">
          {setup.warnings.map((warning) => (
            <li key={warning}>{warning}</li>
          ))}
        </ul>
      )}
    </section>
  );
}

function NoVerdictCard({
  blockName,
  setup,
}: {
  blockName: string;
  setup: SetupSummary | null;
}) {
  const next = setup?.steps.find((step) => !step.complete);
  const message = next
    ? `No verdict yet. Complete "${next.label}" to generate this block's first directive.`
    : "No verdict yet. The aggregation engine fires hourly during the growing season.";

  return (
    <article className="rounded-md border border-dashed border-border/40 bg-background/30 p-5">
      <p className="frame text-[0.65rem] font-semibold uppercase tracking-wider text-foreground/50">
        {blockName}
      </p>
      <p className="mt-3 text-sm text-foreground/60">{message}</p>
      {next && (
        <Link
          href={next.href}
          className="mt-4 inline-flex frame text-xs font-semibold text-amber transition-colors hover:text-amber/80"
        >
          Go to {next.label} →
        </Link>
      )}
    </article>
  );
}
