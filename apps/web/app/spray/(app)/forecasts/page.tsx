"use client";

import Link from "next/link";
import { useSprayDashboard } from "@/lib/sprayApi";

export default function ForecastsPage() {
  const { summary, loading, error, reload } = useSprayDashboard();
  const blocks = summary?.blocks ?? [];

  return (
    <div className="mx-auto max-w-6xl pb-24 md:pb-0">
      <header className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <h1 className="font-display text-3xl">Forecasts</h1>
          <p className="mt-2 max-w-2xl text-sm text-foreground/60">
            Seven-day mildew outlook by block, using the latest audited
            directive and current sprayability constraints.
          </p>
        </div>
        <button
          type="button"
          onClick={reload}
          className="rounded-md border border-border/40 px-3 py-2 frame text-xs font-semibold text-foreground/80 hover:text-foreground"
        >
          Refresh
        </button>
      </header>

      {error && (
        <p className="mt-6 rounded-md border border-red-500/50 bg-red-500/10 p-3 text-sm text-red-300">
          {error}
        </p>
      )}
      {loading && !error && (
        <div className="mt-8 h-48 animate-pulse rounded-md border border-border/40 bg-foreground/5" />
      )}
      {!loading && blocks.length === 0 && (
        <EmptyForecastState />
      )}

      {blocks.length > 0 && (
        <div className="mt-8 space-y-4">
          {blocks.map((block) => {
            const verdict = block.latest_verdict;
            const forecast = verdict?.forecast_7d ?? [];
            return (
              <section
                key={block.id}
                className="rounded-md border border-border/40 bg-background/40 p-5"
              >
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div>
                    <h2 className="font-display text-xl">
                      {block.vineyard_name} · {block.name}
                    </h2>
                    <p className="mt-1 text-sm text-foreground/60">
                      {verdict
                        ? `Current action: ${verdict.action}`
                        : "No directive generated yet."}
                    </p>
                  </div>
                  {block.verdict_stale && (
                    <span className="rounded bg-amber/10 px-2 py-1 frame text-[0.65rem] font-semibold uppercase tracking-wider text-amber">
                      Data is stale
                    </span>
                  )}
                </div>

                {forecast.length === 0 ? (
                  <p className="mt-5 text-sm text-foreground/60">
                    No forecast window yet. Generate a directive from the
                    dashboard to fill this block.
                  </p>
                ) : (
                  <div className="mt-5 grid gap-2 md:grid-cols-7">
                    {forecast.slice(0, 7).map((day) => (
                      <article
                        key={`${block.id}-${day.date}`}
                        className="rounded-md border border-border/40 bg-background/50 p-3"
                      >
                        <p className="text-xs text-foreground/50">
                          {formatDay(day.date)}
                        </p>
                        <p className="mt-2 frame text-xs font-semibold uppercase tracking-wider text-amber">
                          {day.action ?? "hold"}
                        </p>
                        <p className="mt-2 text-xs text-foreground/60">
                          Powdery {day.powdery_severity_1_10 ?? "?"}/10
                        </p>
                        <p className="text-xs text-foreground/60">
                          Downy {day.downy_severity_1_10 ?? "?"}/10
                        </p>
                      </article>
                    ))}
                  </div>
                )}

                <p className="mt-4 text-xs text-foreground/50">
                  Do not spray if wind, rain, temperature, REI/PHI, or label
                  restrictions are outside the program limits.
                </p>
              </section>
            );
          })}
        </div>
      )}
    </div>
  );
}

function formatDay(value: string) {
  const date = new Date(`${value}T00:00:00`);
  if (Number.isNaN(date.getTime())) return value;
  return date.toLocaleDateString(undefined, { weekday: "short", month: "short", day: "numeric" });
}

function EmptyForecastState() {
  return (
    <div className="mt-12 rounded-md border border-dashed border-border/40 p-12 text-center">
      <h2 className="font-display text-xl">No blocks to forecast yet</h2>
      <p className="mx-auto mt-2 max-w-xl text-sm text-foreground/60">
        Draw vineyard blocks first. Forecasts appear once blocks have
        directives.
      </p>
      <Link
        href="/spray/vineyards"
        className="mt-5 inline-flex rounded-md bg-amber px-4 py-2 frame text-xs font-semibold text-background hover:bg-amber/90"
      >
        Create blocks
      </Link>
    </div>
  );
}
