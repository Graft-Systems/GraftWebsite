"use client";

import Link from "next/link";
import { Suspense, useEffect, useMemo, useRef } from "react";
import { useSearchParams } from "next/navigation";
import { ForecastsBlockPanel } from "@/components/spray/ForecastsBlockPanel";
import { useSprayDashboard, type DashboardBlock } from "@/lib/sprayApi";

const EMPTY_DASHBOARD_BLOCKS: DashboardBlock[] = [];

function ForecastsPageFallback() {
  return (
    <div className="mx-auto max-w-6xl pb-24 md:pb-0">
      <div className="mt-8 h-48 animate-pulse rounded-md border border-border/40 bg-foreground/5" />
    </div>
  );
}

function ForecastsPageContent() {
  const { summary, loading, error, reload, authedFetch } = useSprayDashboard();
  const blocks = useMemo(
    () => summary?.blocks ?? EMPTY_DASHBOARD_BLOCKS,
    [summary?.blocks],
  );
  const searchParams = useSearchParams();
  const focusBlock = searchParams.get("block");
  const sectionRefs = useRef<Record<string, HTMLElement | null>>({});

  useEffect(() => {
    if (!focusBlock) return;
    const el = sectionRefs.current[focusBlock];
    if (el) {
      el.scrollIntoView({ behavior: "smooth", block: "start" });
    }
  }, [focusBlock, blocks]);

  return (
    <div className="mx-auto max-w-6xl pb-24 md:pb-0">
      <header className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <h1 className="font-display text-3xl">Forecasts</h1>
          <p className="mt-2 max-w-2xl text-sm text-foreground/60">
            Mildew pressure timeline and a seven-day spray window from live
            weather. Use it to line up sprays when the index is climbing and
            the day is calm and dry enough.
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

      {blocks.length > 0 && summary?.org?.id && (
        <div className="mt-8 space-y-4">
          {blocks.map((block) => (
            <ForecastsBlockPanel
              key={block.id}
              ref={(el) => {
                sectionRefs.current[block.id] = el;
              }}
              orgId={summary.org.id}
              block={block}
              spraySettings={sprayProgram(summary.org.settings)}
              authedFetch={authedFetch}
            />
          ))}
        </div>
      )}
    </div>
  );
}

export default function ForecastsPage() {
  return (
    <Suspense fallback={<ForecastsPageFallback />}>
      <ForecastsPageContent />
    </Suspense>
  );
}

type SpraySettings = {
  max_wind_mph: number;
  min_temp_f: number;
  max_temp_f: number;
  avoid_rain_hours: number;
};

function sprayProgram(settings?: Record<string, unknown>): SpraySettings {
  const program = (settings?.spray_program ?? {}) as Record<string, unknown>;
  return {
    max_wind_mph: numberOr(program.max_wind_mph, 10),
    min_temp_f: numberOr(program.min_temp_f, 45),
    max_temp_f: numberOr(program.max_temp_f, 85),
    avoid_rain_hours: numberOr(program.avoid_rain_hours, 12),
  };
}

function numberOr(value: unknown, fallback: number) {
  return typeof value === "number" ? value : fallback;
}

function EmptyForecastState() {
  return (
    <div className="mt-12 rounded-md border border-dashed border-border/40 p-12 text-center">
      <h2 className="font-display text-xl">No blocks to forecast yet</h2>
      <p className="mx-auto mt-2 max-w-xl text-sm text-foreground/60">
        Draw vineyard blocks first. Forecasts appear once blocks have
        recommendations.
      </p>
      <Link
        href="/spray/dashboard"
        className="mt-4 inline-flex rounded-md border border-border/40 px-4 py-2 frame text-xs font-semibold text-foreground/80 hover:text-foreground"
      >
        Open dashboard
      </Link>
      <Link
        href="/spray/vineyards"
        className="mt-3 inline-flex rounded-md bg-amber px-4 py-2 frame text-xs font-semibold text-background hover:bg-amber/90"
      >
        Create blocks
      </Link>
    </div>
  );
}
