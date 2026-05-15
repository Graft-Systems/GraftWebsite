"use client";

import Link from "next/link";
import React, { useEffect, useMemo, useRef, useState } from "react";
import { RefreshCw } from "lucide-react";
import { formatPmiDayLabel } from "@/components/spray/PmiCharts";
import type { Verdict } from "@/components/spray/VerdictCard";
import type {
  BlockSensorReadingsResponse,
  DashboardBlock,
  PmiHistoryDay,
} from "@/lib/sprayApi";

type Props = {
  orgId: string;
  block: DashboardBlock | null;
  refreshing: boolean;
  onRefreshDirective: () => void;
  authedFetch: (path: string, init?: RequestInit) => Promise<Response>;
  onDashboardReload?: () => void;
};

const PMI_OPT_LO_C = 21;
const PMI_OPT_HI_C = 29;

function num(value: string | number | null | undefined): number {
  if (value === null || value === undefined) return 0;
  return typeof value === "number" ? value : parseFloat(String(value)) || 0;
}

function severityToPressure(severity: number): "Low" | "Moderate" | "High" {
  if (severity <= 3) return "Low";
  if (severity <= 6) return "Moderate";
  return "High";
}

function tierToPressure(tier: string | null | undefined): "Low" | "Moderate" | "High" {
  const t = (tier || "").toLowerCase();
  if (t.includes("low") || t === "ok" || t === "minimal") return "Low";
  if (t.includes("extreme") || t.includes("high") || t.includes("severe")) return "High";
  if (t.includes("moderate") || t.includes("medium") || t.includes("elevated")) return "Moderate";
  return "Moderate";
}

function inferRiskLevel(verdict: Verdict): "low" | "moderate" | "high" | "extreme" {
  const fromDirective = verdict.directive?.risk_level;
  if (fromDirective) return fromDirective;
  if (verdict.action === "spray") return "high";
  if (verdict.action === "scout") return "moderate";
  return "low";
}

function actionableHeadline(verdict: Verdict | null): {
  headline: string;
  tone: "emerald" | "amber" | "red";
} {
  if (!verdict) {
    return { headline: "No advisory yet", tone: "amber" };
  }
  const risk = inferRiskLevel(verdict);
  const riskWords: Record<string, string> = {
    low: "Low risk",
    moderate: "Moderate risk",
    high: "High risk",
    extreme: "Very high risk",
  };
  const actionTail: Record<Verdict["action"], string> = {
    hold: "— Hold today",
    spray: "— Plan protection",
    scout: "— Scout closely",
  };
  const tone: "emerald" | "amber" | "red" =
    risk === "low" ? "emerald" : risk === "moderate" ? "amber" : "red";
  return {
    headline: `${riskWords[risk] ?? riskWords.moderate} ${actionTail[verdict.action]}`,
    tone,
  };
}

function directiveSubtext(verdict: Verdict | null): string {
  if (!verdict?.directive) {
    return "When weather and station data are current, a field advisory will appear here. You can refresh below.";
  }
  const d = verdict.directive;
  const parts: string[] = [];
  if (d.confidence_note) parts.push(d.confidence_note);
  if (d.when_not_to_spray?.length) parts.push(d.when_not_to_spray.join(" "));
  if (parts.length) return parts.join(" ");
  if (d.when_to_spray) return d.when_to_spray;
  return "Keep monitoring conditions and check back after the next weather update.";
}

function statusBadgeLabel(action: Verdict["action"] | null | undefined): string {
  if (!action) return "—";
  return action === "spray" ? "SPRAY" : action === "scout" ? "SCOUT" : "HOLD";
}

function toneHeadlineClass(tone: "emerald" | "amber" | "red"): string {
  if (tone === "emerald") return "text-emerald-300";
  if (tone === "red") return "text-red-300";
  return "text-amber";
}

function DiseaseIndexBar({
  title,
  indexDisplay,
  pressureLabel,
  fillPct,
}: {
  title: string;
  indexDisplay: string;
  pressureLabel: "Low" | "Moderate" | "High";
  fillPct: number;
}) {
  const barColor =
    pressureLabel === "Low"
      ? "bg-emerald-500/70"
      : pressureLabel === "Moderate"
        ? "bg-amber/70"
        : "bg-red-400/80";
  const w = Math.max(0, Math.min(100, fillPct));
  return (
    <div className="space-y-2">
      <div className="flex items-baseline justify-between gap-2">
        <span className="text-sm font-medium text-foreground/85">{title}</span>
        <span className="text-right text-sm text-foreground/80">
          <span className="font-semibold tabular-nums">{indexDisplay}</span>
          <span className="text-foreground/50"> · </span>
          <span className="font-medium">{pressureLabel}</span>
        </span>
      </div>
      <div className="h-2.5 overflow-hidden rounded-full bg-foreground/10">
        <div className={`h-full rounded-full transition-[width] ${barColor}`} style={{ width: `${w}%` }} />
      </div>
    </div>
  );
}

