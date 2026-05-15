"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { RefreshCw } from "lucide-react";
import { VerdictCard } from "@/components/spray/VerdictCard";
import { PmiBlockPanel } from "@/components/spray/PmiCharts";
import type { BlockSensorReadingsResponse, DashboardBlock } from "@/lib/sprayApi";

type Props = {
  orgId: string;
  block: DashboardBlock | null;
  refreshing: boolean;
  onRefreshDirective: () => void;
  authedFetch: (path: string, init?: RequestInit) => Promise<Response>;
};

export function BlockInsightPanel({
  orgId,
  block,
  refreshing,
  onRefreshDirective,
  authedFetch,
}: Props) {
  const [readings, setReadings] = useState<BlockSensorReadingsResponse | null>(null);
  const [readingsErr, setReadingsErr] = useState<string | null>(null);

  useEffect(() => {
    if (!block) {
      setReadings(null);
      setReadingsErr(null);
      return;
    }
    const blockId = block.id;
    let cancelled = false;
    async function load() {
      setReadingsErr(null);
      try {
        const res = await authedFetch(
          `/api/spray/orgs/${orgId}/blocks/${blockId}/sensor-readings?hours=72&limit=500`,
        );
        if (!res.ok) {
          if (!cancelled) setReadingsErr(`Could not load readings (${res.status}).`);
          return;
        }
        const data = (await res.json()) as BlockSensorReadingsResponse;
        if (!cancelled) setReadings(data);
      } catch (e) {
        if (!cancelled)
          setReadingsErr(e instanceof Error ? e.message : "Could not load readings.");
      }
    }
    void load();
    return () => {
      cancelled = true;
    };
  }, [orgId, block?.id, authedFetch]);

  const chron = useMemo(() => {
    if (!readings?.readings.length) return [];
    return [...readings.readings].sort(
      (a, b) => new Date(a.ts).getTime() - new Date(b.ts).getTime(),
    );
  }, [readings]);

  if (!block) {
    return (
      <div className="rounded-md border border-dashed border-border/40 bg-background/30 p-6 text-sm text-foreground/55">
        Click a block on the map for sensor history, Gubler–Thomas PMI, and directive context.
      </div>
    );
  }

  const title = `${block.vineyard_name} · ${block.name}`;

  return (
    <div
      className="flex min-h-0 min-w-0 max-h-[min(640px,70vh)] flex-col gap-4 overflow-y-auto overscroll-contain touch-pan-y rounded-md border border-border/40 bg-background/40 p-4"
      data-lenis-prevent
    >
      <div className="flex flex-wrap items-start justify-between gap-2 border-b border-border/30 pb-3">
        <div>
          <p className="frame text-[0.65rem] font-semibold uppercase tracking-wider text-foreground/50">
            Block insights
          </p>
          <h2 className="font-display text-lg text-foreground/90">{title}</h2>
          <Link
            href={`/spray/vineyards/${block.vineyard_id}`}
            className="mt-1 inline-block text-xs font-semibold text-amber hover:text-amber/80"
          >
            Edit blocks on map →
          </Link>
        </div>
        <button
          type="button"
          onClick={onRefreshDirective}
          disabled={refreshing}
          className="inline-flex shrink-0 items-center gap-1 rounded-md border border-border/40 px-2 py-1 frame text-xs font-semibold text-amber hover:border-amber/40 disabled:opacity-50"
        >
          <RefreshCw className={`h-3 w-3 ${refreshing ? "animate-spin" : ""}`} />
          Refresh directive
        </button>
      </div>

      {block.latest_verdict ? (
        <VerdictCard
          verdict={block.latest_verdict}
          blockName={title}
          orgId={orgId}
          powderyPmi={block.powdery_pmi_profile ?? null}
        />
      ) : (
        <p className="text-sm text-foreground/60">
          No directive yet for this block. Refresh when integrations and weather are current, or
          open{" "}
          <Link href="/spray/forecasts" className="font-semibold text-amber hover:text-amber/80">
            Forecasts
          </Link>
          .
        </p>
      )}

      {block.latest_pmi_explain && (
        <p className="text-xs text-foreground/55">
          {block.latest_pmi_explain.headline}{" "}
          <Link
            href={block.latest_pmi_explain.link_to_forecasts}
            className="font-semibold text-amber hover:text-amber/80"
          >
            PMI breakdown →
          </Link>
        </p>
      )}

      <PmiBlockPanel blockId={block.id} history={block.pmi_history_14d ?? []} />

      <div className="border-t border-border/30 pt-4">
        <h3 className="font-display text-base text-foreground/90">Sensor readings</h3>
        {readingsErr && <p className="mt-2 text-xs text-amber">{readingsErr}</p>}
        {!readingsErr && readings && readings.stations.length === 0 && (
          <p className="mt-2 text-xs text-foreground/55">
            No stations linked to this block. Map a station under{" "}
            <Link href="/spray/integrations" className="text-amber hover:underline">
              Integrations
            </Link>
            .
          </p>
        )}
        {readings && readings.stations.length > 0 && (
          <>
            <p className="mt-1 text-xs text-foreground/50">
              {readings.readings_total} points in last {readings.hours}h
              {readings.readings_truncated ? " (table capped)" : ""} ·{" "}
              {readings.stations.map((s) => s.name).join(", ")}
            </p>
            <TempRhSparkChart points={chron} />
            <SensorReadingsTable rows={chron.slice(-48).reverse()} />
          </>
        )}
      </div>
    </div>
  );
}

