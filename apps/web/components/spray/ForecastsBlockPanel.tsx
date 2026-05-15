"use client";

import Link from "next/link";
import { forwardRef, useCallback, useEffect, useMemo, useState } from "react";
import { Check } from "lucide-react";
import type { VerdictForecastDay } from "@/components/spray/VerdictCard";
import { formatPmiDayLabel } from "@/components/spray/PmiCharts";
import type {
  BlockForecastWeatherDay,
  BlockForecastWeatherResponse,
  DashboardBlock,
} from "@/lib/sprayApi";

export type SprayProgramSettings = {
  max_wind_mph: number;
  min_temp_f: number;
  max_temp_f: number;
  avoid_rain_hours: number;
};

function addCalendarDays(iso: string, delta: number): string {
  const [y, mo, d] = iso.split("-").map(Number);
  const u = Date.UTC(y, mo - 1, d + delta);
  return new Date(u).toISOString().slice(0, 10);
}

function utcTodayIso(): string {
  return new Date().toISOString().slice(0, 10);
}

function forecastPressure(day: VerdictForecastDay | undefined): number | null {
  if (!day) return null;
  const p = Number(day.powdery_severity_1_10);
  const dw = Number(day.downy_severity_1_10);
  if (Number.isNaN(p) && Number.isNaN(dw)) return null;
  const m = Math.max(Number.isNaN(p) ? 0 : p, Number.isNaN(dw) ? 0 : dw);
  return Math.min(100, Math.round(m * 10));
}

function MildewPressureChart({
  pointsPast,
  pointsFuture,
}: {
  pointsPast: { x: number; y: number }[];
  pointsFuture: { x: number; y: number }[];
}) {
  const w = 840;
  const h = 200;
  const padL = 36;
  const padR = 12;
  const padY = 16;
  const innerW = w - padL - padR;
  const innerH = h - 2 * padY;
  const yAt = (pmi: number) => padY + (1 - Math.min(100, Math.max(0, pmi)) / 100) * innerH;
  const y0 = yAt(0);
  const y30 = yAt(30);
  const y70 = yAt(70);
  const y100 = yAt(100);

  const toPoints = (arr: { x: number; y: number }[]) =>
    arr.map((p) => `${p.x.toFixed(1)},${p.y.toFixed(1)}`).join(" ");

  return (
    <div className="mt-5 w-full overflow-x-auto">
      <svg
        viewBox={`0 0 ${w} ${h}`}
        className="min-w-[min(100%,840px)] w-full text-foreground/90"
        role="img"
        aria-label="Mildew pressure over three weeks"
      >
        <rect
          x={padL}
          y={y100}
          width={innerW}
          height={Math.max(0, y70 - y100)}
          fill="rgb(239 68 68 / 0.12)"
        />
        <rect
          x={padL}
          y={y70}
          width={innerW}
          height={Math.max(0, y30 - y70)}
          fill="rgb(234 179 8 / 0.12)"
        />
        <rect
          x={padL}
          y={y30}
          width={innerW}
          height={Math.max(0, y0 - y30)}
          fill="rgb(34 197 94 / 0.12)"
        />
        <text x={4} y={y100 + 10} className="fill-foreground/45 text-[10px]">
          High
        </text>
        <text x={4} y={y30 + 4} className="fill-foreground/45 text-[10px]">
          Low
        </text>
        <line
          x1={padL}
          y1={y0}
          x2={w - padR}
          y2={y0}
          stroke="currentColor"
          strokeOpacity={0.15}
        />
        {pointsPast.length > 1 && (
          <polyline
            fill="none"
            stroke="rgb(251 191 36)"
            strokeWidth={2.25}
            points={toPoints(pointsPast)}
          />
        )}
        {pointsFuture.length > 1 && (
          <polyline
            fill="none"
            stroke="rgb(251 191 36)"
            strokeWidth={2.25}
            strokeDasharray="7 5"
            points={toPoints(pointsFuture)}
          />
        )}
        {pointsPast.length > 0 && pointsFuture.length > 0 && (
          <circle
            cx={pointsPast[pointsPast.length - 1]?.x}
            cy={pointsPast[pointsPast.length - 1]?.y}
            r={3.5}
            fill="rgb(251 191 36)"
          />
        )}
      </svg>
      <p className="mt-2 text-[0.65rem] text-foreground/45">
        Solid line: stored daily index. Dashed line: seven-day outlook from
        disease model scores (not stored as index).
      </p>
    </div>
  );
}

