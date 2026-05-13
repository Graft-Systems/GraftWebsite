"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import { RefreshCw } from "lucide-react";
import { useUser } from "@clerk/nextjs";
import { VerdictCard } from "@/components/spray/VerdictCard";
import {
  type DashboardBlock,
  type SetupSummary,
  useSprayDashboard,
} from "@/lib/sprayApi";

export default function SprayDashboardPage() {
  const { user } = useUser();
  const { summary, loading, error, reload, authedFetch } = useSprayDashboard();
  const [refreshingBlock, setRefreshingBlock] = useState<string | null>(null);
  const greeting = user?.firstName
    ? `Welcome back, ${user.firstName}.`
    : "Welcome back.";
  const today = useMemo(() => classifyToday(summary?.blocks ?? []), [summary]);

  async function refreshDirective(blockId: string) {
    if (!summary) return;
    setRefreshingBlock(blockId);
    try {
      await authedFetch(
        `/api/spray/orgs/${summary.org.id}/blocks/${blockId}/verdicts/recompute`,
        { method: "POST" },
      );
      await reload();
    } finally {
      setRefreshingBlock(null);
    }
  }

  return (
    <div className="mx-auto max-w-6xl pb-24 md:pb-0">
      <header>
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div>
            <h1 className="font-display text-3xl">{greeting}</h1>
            <p className="mt-2 text-foreground/60">
              {summary?.org.name
                ? `Today’s mildew work for ${summary.org.name}.`
                : "Today’s mildew work for your blocks."}
            </p>
          </div>
          {summary?.org.is_demo && (
            <span className="rounded border border-amber/40 bg-amber/10 px-3 py-1 frame text-[0.65rem] font-semibold uppercase tracking-wider text-amber">
              Demo vineyard
            </span>
          )}
        </div>
      </header>

      {error && <ErrorState message={error} onRetry={reload} />}
      {loading && !error && <DashboardSkeleton />}

      {summary && (
        <>
          <section className="sticky top-16 z-20 mt-8 rounded-md border border-border/40 bg-background/95 p-4 shadow-sm backdrop-blur">
            <div className="grid gap-3 md:grid-cols-4">
              <Metric label="Spray" value={today.spray} tone="text-red-300" />
              <Metric label="Scout" value={today.scout} tone="text-amber" />
              <Metric label="Hold" value={today.hold} tone="text-emerald-300" />
              <Metric
                label="Data warnings"
                value={summary.setup.warnings.length}
                tone="text-foreground/70"
              />
            </div>
            {summary.latest_generated_at && (
              <p className="mt-3 text-xs text-foreground/50">
                Last directive generated{" "}
                {new Date(summary.latest_generated_at).toLocaleString()}.
              </p>
            )}
          </section>

          <SetupChecklist setup={summary.setup} />
          <DataHealthPanel setup={summary.setup} />

          {summary.blocks.length === 0 ? (
            <EmptyState
              title="No blocks yet"
              body="Create a vineyard and draw blocks before Graft Spray can make block-level directives."
              href="/spray/vineyards"
              cta="Create blocks"
            />
          ) : (
            <div className="mt-8 grid gap-4 md:grid-cols-2 xl:grid-cols-3">
              {summary.blocks.map((block) =>
                block.latest_verdict ? (
                  <div key={block.id} className="space-y-2">
                    <VerdictCard
                      verdict={block.latest_verdict}
                      blockName={`${block.vineyard_name} · ${block.name}`}
                      orgId={summary.org.id}
                    />
                    <CardActions
                      stale={block.verdict_stale}
                      refreshing={refreshingBlock === block.id}
                      onRefresh={() => refreshDirective(block.id)}
                    />
                  </div>
                ) : (
                  <NoVerdictCard
                    key={block.id}
                    block={block}
                    setup={summary.setup}
                    refreshing={refreshingBlock === block.id}
                    onRefresh={() => refreshDirective(block.id)}
                  />
                ),
              )}
            </div>
          )}
        </>
      )}
    </div>
  );
}

function classifyToday(blocks: DashboardBlock[]) {
  return blocks.reduce(
    (acc, block) => {
      const action = block.latest_verdict?.action;
      if (action === "spray") acc.spray += 1;
      else if (action === "scout") acc.scout += 1;
      else if (action === "hold") acc.hold += 1;
      return acc;
    },
    { spray: 0, scout: 0, hold: 0 },
  );
}

