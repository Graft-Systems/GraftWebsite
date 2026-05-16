"use client";

import Link from "next/link";
import { forwardRef, useCallback, useEffect, useMemo, useState } from "react";
import { Check, Thermometer, Wind, CloudRain, AlertCircle, Info } from "lucide-react";
import { formatPmiDayLabel } from "@/components/spray/PmiCharts";
import type {
  BlockForecastWeatherDay,
  BlockForecastWeatherResponse,
  BlockSensorReadingsResponse,
  DashboardBlock,
} from "@/lib/sprayApi";

export type SprayProgramSettings = {
  max_wind_mph: number;
  min_temp_f: number;
  max_temp_f: number;
  avoid_rain_hours: number;
};

type ComparisonDay = {
  date: string;
  actual_max_f: number | null;
  virtual_max_f: number | null;
};

function sparseComparisonSegments(
  rows: ComparisonDay[],
  pick: (d: ComparisonDay) => number | null | undefined,
  xAt: (i: number) => number,
  yAt: (t: number) => number,
): string[] {
  const segments: string[] = [];
  let buf: string[] = [];
  for (let i = 0; i < rows.length; i++) {
    const raw = pick(rows[i]);
    const v = typeof raw === "number" && !Number.isNaN(raw) ? raw : null;
    if (v === null) {
      if (buf.length >= 2) segments.push(buf.join(" "));
      buf = [];
    } else {
      buf.push(`${xAt(i)},${yAt(v)}`);
    }
  }
  if (buf.length >= 2) segments.push(buf.join(" "));
  return segments;
}

function fmtShortAxis(iso: string): string {
  const [y, mo, day] = iso.split("-").map(Number);
  return new Date(y, mo - 1, day).toLocaleDateString(undefined, {
    month: "short",
    day: "numeric",
  });
}

function addCalendarDays(iso: string, delta: number): string {
  const [y, mo, d] = iso.split("-").map(Number);
  const u = Date.UTC(y, mo - 1, d + delta);
  return new Date(u).toISOString().slice(0, 10);
}

function utcTodayIso(): string {
  return new Date().toISOString().slice(0, 10);
}

