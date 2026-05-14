"use client";

import Link from "next/link";
import type { VerdictForecastDay } from "@/components/spray/VerdictCard";
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
            recommendation and current sprayability constraints.
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
            const settings = sprayProgram(summary?.org.settings);
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
                        : "No recommendation generated yet."}
                    </p>
                    <div className="mt-2 flex flex-wrap gap-3 text-xs">
                      <Link
                        href="/spray/dashboard"
                        className="font-semibold text-amber hover:text-amber/80"
                      >
                        Dashboard
                      </Link>
                      <Link
                        href={`/spray/vineyards/${block.vineyard_id}`}
                        className="font-semibold text-amber hover:text-amber/80"
                      >
                        Vineyard map
                      </Link>
                    </div>
                  </div>
                  {block.verdict_stale && (
                    <span className="rounded bg-amber/10 px-2 py-1 frame text-[0.65rem] font-semibold uppercase tracking-wider text-amber">
                      Data may be outdated
                    </span>
                  )}
                </div>

                {forecast.length === 0 ? (
                  <p className="mt-5 text-sm text-foreground/60">
                    No forecast window yet. Generate a recommendation from the
                    dashboard to fill this block.
                  </p>
                ) : (
                  <div className="mt-5 grid gap-2 md:grid-cols-7">
                    {forecast.slice(0, 7).map((day) => {
                      const sprayability = evaluateDay(day, settings);
                      return (
                        <article
                          key={`${block.id}-${day.date}`}
                          className="rounded-md border border-border/40 bg-background/50 p-3"
                        >
                          <p className="text-xs text-foreground/50">
                            {formatDay(day.date)}
                          </p>
                          <p className={`mt-2 frame text-xs font-semibold uppercase tracking-wider ${sprayability.tone}`}>
                            {sprayability.label}
                          </p>
                          <p className="mt-2 text-xs text-foreground/60">
                            Powdery {day.powdery_severity_1_10 ?? "?"}/10
                          </p>
                          <p className="text-xs text-foreground/60">
                            Downy {day.downy_severity_1_10 ?? "?"}/10
                          </p>
                          {sprayability.reasons.length > 0 && (
                            <ul className="mt-2 list-disc space-y-1 pl-4 text-xs text-foreground/50">
                              {sprayability.reasons.map((reason) => (
                                <li key={reason}>{reason}</li>
                              ))}
                            </ul>
                          )}
                        </article>
                      );
                    })}
                  </div>
                )}

                <p className="mt-4 text-xs text-foreground/50">
                  Program limits: wind &lt;= {settings.max_wind_mph} mph,
                  temperature {settings.min_temp_f}-{settings.max_temp_f} F,
                  no rain for {settings.avoid_rain_hours} hours after application.
                </p>
              </section>
            );
          })}
        </div>
      )}
    </div>
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

function evaluateDay(day: VerdictForecastDay, settings: SpraySettings) {
  /* Sprayability mirrors backend spray_window heuristics in
   * `services/api/spray/recommendation/directive.py` — keep both in sync when
   * changing limits or field names. */
  const reasons: string[] = [];
  const wind = windMph(day);
  const temp = tempF(day);
  const rain = rainMm(day);
  if (wind !== null && wind > settings.max_wind_mph) {
    reasons.push(`Wind ${Math.round(wind)} mph`);
  }
  if (temp !== null && temp < settings.min_temp_f) {
    reasons.push(`Too cold: ${Math.round(temp)} F`);
  }
  if (temp !== null && temp > settings.max_temp_f) {
    reasons.push(`Too hot: ${Math.round(temp)} F`);
  }
  if (rain !== null && rain > 0) {
    reasons.push(`Rain in ${settings.avoid_rain_hours}h window`);
  }
  if (day.action === "hold") {
    return { label: "hold", tone: "text-emerald-300", reasons };
  }
  if (reasons.length > 0) {
    return { label: "blocked", tone: "text-red-300", reasons };
  }
  return { label: day.action, tone: day.action === "spray" ? "text-amber" : "text-sky-300", reasons };
}

function windMph(day: VerdictForecastDay) {
  if (day.wind_mph !== undefined) return day.wind_mph;
  if (day.wind_speed_mph !== undefined) return day.wind_speed_mph;
  if (day.wind_speed_ms !== undefined) return day.wind_speed_ms * 2.23694;
  return null;
}

function tempF(day: VerdictForecastDay) {
  if (day.temp_f !== undefined) return day.temp_f;
  if (day.max_temp_f !== undefined) return day.max_temp_f;
  if (day.temp_c !== undefined) return day.temp_c * 9 / 5 + 32;
  if (day.max_temp_c !== undefined) return day.max_temp_c * 9 / 5 + 32;
  return null;
}

function rainMm(day: VerdictForecastDay) {
  if (day.precip_mm !== undefined) return day.precip_mm;
  if (day.rain_mm !== undefined) return day.rain_mm;
  if (day.rain_next_24h_mm !== undefined) return day.rain_next_24h_mm;
  return null;
}

function numberOr(value: unknown, fallback: number) {
  return typeof value === "number" ? value : fallback;
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