function DataHealthPanel({ setup }: { setup: SetupSummary }) {
  const warnings = [
    setup.counts.stale_integrations > 0
      ? `${setup.counts.stale_integrations} provider connection(s) need a fresh health check`
      : null,
    setup.counts.stale_stations > 0
      ? `${setup.counts.stale_stations} station(s) have stale readings`
      : null,
    setup.counts.unmapped_stations > 0
      ? `${setup.counts.unmapped_stations} station(s) are not mapped to blocks`
      : null,
    setup.counts.never_seen_stations > 0
      ? `${setup.counts.never_seen_stations} station(s) have not reported readings yet`
      : null,
  ].filter(Boolean) as string[];

  if (warnings.length === 0) return null;

  return (
    <section className="mt-4 rounded-md border border-amber/30 bg-amber/10 p-4">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <p className="frame text-[0.65rem] font-semibold uppercase tracking-wider text-amber">
            Data health
          </p>
          <p className="mt-1 text-sm text-foreground/70">
            Some inputs need attention before growers should fully trust new directives.
          </p>
        </div>
        <Link
          href="/spray/integrations"
          className="frame text-xs font-semibold text-amber hover:text-amber/80"
        >
          Review integrations
        </Link>
      </div>
      <ul className="mt-3 list-disc space-y-1 pl-4 text-xs text-amber">
        {warnings.map((warning) => (
          <li key={warning}>{warning}</li>
        ))}
      </ul>
    </section>
  );
}

function Metric({
  label,
  value,
  tone,
}: {
  label: string;
  value: number;
  tone: string;
}) {
  return (
    <div className="rounded-md border border-border/40 bg-background/40 p-3">
      <p className="frame text-[0.6rem] uppercase tracking-wider text-foreground/50">
        {label}
      </p>
      <p className={`mt-1 font-display text-2xl ${tone}`}>{value}</p>
    </div>
  );
}

function SetupChecklist({ setup }: { setup: SetupSummary }) {
  const completeCount = setup.steps.filter((step) => step.complete).length;
  const next = setup.steps.find((step) => !step.complete);

  return (
    <section className="mt-6 rounded-md border border-border/40 bg-background/40 p-5">
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

function CardActions({
  stale,
  refreshing,
  onRefresh,
}: {
  stale: boolean;
  refreshing: boolean;
  onRefresh: () => void;
}) {
  return (
    <div className="flex items-center justify-between rounded-md border border-border/30 bg-background/30 px-3 py-2">
      <span className={`text-xs ${stale ? "text-amber" : "text-foreground/50"}`}>
        {stale ? "Data is stale" : "Directive is current"}
      </span>
      <button
        type="button"
        onClick={onRefresh}
        disabled={refreshing}
        className="inline-flex items-center gap-1 frame text-xs font-semibold text-amber hover:text-amber/80 disabled:opacity-50"
      >
        <RefreshCw className={`h-3 w-3 ${refreshing ? "animate-spin" : ""}`} />
        Refresh directive
      </button>
    </div>
  );
}

function NoVerdictCard({
  block,
  setup,
  refreshing,
  onRefresh,
}: {
  block: DashboardBlock;
  setup: SetupSummary;
  refreshing: boolean;
  onRefresh: () => void;
}) {
  const next = setup.steps.find((step) => !step.complete);
  return (
    <article className="rounded-md border border-dashed border-border/40 bg-background/30 p-5">
      <p className="frame text-[0.65rem] font-semibold uppercase tracking-wider text-foreground/50">
        {block.vineyard_name} · {block.name}
      </p>
      <p className="mt-3 text-sm text-foreground/60">
        {next
          ? `No directive yet. Complete "${next.label}" to generate this block’s first recommendation.`
          : "No directive yet. Generate one now or wait for the next scheduled run."}
      </p>
      <div className="mt-4 flex flex-wrap gap-3">
        {next && (
          <Link
            href={next.href}
            className="frame text-xs font-semibold text-amber transition-colors hover:text-amber/80"
          >
            Go to {next.label}
          </Link>
        )}
        <button
          type="button"
          onClick={onRefresh}
          disabled={refreshing}
          className="inline-flex items-center gap-1 frame text-xs font-semibold text-amber hover:text-amber/80 disabled:opacity-50"
        >
          <RefreshCw className={`h-3 w-3 ${refreshing ? "animate-spin" : ""}`} />
          Generate first directive
        </button>
      </div>
    </article>
  );
}

function EmptyState({
  title,
  body,
  href,
  cta,
}: {
  title: string;
  body: string;
  href: string;
  cta: string;
}) {
  return (
    <div className="mt-12 rounded-md border border-dashed border-border/40 p-12 text-center">
      <h2 className="font-display text-xl">{title}</h2>
      <p className="mx-auto mt-2 max-w-xl text-sm text-foreground/60">{body}</p>
      <Link
        href={href}
        className="mt-5 inline-flex rounded-md bg-amber px-4 py-2 frame text-xs font-semibold text-background hover:bg-amber/90"
      >
        {cta}
      </Link>
    </div>
  );
}

function ErrorState({
  message,
  onRetry,
}: {
  message: string;
  onRetry: () => void;
}) {
  return (
    <div className="mt-6 rounded-md border border-red-500/50 bg-red-500/10 p-4 text-sm text-red-200">
      <p>{message}</p>
      <button
        type="button"
        onClick={onRetry}
        className="mt-3 frame text-xs font-semibold text-red-100 underline"
      >
        Retry
      </button>
    </div>
  );
}

function DashboardSkeleton() {
  return (
    <div className="mt-8 grid gap-4 md:grid-cols-3">
      {[0, 1, 2].map((item) => (
        <div
          key={item}
          className="h-48 animate-pulse rounded-md border border-border/40 bg-foreground/5"
        />
      ))}
    </div>
  );
}