/** Calendar date in the user's local timezone (for bucketing sensor timestamps). */
function localDateIsoFromTs(ts: string): string {
  const d = new Date(ts);
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

/** Local calendar date (browser timezone), YYYY-MM-DD. */
function localTodayIso(): string {
  const n = new Date();
  const y = n.getFullYear();
  const m = String(n.getMonth() + 1).padStart(2, "0");
  const day = String(n.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

function tempCToF(c: number): number {
  return c * 9.0 / 5.0 + 32.0;
}

function PressureTrendChart({
  pointsPast,
  pointsFuture,
}: {
  pointsPast: { x: number; y: number }[];
  pointsFuture: { x: number; y: number }[];
}) {
  const w = 840;
  const h = 160;
  const padL = 40;
  const padR = 12;
  const padY = 12;
  const innerW = w - padL - padR;
  const innerH = h - 2 * padY;
  const yAt = (pmi: number) => padY + (1 - Math.min(100, Math.max(0, pmi)) / 100) * innerH;
  
  const toPoints = (arr: { x: number; y: number }[]) =>
    arr.map((p) => `${p.x.toFixed(1)},${p.y.toFixed(1)}`).join(" ");

  return (
    <div className="w-full overflow-hidden">
      <svg
        viewBox={`0 0 ${w} ${h}`}
        className="w-full text-foreground/90"
        role="img"
        aria-label="Disease pressure trend"
      >
        {/* Zones */}
        <rect x={padL} y={yAt(100)} width={innerW} height={innerH * 0.3} fill="rgb(239 68 68 / 0.08)" />
        <rect x={padL} y={yAt(70)} width={innerW} height={innerH * 0.4} fill="rgb(234 179 8 / 0.08)" />
        <rect x={padL} y={yAt(30)} width={innerW} height={innerH * 0.3} fill="rgb(34 197 94 / 0.08)" />
        
        {/* Labels */}
        <text x={8} y={yAt(85)} className="fill-foreground/30 text-[9px] font-bold uppercase tracking-wider">High</text>
        <text x={8} y={yAt(50)} className="fill-foreground/30 text-[9px] font-bold uppercase tracking-wider">Mod</text>
        <text x={8} y={yAt(15)} className="fill-foreground/30 text-[9px] font-bold uppercase tracking-wider">Low</text>

        {/* Lines */}
        <line x1={padL} y1={yAt(0)} x2={w - padR} y2={yAt(0)} stroke="currentColor" strokeOpacity={0.1} />
        <line x1={padL} y1={yAt(100)} x2={padL} y2={yAt(0)} stroke="currentColor" strokeOpacity={0.1} />

        {pointsPast.length > 1 && (
          <polyline
            fill="none"
            stroke="rgb(251 191 36)"
            strokeWidth={2.5}
            strokeLinejoin="round"
            points={toPoints(pointsPast)}
          />
        )}
        {pointsFuture.length > 1 && (
          <polyline
            fill="none"
            stroke="rgb(251 191 36)"
            strokeWidth={2.5}
            strokeDasharray="6 4"
            strokeLinejoin="round"
            points={toPoints(pointsFuture)}
          />
        )}
        {pointsPast.length > 0 && (
          <circle
            cx={pointsPast[pointsPast.length - 1].x}
            cy={pointsPast[pointsPast.length - 1].y}
            r={4}
            fill="rgb(251 191 36)"
            className="drop-shadow-sm"
          />
        )}
      </svg>
    </div>
  );
}

function TempComparisonChart({ data }: { data: ComparisonDay[] }) {
  const w = 840;
  const padBottom = 22;
  const h = 126 + padBottom;
  const padL = 40;
  const padR = 12;
  const padY = 16;
  const chartBottom = h - padBottom;
  const innerW = w - padL - padR;
  const innerH = chartBottom - 2 * padY;

  const denom = Math.max(1, data.length - 1);
  const allTemps = data
    .flatMap(d => [d.actual_max_f, d.virtual_max_f])
    .filter((t): t is number => typeof t === "number" && !Number.isNaN(t));
  const minT = allTemps.length > 0 ? Math.min(...allTemps, 40) : 40;
  const maxT = allTemps.length > 0 ? Math.max(...allTemps, 100) : 100;
  const range = Math.max(1, maxT - minT);

  const yAt = (t: number) => padY + (1 - (t - minT) / range) * innerH;
  const xAt = (i: number) => padL + (i / denom) * innerW;

  const virtualSegments = sparseComparisonSegments(
    data,
    d => d.virtual_max_f,
    xAt,
    yAt,
  );

  const actualIndices = data
    .map((d, i) => (d.actual_max_f != null ? i : null))
    .filter((i): i is number => i != null);

  const axisLabelIdx = Array.from(
    new Set([0, Math.floor((data.length - 1) / 2), data.length - 1]),
  ).filter(i => i >= 0 && i < data.length);

  return (
    <div className="w-full overflow-hidden">
      <svg viewBox={`0 0 ${w} ${h}`} className="w-full text-foreground/90">
        {/* Grid */}
        {[minT, (minT + maxT) / 2, maxT].map(t => (
          <g key={t}>
            <line x1={padL} y1={yAt(t)} x2={w - padR} y2={yAt(t)} stroke="currentColor" strokeOpacity={0.05} />
            <text x={8} y={yAt(t) + 4} className="fill-foreground/30 text-[9px] font-mono">{Math.round(t)}°</text>
          </g>
        ))}

        {/* Virtual (Visual Crossing) points — visible even when sparse */}
        {data.map((d, i) =>
          d.virtual_max_f != null && typeof d.virtual_max_f === "number" ? (
            <circle
              key={`vpt-${i}`}
              cx={xAt(i)}
              cy={yAt(d.virtual_max_f)}
              r={2.5}
              fill="rgb(148 163 184)"
              className="opacity-90"
            />
          ) : null,
        )}
        {virtualSegments.map((pts, si) => (
          <polyline
            key={`vc-${si}`}
            fill="none"
            stroke="rgb(148 163 184)"
            strokeOpacity={0.95}
            strokeWidth={2}
            strokeLinejoin="round"
            points={pts}
          />
        ))}

        {/* Actual (sensor) */}
        {actualIndices.length >= 2 ? (
          <polyline
            fill="none"
            stroke="rgb(34 197 94)"
            strokeWidth={2}
            strokeLinejoin="round"
            points={actualIndices.map(i => `${xAt(i)},${yAt(data[i].actual_max_f!)}`).join(" ")}
          />
        ) : null}
        {actualIndices.map(i => (
          <circle key={`apt-${i}`} cx={xAt(i)} cy={yAt(data[i].actual_max_f!)} r={3} fill="rgb(34 197 94)" />
        ))}

        {/* Sparse date labels */}
        {axisLabelIdx.map(i => (
          <text
            key={`xl-${i}`}
            x={xAt(i)}
            y={chartBottom - 4}
            textAnchor="middle"
            className="fill-foreground/35 text-[9px] font-mono"
          >
            {fmtShortAxis(data[i].date)}
          </text>
        ))}
      </svg>
      <div className="flex items-center gap-4 px-10 text-[0.65rem] font-medium text-foreground/50">
        <div className="flex items-center gap-1.5">
          <div className="h-2 w-2 rounded-full bg-emerald-500" />
          <span>On-site sensor (historic daily high)</span>
        </div>
        <div className="flex items-center gap-1.5">
          <div className="h-0.5 w-4 rounded-[1px] bg-slate-400" />
          <span>Visual Crossing grid (historic daily high)</span>
        </div>
      </div>
    </div>
  );
}

function evaluateSprayWindow(
  vc: BlockForecastWeatherDay | undefined,
  settings: SprayProgramSettings,
): { ok: boolean; highlights: string[] } {
  if (!vc || vc.temp_max_f == null) {
    return { ok: false, highlights: ["No data"] };
  }
  const hi: string[] = [];
  const t = vc.temp_max_f;
  const w = vc.wind_max_mph;
  const prob = vc.precip_prob_max;
  const mm = vc.precip_mm;
  const wet = (mm != null && mm >= 0.5) || (prob != null && prob >= 40);

  if (w != null && w > settings.max_wind_mph) hi.push(`${w} mph wind`);
  if (t < settings.min_temp_f) hi.push(`Too cold (${Math.round(t)}°F)`);
  if (t > settings.max_temp_f) hi.push(`Too hot (${Math.round(t)}°F)`);
  if (wet) hi.push("Rain expected");
  
  return { ok: hi.length === 0, highlights: hi };
}

export const ForecastsBlockPanel = forwardRef<
  HTMLElement,
  {
    orgId: string;
    block: DashboardBlock;
    spraySettings: SprayProgramSettings;
    authedFetch: (path: string, init?: RequestInit) => Promise<Response>;
  }
>(function ForecastsBlockPanel(
  { orgId, block, spraySettings, authedFetch },
  ref,
) {
  const [weather, setWeather] = useState<BlockForecastWeatherResponse | null>(null);
  const [comparison, setComparison] = useState<ComparisonDay[]>([]);
  const [sensorPayload, setSensorPayload] = useState<BlockSensorReadingsResponse | null>(null);
  const [loading, setLoading] = useState(true);

  const hasComparisonSeries = useMemo(
    () =>
      comparison.some(d => d.actual_max_f != null || d.virtual_max_f != null),
    [comparison],
  );

  const loadData = useCallback(async () => {
    setLoading(true);
    try {
      const [wRes, cRes, sRes] = await Promise.all([
        authedFetch(`/api/spray/orgs/${orgId}/blocks/${block.id}/forecast-weather`),
        authedFetch(`/api/spray/orgs/${orgId}/blocks/${block.id}/weather-comparison?days=14`),
        authedFetch(
          `/api/spray/orgs/${orgId}/blocks/${block.id}/sensor-readings?hours=120&limit=2000`,
        ),
      ]);
      const wData = await wRes.json();
      const cData = await cRes.json();
      setWeather(wData);
      setComparison(cData.results || []);
      if (sRes.ok) {
        setSensorPayload((await sRes.json()) as BlockSensorReadingsResponse);
      } else {
        setSensorPayload(null);
      }
    } catch {
      setWeather({ available: false, days: [] });
      setComparison([]);
      setSensorPayload(null);
    } finally {
      setLoading(false);
    }
  }, [authedFetch, orgId, block.id]);

  useEffect(() => {
    void loadData();
  }, [loadData]);

  const verdict = block.latest_verdict;
  const forecast = verdict?.forecast_7d ?? [];
  const pmiHistory = block.pmi_history_14d ?? [];
  const todayAnchor = weather?.days?.[0]?.date ?? utcTodayIso();

  const dates = useMemo(() => {
    const out: string[] = [];
    for (let i = -14; i <= 6; i++) out.push(addCalendarDays(todayAnchor, i));
    return out;
  }, [todayAnchor]);

  const pmiByDate = useMemo(() => {
    const m = new Map<string, number>();
    for (const row of pmiHistory) m.set(row.date, row.pmi);
    return m;
  }, [pmiHistory]);

  const forecastByDate = useMemo(() => {
    const m = new Map<string, any>();
    for (const d of forecast) m.set(d.date, d);
    return m;
  }, [forecast]);

  const vcByDate = useMemo(() => {
    const m = new Map<string, BlockForecastWeatherDay>();
    for (const d of weather?.days ?? []) m.set(d.date, d);
    return m;
  }, [weather?.days]);

  /** Max air temp (°F) from linked on-site stations per local calendar day. */
  const sensorMaxFByLocalDate = useMemo(() => {
    const m = new Map<string, number>();
    for (const r of sensorPayload?.readings ?? []) {
      if (r.air_temp_c == null) continue;
      const day = localDateIsoFromTs(r.ts);
      const f = tempCToF(r.air_temp_c);
      m.set(day, Math.max(m.get(day) ?? f, f));
    }
    return m;
  }, [sensorPayload?.readings]);

  const pressurePoints = useMemo(() => {
    const n = dates.length;
    const w = 840, padL = 40, padR = 12, innerW = w - padL - padR;
    const h = 160, padY = 12, innerH = h - 2 * padY;
    const yAt = (pmi: number) => padY + (1 - Math.min(100, Math.max(0, pmi)) / 100) * innerH;

    const past: any[] = [], future: any[] = [];
    dates.forEach((date, i) => {
      const x = padL + (i / (n - 1)) * innerW;
      let pmi = date < todayAnchor ? pmiByDate.get(date) : null;
      if (date >= todayAnchor) {
        const fd = forecastByDate.get(date);
        if (fd) {
          const p = Number(fd.powdery_severity_1_10);
          const dw = Number(fd.downy_severity_1_10);
          pmi = Math.min(100, Math.round(Math.max(isNaN(p) ? 0 : p, isNaN(dw) ? 0 : dw) * 10));
        }
      }
      if (pmi != null) {
        const pt = { x, y: yAt(pmi) };
        if (date < todayAnchor) past.push(pt); else future.push(pt);
      }
    });
    return { past, future };
  }, [dates, todayAnchor, pmiByDate, forecastByDate]);

  const next7Days = useMemo(() => dates.slice(14, 21), [dates]);

  return (
    <section ref={ref} className="space-y-6 overflow-hidden">
      {/* Header Info */}
      <div className="flex items-center justify-between gap-4">
        <div>
          <h2 className="font-display text-2xl">{block.name}</h2>
          <p className="text-sm text-foreground/60">{block.variety} · {block.vineyard_name}</p>
        </div>
        {verdict && (
          <div className={`rounded-md border px-4 py-2 text-center ${
            verdict.action === "spray" ? "border-red-500/30 bg-red-500/5 text-red-300" :
            verdict.action === "scout" ? "border-amber/30 bg-amber/5 text-amber" :
            "border-emerald-500/30 bg-emerald-500/5 text-emerald-300"
          }`}>
            <p className="text-[0.6rem] font-bold uppercase tracking-widest opacity-60">Daily Action</p>
            <p className="text-lg font-bold uppercase tracking-wide">{verdict.action}</p>
          </div>
        )}
      </div>

      {/* Disease Pressure Visual */}
      <div className="rounded-xl border border-border/40 bg-background/40 p-1 shadow-sm">
        <div className="p-4 pb-0">
          <div className="flex items-center gap-2">
            <AlertCircle className="h-4 w-4 text-amber" />
            <h3 className="font-display text-base font-semibold">Disease Pressure Outlook</h3>
          </div>
          <p className="mt-1 text-xs text-foreground/50">Mildew risk trend: past 14 days and 7-day outlook.</p>
        </div>
        <PressureTrendChart pointsPast={pressurePoints.past} pointsFuture={pressurePoints.future} />
      </div>

      {/* Weather & Spray Window Grid */}
      <div className="space-y-2">
        <p className="text-[0.65rem] text-foreground/45">
          Seven-day highs from{" "}
          <span className="font-semibold text-foreground/55">Visual Crossing</span>{" "}
          (gridded). Today&apos;s card also shows the daily max from linked{" "}
          <span className="font-semibold text-emerald-400/80">on-site stations</span>{" "}
          when readings exist.
        </p>
        <div className="grid grid-cols-1 gap-4 lg:grid-cols-7">
        {next7Days.map((d) => {
          const vc = vcByDate.get(d);
          const spray = evaluateSprayWindow(vc, spraySettings);
          const fd = forecastByDate.get(d);
          
          return (
            <div key={d} className={`flex flex-col rounded-xl border p-3 transition-colors ${
              spray.ok ? "border-emerald-500/20 bg-emerald-500/5" : "border-border/30 bg-background/40"
            }`}>
              <span className="text-[0.6rem] font-bold uppercase tracking-wider text-foreground/40">
                {formatPmiDayLabel(d).split(",")[0]}
              </span>
              <span className="mt-0.5 text-xs font-semibold">{formatPmiDayLabel(d).split(",")[1]}</span>
              
              <div className="mt-4 flex flex-col gap-2">
                {d === todayAnchor ? (
                  <>
                    <div
                      className="flex flex-col gap-0.5 rounded-md bg-foreground/[0.03] px-2 py-1.5"
                      title="Visual Crossing gridded daily maximum"
                    >
                      <div className="flex items-center justify-between gap-2">
                        <span className="text-[0.55rem] font-bold uppercase tracking-wide text-foreground/40">
                          VC max
                        </span>
                        <span className="text-sm font-semibold">
                          {vc?.temp_max_f != null ? `${Math.round(vc.temp_max_f)}°` : "—"}
                        </span>
                      </div>
                      <span className="text-[0.55rem] text-foreground/35">Visual Crossing</span>
                    </div>
                    <div
                      className="flex flex-col gap-0.5 rounded-md bg-emerald-500/[0.06] px-2 py-1.5"
                      title="Max air temperature from stations linked to this block (your local calendar day)"
                    >
                      <div className="flex items-center justify-between gap-2">
                        <span className="text-[0.55rem] font-bold uppercase tracking-wide text-emerald-400/70">
                          Station max
                        </span>
                        <span className="text-sm font-semibold text-emerald-100/90">
                          {(() => {
                            const byVcDay = sensorMaxFByLocalDate.get(d);
                            const byLocalToday =
                              d === todayAnchor
                                ? sensorMaxFByLocalDate.get(localTodayIso())
                                : undefined;
                            const v =
                              byVcDay ??
                              (d === todayAnchor ? byLocalToday : undefined);
                            return v != null ? `${Math.round(v)}°` : "—";
                          })()}
                        </span>
                      </div>
                      <span className="text-[0.55rem] text-emerald-400/50">
                        On-site (linked)
                      </span>
                    </div>
                  </>
                ) : (
                  <div className="flex items-center gap-2" title="Visual Crossing daily max">
                    <Thermometer className="h-3.5 w-3.5 shrink-0 text-foreground/40" />
                    <span className="text-sm font-medium">
                      {vc?.temp_max_f ? `${Math.round(vc.temp_max_f)}°` : "—"}
                    </span>
                  </div>
                )}
                <div className="flex items-center gap-2" title="Max Wind Speed">
                  <Wind className="h-3.5 w-3.5 text-foreground/40" />
                  <span className="text-[0.7rem]">{vc?.wind_max_mph ? `${vc.wind_max_mph} mph` : "—"}</span>
                </div>
                <div className="flex items-center gap-2" title="Rain Probability">
                  <CloudRain className="h-3.5 w-3.5 text-foreground/40" />
                  <span className="text-[0.7rem]">{vc?.precip_prob_max ? `${vc.precip_prob_max}%` : "—"}</span>
                </div>
              </div>

              <div className="mt-4 border-t border-border/10 pt-3">
                {spray.ok ? (
                  <div className="flex flex-col items-center gap-1 text-center">
                    <div className="rounded-full bg-emerald-500/20 p-1">
                      <Check className="h-3 w-3 text-emerald-400" />
                    </div>
                    <span className="text-[0.6rem] font-bold uppercase tracking-tight text-emerald-400">Clear</span>
                  </div>
                ) : (
                  <div className="space-y-1">
                    {spray.highlights.map(h => (
                      <p key={h} className="text-[0.6rem] font-medium leading-tight text-red-300/80">{h}</p>
                    ))}
                  </div>
                )}
              </div>
            </div>
          );
        })}
        </div>
      </div>

      {/* Data Source Comparison */}
      <div className="rounded-xl border border-border/40 bg-background/20 p-5">
        <div className="mb-4 flex items-start justify-between">
          <div>
            <div className="flex items-center gap-2">
              <Thermometer className="h-4 w-4 text-foreground/60" />
              <h3 className="font-display text-base font-semibold">Sensor vs. Virtual Data</h3>
            </div>
            <p className="mt-1 text-xs text-foreground/50">
              Historic daily highs: your linked sensor readings versus Visual Crossing at this block&apos;s
              coordinates.
            </p>
          </div>
          <Link href="/spray/integrations" className="text-[0.65rem] font-bold uppercase tracking-widest text-amber hover:underline">
            Manage Sensors
          </Link>
        </div>
        
        {hasComparisonSeries ? (
          <TempComparisonChart data={comparison} />
        ) : (
          <div className="flex h-32 items-center justify-center rounded-lg border border-dashed border-border/30 bg-background/20">
            <p className="text-xs text-foreground/40">No historical comparison available for this period.</p>
          </div>
        )}
      </div>

      {/* Info Note */}
      <div className="flex gap-2 rounded-lg bg-foreground/5 p-3 text-[0.7rem] text-foreground/60">
        <Info className="h-4 w-4 shrink-0 opacity-50" />
        <p>
          Spray windows are calculated based on your local settings. 
          Dashed lines in the outlook are predictions based on expected weather; 
          solid lines are confirmed historical data points.
        </p>
      </div>
    </section>
  );
});

ForecastsBlockPanel.displayName = "ForecastsBlockPanel";
