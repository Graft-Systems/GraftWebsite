"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import { VerdictCard } from "@/components/spray/VerdictCard";
import { useSprayDashboard } from "@/lib/sprayApi";

export default function RecommendationsPage() {
  const { summary, loading, error, reload, authedFetch } = useSprayDashboard();
  const [refreshing, setRefreshing] = useState<string | null>(null);

  const blocksWithVerdicts = useMemo(
    () => summary?.blocks.filter((b) => b.latest_verdict) ?? [],
    [summary],
  );
  const blocksWithoutVerdicts = useMemo(
    () => summary?.blocks.filter((b) => !b.latest_verdict) ?? [],
    [summary],
  );

  const byVineyard = useMemo(() => {
    const groups = new Map<
      string,
      { vineyardName: string; blocks: typeof blocksWithVerdicts }
    >();
    for (const b of blocksWithVerdicts) {
      const existing = groups.get(b.vineyard_id);
      if (existing) {
        existing.blocks.push(b);
      } else {
        groups.set(b.vineyard_id, {
          vineyardName: b.vineyard_name,
          blocks: [b],
        });
      }
    }
    return [...groups.values()];
  }, [blocksWithVerdicts]);

  async function refreshVerdict(blockId: string) {
    if (!summary) return;
    setRefreshing(blockId);
    try {
      const res = await authedFetch(
        `/api/spray/orgs/${summary.org.id}/blocks/${blockId}/verdicts/recompute`,
        { method: "POST" },
      );
      if (!res.ok) {
        const data = (await res.json().catch(() => ({}))) as {
          detail?: string;
        };
        window.alert(
          data.detail ??
            "This recommendation took too long to compute. Try again in a moment.",
        );
        return;
      }
      await reload();
    } catch {
      window.alert("Recommendation refresh failed.");
    } finally {
      setRefreshing(null);
    }
  }

  if (loading) {
    return (
      <div className="mx-auto max-w-5xl">
        <div className="h-48 animate-pulse rounded-md border border-border/40 bg-foreground/5" />
      </div>
    );
  }

  if (error) {
    return (
      <div className="mx-auto max-w-5xl">
        <p className="rounded-md border border-red-500/50 bg-red-500/10 p-3 text-sm text-red-300">
          {error}
        </p>
        <button
          type="button"
          onClick={reload}
          className="mt-3 frame text-xs font-semibold text-red-100 underline"
        >
          Retry
        </button>
      </div>
    );
  }

  if (!summary?.blocks.length) {
    return (
      <div className="mx-auto max-w-5xl pb-24 md:pb-0">
        <h1 className="font-display text-3xl">Recommendations</h1>
        <div className="mt-12 rounded-md border border-dashed border-border/40 p-12 text-center">
          <h2 className="font-display text-xl">No blocks yet</h2>
          <p className="mx-auto mt-2 max-w-xl text-sm text-foreground/60">
            Draw vineyard blocks first. Recommendations appear once blocks have
            sensor data and a verdict has been computed.
          </p>
          <Link
            href="/spray/vineyards"
            className="mt-5 inline-flex rounded-md bg-amber px-4 py-2 frame text-xs font-semibold text-background hover:bg-amber/90"
          >
            Create blocks
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-5xl pb-24 md:pb-0">
      <header className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <h1 className="font-display text-3xl">Recommendations</h1>
          <p className="mt-2 text-sm text-foreground/60">
            Block-level mildew recommendations for {summary.org.name}.
          </p>
        </div>
        {summary.latest_generated_at && (
          <p className="self-end text-xs text-foreground/50">
            Last run{" "}
            {new Date(summary.latest_generated_at).toLocaleString(undefined, {
              month: "short",
              day: "numeric",
              hour: "2-digit",
              minute: "2-digit",
            })}
          </p>
        )}
      </header>

      {byVineyard.map(({ vineyardName, blocks }) => (
        <section key={vineyardName} className="mt-10">
          <h2 className="frame text-xs font-semibold uppercase tracking-wider text-foreground/50">
            {vineyardName}
          </h2>
          <div className="mt-4 grid gap-4 lg:grid-cols-2">
            {blocks.map((b) => (
              <div key={b.id}>
                <VerdictCard
                  verdict={b.latest_verdict!}
                  blockName={b.name}
                  orgId={summary.org.id}
                  powderyPmi={b.powdery_pmi_profile}
                />
                <button
                  type="button"
                  disabled={refreshing === b.id}
                  onClick={() => void refreshVerdict(b.id)}
                  className="mt-2 frame text-[0.65rem] font-semibold uppercase tracking-wider text-foreground/45 transition-colors hover:text-amber disabled:opacity-40"
                >
                  {refreshing === b.id ? "Refreshing…" : "Refresh recommendation"}
                </button>
              </div>
            ))}
          </div>
        </section>
      ))}

      {blocksWithoutVerdicts.length > 0 && (
        <section className="mt-10 rounded-md border border-border/40 bg-background/30 p-5">
          <h2 className="frame text-xs font-semibold uppercase tracking-wider text-foreground/50">
            Awaiting first recommendation
          </h2>
          <p className="mt-1 text-xs text-foreground/50">
            These blocks haven&apos;t had a verdict computed yet. Tap{" "}
            <em>Compute now</em> to run immediately.
          </p>
          <ul className="mt-4 space-y-2">
            {blocksWithoutVerdicts.map((b) => (
              <li
                key={b.id}
                className="flex items-center justify-between rounded-md border border-border/30 bg-background/20 px-3 py-2 text-sm"
              >
                <span className="text-foreground/70">
                  {b.vineyard_name} · {b.name}
                </span>
                <button
                  type="button"
                  disabled={refreshing === b.id}
                  onClick={() => void refreshVerdict(b.id)}
                  className="frame text-[0.65rem] font-semibold text-amber hover:text-amber/80 disabled:opacity-40"
                >
                  {refreshing === b.id ? "Computing…" : "Compute now"}
                </button>
              </li>
            ))}
          </ul>
        </section>
      )}
    </div>
  );
}