function evaluateSprayWindow(
  vc: BlockForecastWeatherDay | undefined,
  settings: SprayProgramSettings,
): { ok: boolean; highlights: string[] } {
  if (!vc || vc.temp_max_f == null) {
    return { ok: false, highlights: ["Weather unavailable"] };
  }
  const hi: string[] = [];
  const t = vc.temp_max_f;
  const w = vc.wind_max_mph;
  const prob = vc.precip_prob_max;
  const mm = vc.precip_mm;
  const wet =
    (mm != null && mm >= 0.5) || (prob != null && prob >= 45);
  if (w != null && w > settings.max_wind_mph) {
    hi.push(`Wind ${w} mph`);
  }
  if (t < settings.min_temp_f) {
    hi.push(`Cold ${Math.round(t)}°F`);
  }
  if (t > settings.max_temp_f) {
    hi.push(`Hot ${Math.round(t)}°F`);
  }
  if (wet) {
    hi.push(prob != null ? `Rain ${prob}%` : "Wet day");
  }
  return { ok: hi.length === 0, highlights: hi };
}

function buildPressurePoints(
  dates: string[],
  todayAnchor: string,
  pmiByDate: Map<string, number>,
  forecastByDate: Map<string, VerdictForecastDay>,
): { past: { x: number; y: number }[]; future: { x: number; y: number }[] } {
  const n = dates.length;
  const padL = 36;
  const padR = 12;
  const innerW = 840 - padL - padR;
  const h = 200;
  const padY = 16;
  const innerH = h - 2 * padY;
  const yAt = (pmi: number) => padY + (1 - Math.min(100, Math.max(0, pmi)) / 100) * innerH;
  const past: { x: number; y: number }[] = [];
  const future: { x: number; y: number }[] = [];
  dates.forEach((date, i) => {
    const x = n <= 1 ? padL + innerW / 2 : padL + (i / (n - 1)) * innerW;
    let pmi: number | null = null;
    if (date < todayAnchor) {
      pmi = pmiByDate.get(date) ?? null;
    } else {
      pmi = forecastPressure(forecastByDate.get(date));
    }
    if (pmi == null) return;
    const pt = { x, y: yAt(pmi) };
    if (date < todayAnchor) past.push(pt);
    else future.push(pt);
  });
  return { past, future };
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
  const [weather, setWeather] = useState<BlockForecastWeatherResponse | null>(
    null,
  );
  const [weatherLoading, setWeatherLoading] = useState(false);

  const loadWeather = useCallback(async () => {
    setWeatherLoading(true);
    try {
      const res = await authedFetch(
        `/api/spray/orgs/${orgId}/blocks/${block.id}/forecast-weather`,
      );
      const data = (await res.json()) as BlockForecastWeatherResponse;
      setWeather(data);
    } catch {
      setWeather({ available: false, days: [], detail: "Network error" });
    } finally {
      setWeatherLoading(false);
    }
  }, [authedFetch, orgId, block.id]);

  useEffect(() => {
    void loadWeather();
  }, [loadWeather]);

  const verdict = block.latest_verdict;
  const forecast = verdict?.forecast_7d ?? [];
  const pmiHistory = block.pmi_history_14d ?? [];

  const todayAnchor = weather?.days?.[0]?.date ?? utcTodayIso();

  const dates = useMemo(() => {
    const out: string[] = [];
    for (let i = -14; i <= 6; i++) {
      out.push(addCalendarDays(todayAnchor, i));
    }
    return out;
  }, [todayAnchor]);

  const pmiByDate = useMemo(() => {
    const m = new Map<string, number>();
    for (const row of pmiHistory) {
      m.set(row.date, row.pmi);
    }
    return m;
  }, [pmiHistory]);

  const forecastByDate = useMemo(() => {
    const m = new Map<string, VerdictForecastDay>();
    for (const d of forecast) {
      m.set(d.date, d);
    }
    return m;
  }, [forecast]);

  const vcByDate = useMemo(() => {
    const m = new Map<string, BlockForecastWeatherDay>();
    for (const d of weather?.days ?? []) {
      m.set(d.date, d);
    }
    return m;
  }, [weather?.days]);

  const { past: pastPts, future: futurePts } = useMemo(
    () => buildPressurePoints(dates, todayAnchor, pmiByDate, forecastByDate),
    [dates, todayAnchor, pmiByDate, forecastByDate],
  );

  const weekDates = useMemo(() => dates.slice(14, 21), [dates]);

  const actionLabel = (a: string | undefined) =>
    a ? a.toUpperCase() : "—";

  return (
    <section
      ref={ref}
      id={`block-pmi-${block.id}`}
      className="rounded-md border border-border/40 bg-background/40 p-5"
    >
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h2 className="font-display text-xl">
            {block.vineyard_name} · {block.name}
          </h2>
          <p className="mt-1 text-sm text-foreground/60">
            {verdict
              ? `Current action: ${verdict.action.toUpperCase()}`
              : "No recommendation yet for this block."}
          </p>
          <div className="mt-2 flex flex-wrap gap-3 text-xs">
            <Link
              href="/spray/dashboard"
              className="font-semibold text-amber hover:text-amber/80"
            >
              Home
            </Link>
            <Link
              href={`/spray/vineyards/${block.vineyard_id}`}
              className="font-semibold text-amber hover:text-amber/80"
            >
              Vineyard map
            </Link>
            <Link
              href={`/spray/forecasts?block=${block.id}`}
              className="font-semibold text-foreground/60 hover:text-foreground"
            >
              Link this block
            </Link>
          </div>
        </div>
        {block.verdict_stale && (
          <span className="rounded bg-amber/10 px-2 py-1 frame text-[0.65rem] font-semibold uppercase tracking-wider text-amber">
            Data may be outdated
          </span>
        )}
      </div>

      <div className="mt-6 border-t border-border/30 pt-5">
        <h3 className="font-display text-lg text-foreground/90">
          Mildew pressure (3 weeks)
        </h3>
        <p className="mt-1 text-sm text-foreground/55">
          Past two weeks plus the next week. Shaded bands: lower left is calmer,
          upper right is more pressure.
        </p>
        {pmiHistory.length === 0 && forecast.length === 0 ? (
          <p className="mt-4 text-sm text-foreground/60">
            No index history yet. Set budbreak on the vineyard page, then check
            back after the next daily update.
          </p>
        ) : (
          <MildewPressureChart pointsPast={pastPts} pointsFuture={futurePts} />
        )}
      </div>

      <div className="mt-8 border-t border-border/30 pt-5">
        <div className="flex flex-wrap items-end justify-between gap-2">
          <div>
            <h3 className="font-display text-lg text-foreground/90">
              Spray window (next 7 days)
            </h3>
            <p className="mt-1 text-sm text-foreground/55">
              Wind up to {spraySettings.max_wind_mph} mph,{" "}
              {spraySettings.min_temp_f}–{spraySettings.max_temp_f}°F, dry enough
              for spraying (heavy rain or high rain chance blocks the day). Your
              program targets {spraySettings.avoid_rain_hours} hours without
              meaningful rain after application.
            </p>
          </div>
          {weather?.attribution && (
            <p className="text-[0.65rem] text-foreground/40">
              {weather.attribution}
            </p>
          )}
        </div>

        {weatherLoading && (
          <p className="mt-4 text-xs text-foreground/50">Loading weather…</p>
        )}
        {!weatherLoading && weather && !weather.available && (
          <p className="mt-4 rounded-md border border-amber/30 bg-amber/5 p-3 text-sm text-amber/90">
            {weather.detail ??
              "Weather forecast unavailable. Add VISUAL_CROSSING_API_KEY to the API server environment."}
          </p>
        )}

        {weekDates.length > 0 && (
          <div className="mt-4 overflow-x-auto pb-1">
            <div
              className="grid min-w-[640px] gap-px rounded-md border border-border/40 bg-border/30"
              style={{
                gridTemplateColumns: `repeat(${weekDates.length}, minmax(0, 1fr))`,
              }}
            >
              {weekDates.map((d) => {
                const fd = forecastByDate.get(d);
                const vc = vcByDate.get(d);
                const spray = evaluateSprayWindow(vc, spraySettings);
                return (
                  <div
                    key={d}
                    className="flex flex-col bg-background/80 p-2.5 text-center"
                  >
                    <p className="text-[0.65rem] font-semibold uppercase tracking-wide text-foreground/50">
                      {formatPmiDayLabel(d)}
                    </p>
                    <p className="mt-1 frame text-xs font-bold text-foreground">
                      {actionLabel(fd?.action)}
                    </p>
                  </div>
                );
              })}
              {weekDates.map((d) => {
                const vc = vcByDate.get(d);
                const t =
                  vc?.temp_max_f != null ? `${Math.round(vc.temp_max_f)}°` : "—";
                const w =
                  vc?.wind_max_mph != null ? `${vc.wind_max_mph} mph` : "—";
                const r =
                  vc?.precip_prob_max != null ? `${vc.precip_prob_max}%` : "—";
                return (
                  <div
                    key={`w-${d}`}
                    className="flex flex-col justify-center bg-background/55 px-2 py-2.5 text-center"
                  >
                    <p className="text-[0.7rem] leading-snug text-foreground/70">
                      {t} max · {w} max wind
                    </p>
                    <p className="text-[0.65rem] text-foreground/50">
                      Rain chance {r}
                    </p>
                  </div>
                );
              })}
              {weekDates.map((d) => {
                const vc = vcByDate.get(d);
                const spray = evaluateSprayWindow(vc, spraySettings);
                return (
                  <div
                    key={`s-${d}`}
                    className="flex min-h-[4.5rem] flex-col items-center justify-center bg-background/80 px-1.5 py-2"
                  >
                    {spray.ok ? (
                      <span className="flex items-center gap-1 text-xs font-semibold text-emerald-400">
                        <Check className="h-4 w-4 shrink-0" aria-hidden />
                        Clear window
                      </span>
                    ) : (
                      <ul className="space-y-1 text-left text-[0.7rem] font-medium leading-tight text-red-300">
                        {spray.highlights.map((line) => (
                          <li key={line}>{line}</li>
                        ))}
                      </ul>
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        )}
      </div>

      <details className="mt-6 rounded-md border border-border/30 bg-background/30 p-3 text-sm text-foreground/70">
        <summary className="cursor-pointer font-semibold text-foreground/85">
          Daily index details (14 days)
        </summary>
        {pmiHistory.length === 0 ? (
          <p className="mt-2 text-xs text-foreground/55">No rows yet.</p>
        ) : (
          <ul className="mt-3 max-h-48 space-y-1 overflow-y-auto text-xs">
            {[...pmiHistory]
              .reverse()
              .slice(0, 14)
              .map((row) => (
                <li
                  key={row.date}
                  className="flex justify-between border-b border-border/15 py-1 text-foreground/75"
                >
                  <span>{formatPmiDayLabel(row.date)}</span>
                  <span className="font-mono">
                    {row.pmi}{" "}
                    <span className="text-foreground/45">({row.tier})</span>
                  </span>
                </li>
              ))}
          </ul>
        )}
      </details>
    </section>
  );
});
ForecastsBlockPanel.displayName = "ForecastsBlockPanel";
