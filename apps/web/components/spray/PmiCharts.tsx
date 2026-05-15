"use client";

import type { PmiHistoryDay } from "@/lib/sprayApi";

export function formatPmiDayLabel(value: string) {
  const date = new Date(`${value}T00:00:00`);
  if (Number.isNaN(date.getTime())) return value;
  return date.toLocaleDateString(undefined, {
    weekday: "short",
    month: "short",
    day: "numeric",
  });
}

export function PmiLineChart({ history }: { history: PmiHistoryDay[] }) {
  const w = 320;
  const h = 120;
  const pad = 12;
  const n = history.length;
  const xs = history.map((_, i) =>
    n <= 1 ? w / 2 : pad + (i / (n - 1)) * (w - 2 * pad),
  );
  const ys = history.map(
    (d) => pad + (1 - Math.min(100, Math.max(0, d.pmi)) / 100) * (h - 2 * pad),
  );
  const points = xs.map((x, i) => `${x},${ys[i]}`).join(" ");
  const last = history[history.length - 1];
  return (
    <div className="mt-4">
      <p className="text-xs text-foreground/50">
        Latest {last.pmi} ({last.tier}) on {formatPmiDayLabel(last.date)}
      </p>
      <svg
        viewBox={`0 0 ${w} ${h}`}
        className="mt-2 w-full max-w-xl text-amber"
        role="img"
        aria-label="PMI trend last 14 days"
      >
        <line
          x1={pad}
          y1={h - pad}
          x2={w - pad}
          y2={h - pad}
          stroke="currentColor"
          strokeOpacity={0.25}
        />
        <polyline
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
          points={points}
        />
      </svg>
    </div>
  );
}

export function PmiHistoryTable({ history }: { history: PmiHistoryDay[] }) {
  const rows = [...history].reverse().slice(0, 14);
  return (
    <div className="mt-6 overflow-x-auto">
      <table className="w-full min-w-[640px] border-collapse text-left text-xs">
        <thead>
          <tr className="border-b border-border/40 text-foreground/50">
            <th className="py-2 pr-3 font-semibold">Date</th>
            <th className="py-2 pr-3 font-semibold">PMI</th>
            <th className="py-2 pr-3 font-semibold">Δ</th>
            <th className="py-2 pr-3 font-semibold">6h favourable</th>
            <th className="py-2 pr-3 font-semibold">Heat</th>
            <th className="py-2 pr-3 font-semibold">Longest run (h)</th>
            <th className="py-2 pr-3 font-semibold">Max °C</th>
            <th className="py-2 font-semibold">Phase</th>
          </tr>
        </thead>
        <tbody>
          {rows.map((row) => {
            const d = row.details as Record<string, unknown>;
            const delta = typeof d.daily_delta === "number" ? d.daily_delta : "—";
            const fav = d.favourable_six_hour_met === true ? "yes" : "no";
            const heat = d.heat_spike_day === true ? "yes" : "no";
            const run = d.longest_favourable_run_hours;
            const maxc = d.max_temp_c;
            return (
              <tr key={row.date} className="border-b border-border/20 text-foreground/80">
                <td className="py-2 pr-3">{formatPmiDayLabel(row.date)}</td>
                <td className="py-2 pr-3 font-mono">{row.pmi}</td>
                <td className="py-2 pr-3 font-mono">{delta}</td>
                <td className="py-2 pr-3">{fav}</td>
                <td className="py-2 pr-3">{heat}</td>
                <td className="py-2 pr-3">
                  {typeof run === "number" ? run.toFixed(1) : "—"}
                </td>
                <td className="py-2 pr-3">
                  {typeof maxc === "number" ? maxc.toFixed(1) : "—"}
                </td>
                <td className="py-2">{row.phase}</td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}

export function PmiBlockPanel({
  blockId: _blockId,
  history,
}: {
  blockId: string;
  history: PmiHistoryDay[];
}) {
  return (
    <div className="mt-8 border-t border-border/30 pt-6">
      <h3 className="font-display text-lg text-foreground/90">
        Powdery mildew index (14 days)
      </h3>
      {history.length === 0 ? (
        <p className="mt-2 text-sm text-foreground/60">
          No index history for this block yet. Set a budbreak date in block settings on the
          vineyard page, then check back after the next daily update.
        </p>
      ) : (
        <>
          <PmiLineChart history={history} />
          <PmiHistoryTable history={history} />
          <details className="mt-4 rounded-md border border-border/30 bg-background/30 p-3 text-sm text-foreground/70">
            <summary className="cursor-pointer font-semibold text-foreground/85">
              How this index was calculated
            </summary>
            <ul className="mt-3 list-disc space-y-2 pl-5 text-xs">
              <li>
                Conidial trigger: three consecutive UTC calendar days each with at least six
                consecutive hours between roughly 70°F and 85°F (21.1–29.4°C). On the third day PMI
                is set to 60 and the active phase begins.
              </li>
              <li>
                After activation: +20 when the favourable six-hour rule is met for that day; −10
                when it is not; an extra −10 when any hourly temperature reaches 35°C or above
                (hourly proxy for a short 95°F spike).
              </li>
              <li>
                Daily net change is clamped to at most +20 and at least −10 before applying; PMI is
                stored clamped to 0–100.
              </li>
            </ul>
          </details>
        </>
      )}
    </div>
  );
}