function TempRhSparkChart({
  points,
}: {
  points: BlockSensorReadingsResponse["readings"];
}) {
  const slice = points.filter((p) => p.air_temp_c != null || p.rh_pct != null).slice(-72);
  if (slice.length < 2) {
    return (
      <p className="mt-2 text-xs text-foreground/50">
        Not enough temperature / humidity samples for a trend yet.
      </p>
    );
  }
  const w = 280;
  const h = 90;
  const pad = 8;
  const temps = slice.map((p) => p.air_temp_c).filter((v): v is number => v != null);
  const rhs = slice.map((p) => p.rh_pct).filter((v): v is number => v != null);
  const tMin = Math.min(...temps);
  const tMax = Math.max(...temps);
  const rMin = rhs.length ? Math.min(...rhs) : 0;
  const rMax = rhs.length ? Math.max(...rhs) : 100;
  const n = slice.length;
  const xAt = (i: number) => (n <= 1 ? w / 2 : pad + (i / (n - 1)) * (w - 2 * pad));
  const yTemp = (t: number) => {
    const span = Math.max(tMax - tMin, 0.5);
    return pad + (1 - (t - tMin) / span) * (h - 2 * pad);
  };
  const yRh = (r: number) => {
    const span = Math.max(rMax - rMin, 1);
    return pad + (1 - (r - rMin) / span) * (h - 2 * pad);
  };
  const tempPts = slice
    .map((p, i) => (p.air_temp_c != null ? `${xAt(i)},${yTemp(p.air_temp_c)}` : null))
    .filter(Boolean)
    .join(" ");
  const rhPts = slice
    .map((p, i) => (p.rh_pct != null ? `${xAt(i)},${yRh(p.rh_pct)}` : null))
    .filter(Boolean)
    .join(" ");

  return (
    <div className="mt-3">
      <p className="text-xs text-foreground/50">Temperature (amber) and RH% (sky)</p>
      <svg
        viewBox={`0 0 ${w} ${h}`}
        className="mt-1 w-full max-w-md"
        role="img"
        aria-label="Temperature and relative humidity trend"
      >
        <polyline
          fill="none"
          stroke="#f59e0b"
          strokeWidth="1.5"
          points={tempPts}
          opacity={tempPts ? 1 : 0}
        />
        <polyline
          fill="none"
          stroke="#7dd3fc"
          strokeWidth="1.5"
          points={rhPts}
          opacity={rhPts ? 1 : 0}
        />
      </svg>
    </div>
  );
}

function SensorReadingsTable({
  rows,
}: {
  rows: BlockSensorReadingsResponse["readings"];
}) {
  if (!rows.length) return null;
  return (
    <div className="mt-3 max-h-52 overflow-auto rounded border border-border/30">
      <table className="w-full border-collapse text-left text-[0.65rem]">
        <thead className="sticky top-0 bg-background/95 text-foreground/50">
          <tr>
            <th className="border-b border-border/30 px-2 py-1">UTC</th>
            <th className="border-b border-border/30 px-2 py-1">°C</th>
            <th className="border-b border-border/30 px-2 py-1">RH%</th>
            <th className="border-b border-border/30 px-2 py-1">Station</th>
            <th className="border-b border-border/30 px-2 py-1">Q</th>
          </tr>
        </thead>
        <tbody>
          {rows.map((r) => (
            <tr key={`${r.ts}-${r.station_id}`} className="text-foreground/75">
              <td className="border-b border-border/15 px-2 py-0.5 font-mono">
                {r.ts.slice(5, 16).replace("T", " ")}
              </td>
              <td className="border-b border-border/15 px-2 py-0.5">
                {r.air_temp_c ?? "—"}
              </td>
              <td className="border-b border-border/15 px-2 py-0.5">{r.rh_pct ?? "—"}</td>
              <td className="max-w-[7rem] truncate border-b border-border/15 px-2 py-0.5">
                {r.station_name}
              </td>
              <td className="border-b border-border/15 px-2 py-0.5">{r.quality_flag}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