function shortDayLabel(isoDate: string): string {
  const d = new Date(`${isoDate}T12:00:00`);
  if (Number.isNaN(d.getTime())) return isoDate;
  return d.toLocaleDateString(undefined, { month: "short", day: "numeric" });
}

function PmiTrendSpark({ history }: { history: PmiHistoryDay[] }) {
  const w = 340;
  const h = 148;
  const margin = { l: 44, r: 10, t: 14, b: 36 };
  const n = history.length;
  if (n < 2) {
    return (
      <p className="mt-2 text-sm text-foreground/55">
        Not enough days yet for a trend. Check back after the next index update.
      </p>
    );
  }
  const iw = w - margin.l - margin.r;
  const ih = h - margin.t - margin.b;
  const xAt = (i: number) => margin.l + (n <= 1 ? iw / 2 : (i / (n - 1)) * iw);
  const yPmi = (pmi: number) =>
    margin.t + (1 - Math.min(100, Math.max(0, pmi)) / 100) * ih;
  const xs = history.map((_, i) => xAt(i));
  const ys = history.map((d) => yPmi(d.pmi));
  const points = xs.map((x, i) => `${x},${ys[i]}`).join(" ");
  const last = history[history.length - 1];
  const yTicks = [0, 25, 50, 75, 100];
  const xLabelIdxs = [0, Math.floor((n - 1) / 2), n - 1].filter((i, j, a) => a.indexOf(i) === j);
  const tickFill = "rgba(148,163,184,0.85)";
  const gridStroke = "rgba(148,163,184,0.18)";

  return (
    <div className="mt-1">
      <p className="text-xs text-foreground/50">
        Daily powdery mildew index — latest {last.pmi} on {formatPmiDayLabel(last.date)}
      </p>
      <svg
        viewBox={`0 0 ${w} ${h}`}
        className="mt-2 w-full max-w-xl text-amber"
        role="img"
        aria-label="Fourteen day powdery mildew index trend"
      >
        {yTicks.map((v) => (
          <line
            key={`g-${v}`}
            x1={margin.l}
            y1={yPmi(v)}
            x2={margin.l + iw}
            y2={yPmi(v)}
            stroke={gridStroke}
            strokeWidth={v === 0 ? 0.6 : 0.4}
          />
        ))}
        <polyline fill="none" stroke="currentColor" strokeWidth="2" points={points} />
        <text
          x={margin.l}
          y={12}
          textAnchor="start"
          fill={tickFill}
          fontSize={10}
          fontFamily="system-ui, sans-serif"
        >
          Index (0–100)
        </text>
        {yTicks.map((v) => (
          <text
            key={`y-${v}`}
            x={margin.l - 6}
            y={yPmi(v) + 3}
            textAnchor="end"
            fill={tickFill}
            fontSize={10}
            fontFamily="system-ui, sans-serif"
          >
            {v}
          </text>
        ))}
        {xLabelIdxs.map((i) => (
          <text
            key={`x-${i}`}
            x={xAt(i)}
            y={h - 10}
            textAnchor="middle"
            fill={tickFill}
            fontSize={10}
            fontFamily="system-ui, sans-serif"
          >
            {shortDayLabel(history[i].date)}
          </text>
        ))}
        <text
          x={margin.l + iw / 2}
          y={h - 2}
          textAnchor="middle"
          fill={tickFill}
          fontSize={10}
          fontFamily="system-ui, sans-serif"
        >
          Day
        </text>
      </svg>
    </div>
  );
}

function formatChartAxisTime(ts: string): string {
  const d = new Date(ts);
  if (Number.isNaN(d.getTime())) return "";
  return d.toLocaleString(undefined, {
    month: "short",
    day: "numeric",
    hour: "numeric",
  });
}

