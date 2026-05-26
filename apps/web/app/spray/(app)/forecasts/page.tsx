"use client";

import Link from "next/link";
import { Suspense, useEffect, useMemo, useState } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import { ForecastsBlockPanel } from "@/components/spray/ForecastsBlockPanel";
import { useSprayDashboard, type DashboardBlock } from "@/lib/sprayApi";
import { ChevronRight, LayoutGrid, List } from "lucide-react";

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
  const router = useRouter();
  const searchParams = useSearchParams();
  
  const blocks = useMemo(
    () => summary?.blocks ?? EMPTY_DASHBOARD_BLOCKS,
    [summary?.blocks],
  );

  const activeBlockId = searchParams.get("block") || (blocks.length > 0 ? blocks[0].id : null);
  const activeBlock = useMemo(
    () => blocks.find((b) => b.id === activeBlockId) || blocks[0],
    [blocks, activeBlockId]
  );

  const setBlock = (id: string) => {
    const params = new URLSearchParams(searchParams.toString());
    params.set("block", id);
    router.replace(`/spray/forecasts?${params.toString()}`);
  };

  return (
    <div className="mx-auto max-w-6xl pb-24 md:pb-0">
      <header className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="font-display text-3xl">Forecasts</h1>
          <p className="mt-1 text-sm text-foreground/60">
            Weather and disease pressure outlook for your blocks.
          </p>
        </div>
        <div className="flex items-center gap-3">
          <button
            type="button"
            onClick={reload}
            className="rounded-md border border-border/40 px-3 py-1.5 frame text-xs font-semibold text-foreground/80 hover:text-foreground"
          >
            Refresh
          </button>
        </div>
      </header>

      {error && (
        <p className="mt-6 rounded-md border border-red-500/50 bg-red-500/10 p-3 text-sm text-red-300">
          {error}
        </p>
      )}

      {loading && !error && (
        <div className="mt-8 grid grid-cols-1 gap-6 lg:grid-cols-4">
          <div className="lg:col-span-1 space-y-2">
            {[1, 2, 3, 4].map((i) => (
              <div key={i} className="h-12 animate-pulse rounded-md bg-foreground/5" />
            ))}
          </div>
          <div className="lg:col-span-3 h-96 animate-pulse rounded-md border border-border/40 bg-foreground/5" />
        </div>
      )}

      {!loading && blocks.length === 0 && <EmptyForecastState />}

      {!loading && blocks.length > 0 && summary?.org?.id && (
        <div className="mt-8 grid grid-cols-1 gap-6 lg:grid-cols-4">
          {/* Sidebar / Block Selector */}
          <aside className="lg:col-span-1">
            <h2 className="frame mb-3 text-[0.65rem] font-bold uppercase tracking-widest text-foreground/40">
              Select Block
            </h2>
            <nav className="flex flex-col gap-1">
              {blocks.map((b) => (
                <button
                  key={b.id}
                  onClick={() => setBlock(b.id)}
                  className={`flex items-center justify-between rounded-md px-3 py-2.5 text-left transition-all ${
                    activeBlockId === b.id
                      ? "bg-amber/10 text-amber shadow-sm ring-1 ring-amber/30"
                      : "text-foreground/70 hover:bg-foreground/5 hover:text-foreground"
                  }`}
                >
                  <div className="overflow-hidden">
                    <p className="truncate text-sm font-semibold">{b.name}</p>
                    <p className="truncate text-[0.65rem] opacity-70">
                      {b.vineyard_name}
                    </p>
                  </div>
                  {activeBlockId === b.id && <ChevronRight className="h-4 w-4 shrink-0" />}
                </button>
              ))}
            </nav>
          </aside>

          {/* Main Content Area */}
          <main className="lg:col-span-3">
            {activeBlock && (
              <ForecastsBlockPanel
                key={activeBlock.id}
                orgId={summary.org.id}
                block={activeBlock}
                spraySettings={sprayProgram(summary.org.settings)}
                authedFetch={authedFetch}
              />
            )}
          </main>
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
      <div className="mt-6 flex items-center justify-center gap-3">
        <Link
          href="/spray/dashboard"
          className="rounded-md border border-border/40 px-4 py-2 frame text-xs font-semibold text-foreground/80 hover:text-foreground"
        >
          Go to Home
        </Link>
        <Link
          href="/spray/vineyards"
          className="rounded-md bg-amber px-4 py-2 frame text-xs font-semibold text-background hover:bg-amber/90"
        >
          Create blocks
        </Link>
      </div>
    </div>
  );
}