/** Evenly sample so the line stays readable on dense station feeds (e.g. 5‑min samples). */
function decimateReadings<T>(readings: T[], maxPoints: number): T[] {
  if (readings.length <= maxPoints) return readings;
  const out: T[] = [];
  for (let k = 0; k < maxPoints; k++) {
    const idx = Math.round((k / Math.max(1, maxPoints - 1)) * (readings.length - 1));
    out.push(readings[idx]);
  }
  return out;
}

const TEMP_RH_CHART_MAX_POINTS = 32;

function TempRhSparkChart({
  points,
}: {
  points: BlockSensorReadingsResponse["readings"];
}) {
  const raw = points.filter((p) => p.air_temp_c != null || p.rh_pct != null).slice(-72);
  const slice = decimateReadings(raw, TEMP_RH_CHART_MAX_POINTS);
  if (slice.length < 2) {
    return (
      <p className="mt-2 text-sm text-foreground/55">
        Not enough temperature or humidity samples for a trend yet.
      </p>
    );
  }
  const w = 360;
  const h = 148;
  const margin = { l: 52, r: 52, t: 22, b: 42 };
  const iw = w - margin.l - margin.r;
  const ih = h - margin.t - margin.b;
  const temps = slice.map((p) => p.air_temp_c).filter((v): v is number => v != null);
  const rhs = slice.map((p) => p.rh_pct).filter((v): v is number => v != null);
  const tMin = Math.min(...temps);
  const tMax = Math.max(...temps);
  const rMin = rhs.length ? Math.min(...rhs) : 0;
  const rMax = rhs.length ? Math.max(...rhs) : 100;
  const n = slice.length;
  const xAt = (i: number) => margin.l + (n <= 1 ? iw / 2 : (i / (n - 1)) * iw);
  const spanT = Math.max(tMax - tMin, 0.5);
  const yTemp = (t: number) => margin.t + (1 - (t - tMin) / spanT) * ih;
  const yRh = (r: number) => {
    const span = Math.max(rMax - rMin, 1);
    return margin.t + (1 - (r - rMin) / span) * ih;
  };
  const bandLo = PMI_OPT_LO_C;
  const bandHi = PMI_OPT_HI_C;
  const inViewLo = Math.max(tMin, bandLo);
  const inViewHi = Math.min(tMax, bandHi);
  let bandRect: React.ReactNode = null;
  if (inViewLo <= inViewHi) {
    const yTop = yTemp(inViewHi);
    const yBot = yTemp(inViewLo);
    const bh = Math.max(yBot - yTop, 1);
    bandRect = (
      <rect
        x={margin.l}
        y={yTop}
        width={iw}
        height={bh}
        fill="#f59e0b"
        fillOpacity={0.12}
        stroke="#f59e0b"
        strokeOpacity={0.15}
        strokeWidth={0.5}
      />
    );
  }
  const tempPts = slice
    .map((p, i) => (p.air_temp_c != null ? `${xAt(i)},${yTemp(p.air_temp_c)}` : null))
    .filter(Boolean)
    .join(" ");
  const rhPts = slice
    .map((p, i) => (p.rh_pct != null ? `${xAt(i)},${yRh(p.rh_pct)}` : null))
    .filter(Boolean)
    .join(" ");

  const tTicks = [tMin, (tMin + tMax) / 2, tMax];
  const rTicks = rhs.length ? [rMin, (rMin + rMax) / 2, rMax] : [0, 50, 100];
  const xLabelIdxs = [0, Math.floor((n - 1) / 2), n - 1].filter((i, j, a) => a.indexOf(i) === j);
  const tickFill = "rgba(148,163,184,0.85)";
  const gridStroke = "rgba(148,163,184,0.14)";

  return (
    <div className="mt-2">
      <p className="text-xs text-foreground/50">
        Temperature (amber) and relative humidity (sky). Shaded band: favorable range for powdery
        mildew growth (21–29&nbsp;°C / 70–85&nbsp;°F).
      </p>
      <svg
        viewBox={`0 0 ${w} ${h}`}
        className="mt-1 w-full max-w-md"
        role="img"
        aria-label="Temperature and humidity trend with mildew-favorable temperature band"
      >
        {tTicks.map((tv) => (
          <line
            key={`tg-${tv}`}
            x1={margin.l}
            y1={yTemp(tv)}
            x2={margin.l + iw}
            y2={yTemp(tv)}
            stroke={gridStroke}
            strokeWidth={0.35}
          />
        ))}
        {bandRect}
        <polyline
          fill="none"
          stroke="#f59e0b"
          strokeWidth="1.35"
          strokeLinecap="round"
          strokeLinejoin="round"
          points={tempPts}
          opacity={tempPts ? 1 : 0}
        />
        <polyline
          fill="none"
          stroke="#7dd3fc"
          strokeWidth="1.35"
          strokeLinecap="round"
          strokeLinejoin="round"
          points={rhPts}
          opacity={rhPts ? 1 : 0}
        />
        <text
          x={margin.l}
          y={margin.t - 4}
          textAnchor="start"
          fill="#fbbf24"
          fontSize={10}
          fontFamily="system-ui, sans-serif"
        >
          °C (air)
        </text>
        {tTicks.map((tv) => (
          <text
            key={`tl-${tv}`}
            x={margin.l - 8}
            y={yTemp(tv) + 3}
            textAnchor="end"
            fill="#fbbf24"
            fontSize={10}
            fontFamily="system-ui, sans-serif"
          >
            {tv.toFixed(1)}
          </text>
        ))}
        <text
          x={w - margin.r}
          y={margin.t - 4}
          textAnchor="end"
          fill="#7dd3fc"
          fontSize={10}
          fontFamily="system-ui, sans-serif"
        >
          RH %
        </text>
        {rTicks.map((rv) => (
          <text
            key={`rl-${rv}`}
            x={w - margin.r + 8}
            y={yRh(rv) + 3}
            textAnchor="start"
            fill="#7dd3fc"
            fontSize={10}
            fontFamily="system-ui, sans-serif"
          >
            {Math.round(rv)}
          </text>
        ))}
        {xLabelIdxs.map((i) => (
          <text
            key={`xt-${i}`}
            x={xAt(i)}
            y={h - 18}
            textAnchor="middle"
            fill={tickFill}
            fontSize={9}
            fontFamily="system-ui, sans-serif"
          >
            {formatChartAxisTime(slice[i].ts)}
          </text>
        ))}
        <text
          x={margin.l + iw / 2}
          y={h - 4}
          textAnchor="middle"
          fill={tickFill}
          fontSize={10}
          fontFamily="system-ui, sans-serif"
        >
          Time (your device)
        </text>
      </svg>
      {!bandRect && (
        <p className="mt-2 text-[0.7rem] leading-snug text-foreground/45">
          The 21–29&nbsp;°C comfort band for mildew is not drawn here because recent readings stayed
          below that range.
        </p>
      )}
    </div>
  );
}

export function BlockInsightPanel({
  orgId,
  block,
  refreshing,
  onRefreshDirective,
  authedFetch,
  onDashboardReload,
}: Props) {
  const [readings, setReadings] = useState<BlockSensorReadingsResponse | null>(null);
  const [readingsErr, setReadingsErr] = useState<string | null>(null);
  const dialogRef = useRef<HTMLDialogElement>(null);
  const [budbreakInput, setBudbreakInput] = useState("");
  const [saveErr, setSaveErr] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const blockId = block?.id ?? null;

  useEffect(() => {
    if (blockId == null) {
      setReadings(null);
      setReadingsErr(null);
      return;
    }
    let cancelled = false;
    async function load() {
      setReadingsErr(null);
      try {
        const res = await authedFetch(
          `/api/spray/orgs/${orgId}/blocks/${blockId}/sensor-readings?hours=72&limit=500`,
        );
        if (!res.ok) {
          if (!cancelled) setReadingsErr("Could not load recent weather from your stations.");
          return;
        }
        const data = (await res.json()) as BlockSensorReadingsResponse;
        if (!cancelled) setReadings(data);
      } catch (e) {
        if (!cancelled)
          setReadingsErr(e instanceof Error ? e.message : "Could not load recent weather.");
      }
    }
    void load();
    return () => {
      cancelled = true;
    };
  }, [orgId, blockId, authedFetch]);

  const chron = useMemo(() => {
    if (!readings?.readings.length) return [];
    return [...readings.readings].sort(
      (a, b) => new Date(a.ts).getTime() - new Date(b.ts).getTime(),
    );
  }, [readings]);

  const todayLabel = useMemo(
    () =>
      new Intl.DateTimeFormat(undefined, {
        weekday: "long",
        month: "long",
        day: "numeric",
        year: "numeric",
      }).format(new Date()),
    [],
  );

  const openConfigure = () => {
    setSaveErr(null);
    setBudbreakInput(block?.budbreak_date ?? "");
    dialogRef.current?.showModal();
  };

  const closeConfigure = () => {
    dialogRef.current?.close();
    setSaveErr(null);
  };

  async function saveBudbreak() {
    if (!block || !budbreakInput) {
      setSaveErr("Choose a budbreak date to continue.");
      return;
    }
    setSaving(true);
    setSaveErr(null);
    try {
      const res = await authedFetch(`/api/spray/orgs/${orgId}/blocks/${block.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ settings: { budbreak_date: budbreakInput } }),
      });
      if (!res.ok) {
        setSaveErr("Could not save block settings. Try again or ask an org admin.");
        return;
      }
      closeConfigure();
      onDashboardReload?.();
    } catch {
      setSaveErr("Could not save. Check your connection and try again.");
    } finally {
      setSaving(false);
    }
  }

  if (!block) {
    return (
      <div className="rounded-md border border-dashed border-border/40 bg-background/30 p-6 text-sm text-foreground/55">
        Select a block on the map to see today&apos;s advisory, disease pressure, and recent
        weather.
      </div>
    );
  }

  const title = `${block.vineyard_name} · ${block.name}`;
  const verdict = block.latest_verdict;
  const { headline, tone } = actionableHeadline(verdict);
  const subtext = directiveSubtext(verdict);
  const badge = statusBadgeLabel(verdict?.action);

  const powderySev = verdict ? num(verdict.powdery_severity_1_10) : 0;
  const downySev = verdict ? num(verdict.downy_severity_1_10) : 0;
  const powderyIndex =
    block.latest_pmi != null && block.latest_pmi !== undefined
      ? Math.round(block.latest_pmi)
      : Math.round(powderySev * 10);
  const powderyPressure: "Low" | "Moderate" | "High" =
    block.latest_pmi_tier != null && block.latest_pmi_tier !== undefined
      ? tierToPressure(block.latest_pmi_tier)
      : severityToPressure(powderySev);
  const downyPressure = severityToPressure(downySev);
  const downyIndexDisplay = `${downySev.toFixed(1)} / 10`;

  const hasBudbreak = Boolean(block.budbreak_date);
  const history = block.pmi_history_14d ?? [];

  return (
    <div
      className="flex min-h-0 min-w-0 max-h-[min(640px,70vh)] flex-col gap-4 overflow-y-auto overscroll-contain touch-pan-y rounded-md border border-border/40 bg-background/40 p-4"
      data-lenis-prevent
    >
      <header className="flex flex-wrap items-start justify-between gap-3 border-b border-border/30 pb-3">
        <div className="min-w-0 flex-1 space-y-1">
          <p className="frame text-[0.65rem] font-semibold uppercase tracking-wider text-foreground/50">
            Block insights
          </p>
          <h2 className="font-display text-lg leading-snug text-foreground/90">{title}</h2>
          <p className="text-xs text-foreground/55">{todayLabel}</p>
          <Link
            href={`/spray/vineyards/${block.vineyard_id}`}
            className="inline-block text-xs font-semibold text-amber hover:text-amber/80"
          >
            Vineyard &amp; blocks →
          </Link>
        </div>
        <div className="flex shrink-0 flex-col items-end gap-2">
          <span
            className={`rounded-md px-3 py-1.5 text-xs font-bold tracking-wide ${
              badge === "SPRAY"
                ? "bg-red-500/20 text-red-200"
                : badge === "SCOUT"
                  ? "bg-amber/20 text-amber"
                  : badge === "HOLD"
                    ? "bg-emerald-500/20 text-emerald-200"
                    : "bg-foreground/10 text-foreground/50"
            }`}
          >
            {badge}
          </span>
          <button
            type="button"
            onClick={onRefreshDirective}
            disabled={refreshing}
            className="inline-flex items-center gap-1 rounded-md border border-border/40 px-2 py-1 frame text-xs font-semibold text-amber hover:border-amber/40 disabled:opacity-50"
          >
            <RefreshCw className={`h-3 w-3 ${refreshing ? "animate-spin" : ""}`} />
            Refresh advisory
          </button>
        </div>
      </header>

      <section className="rounded-lg border border-border/35 bg-background/45 p-4 shadow-sm">
        <h3 className="sr-only">Today&apos;s directive</h3>
        <p className={`font-display text-lg font-semibold leading-snug ${toneHeadlineClass(tone)}`}>
          {headline}
        </p>
        <p className="mt-2 text-sm leading-relaxed text-foreground/70">{subtext}</p>
        {block.verdict_stale && verdict && (
          <p className="mt-2 text-xs text-amber">This advisory is older than a day — refresh when you can.</p>
        )}
      </section>

      <section className="rounded-lg border border-border/35 bg-background/45 p-4 shadow-sm">
        <h3 className="font-display text-base text-foreground/90">Disease pressure</h3>
        <p className="mt-1 text-xs text-foreground/50">Powdery and downy mildew indicators for this block.</p>
        <div className="mt-4 space-y-5">
          <DiseaseIndexBar
            title="Powdery mildew"
            indexDisplay={String(powderyIndex)}
            pressureLabel={powderyPressure}
            fillPct={powderyIndex}
          />
          <DiseaseIndexBar
            title="Downy mildew"
            indexDisplay={downyIndexDisplay}
            pressureLabel={downyPressure}
            fillPct={downySev * 10}
          />
        </div>
      </section>

      <section className="rounded-lg border border-border/35 bg-background/45 p-4 shadow-sm">
        <h3 className="font-display text-base text-foreground/90">14-day risk trend</h3>
        {!hasBudbreak ? (
          <div className="mt-4 rounded-md border border-dashed border-border/50 bg-background/30 p-5 text-center">
            <p className="text-sm text-foreground/70">
              Add a budbreak date for this block so we can track the powdery mildew index over time.
            </p>
            <button
              type="button"
              onClick={openConfigure}
              className="mt-4 inline-flex rounded-md bg-amber px-4 py-2 text-sm font-semibold text-background hover:bg-amber/90"
            >
              Configure block
            </button>
          </div>
        ) : (
          <>
            <PmiTrendSpark history={history} />
            <button
              type="button"
              onClick={openConfigure}
              className="mt-3 text-xs font-semibold text-amber hover:text-amber/80"
            >
              Update budbreak date
            </button>
          </>
        )}
      </section>

      <section className="rounded-lg border border-border/35 bg-background/45 p-4 shadow-sm">
        <h3 className="font-display text-base text-foreground/90">Environmental context</h3>
        {readingsErr && <p className="mt-2 text-sm text-amber">{readingsErr}</p>}
        {!readingsErr && readings && readings.stations.length === 0 && (
          <p className="mt-2 text-sm text-foreground/60">
            No weather station is linked to this block yet. Map one under{" "}
            <Link href="/spray/integrations" className="font-semibold text-amber hover:text-amber/80">
              Integrations
            </Link>
            .
          </p>
        )}
        {readings && readings.stations.length > 0 && (
          <>
            <p className="mt-1 text-xs text-foreground/50">
              Recent readings from: {readings.stations.map((s) => s.name).join(", ")}
            </p>
            <TempRhSparkChart points={chron} />
          </>
        )}
      </section>

      <dialog
        ref={dialogRef}
        className="w-[min(100vw-2rem,24rem)] rounded-lg border border-border/40 bg-background p-4 text-foreground shadow-xl backdrop:bg-black/50"
        onClose={() => setSaveErr(null)}
      >
        <form
          method="dialog"
          className="space-y-4"
          onSubmit={(e) => {
            e.preventDefault();
            void saveBudbreak();
          }}
        >
          <div>
            <h4 className="font-display text-lg text-foreground/90">Block settings</h4>
            <p className="mt-1 text-sm text-foreground/60">
              Set the approximate budbreak date for this block. The index trend uses this to align
              with the growing season.
            </p>
          </div>
          <label className="block text-sm font-medium text-foreground/80">
            Budbreak date
            <input
              type="date"
              value={budbreakInput}
              onChange={(e) => setBudbreakInput(e.target.value)}
              className="mt-1 w-full rounded-md border border-border/50 bg-background px-3 py-2 text-sm"
            />
          </label>
          {saveErr && <p className="text-sm text-amber">{saveErr}</p>}
          <div className="flex justify-end gap-2 pt-2">
            <button
              type="button"
              className="rounded-md border border-border/40 px-3 py-2 text-sm font-semibold text-foreground/80 hover:bg-foreground/5"
              onClick={closeConfigure}
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={saving}
              className="rounded-md bg-amber px-3 py-2 text-sm font-semibold text-background hover:bg-amber/90 disabled:opacity-50"
            >
              {saving ? "Saving…" : "Save"}
            </button>
          </div>
        </form>
      </dialog>
    </div>
  );
}
