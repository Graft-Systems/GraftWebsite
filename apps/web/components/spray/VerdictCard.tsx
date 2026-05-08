/**
 * VerdictCard — renders one BlockVerdict for grower-facing UI (M1.5 PR-F).
 *
 * Spec §13B.1: BlockVerdict IS the daily card. UI consumes it; LLM may
 * render the brief but never originates the numbers. This component
 * displays the schema-validated numbers verbatim with cited drivers.
 */
"use client";

import { useState } from "react";

export type VerdictDriver = {
  model: string;
  value: number;
  threshold: number;
  citation_id: string;
  weight: number;
};

export type VerdictForecastDay = {
  date: string;
  powdery_severity_1_10: number;
  downy_severity_1_10: number;
  action: "spray" | "hold" | "scout";
};

export type Verdict = {
  id: string;
  block: string;
  date: string;
  powdery_severity_1_10: string | number;
  downy_severity_1_10: string | number;
  powdery_confidence: string | number;
  downy_confidence: string | number;
  action: "spray" | "hold" | "scout";
  urgency: "now" | "24h" | "72h" | "none";
  drivers: VerdictDriver[];
  split_summary: string;
  forecast_7d: VerdictForecastDay[];
  advisory_events: string[];
  model_versions: Record<string, string>;
  generated_at: string;
  audit_hash: string;
};

const ACTION_STYLES: Record<Verdict["action"], { label: string; bg: string; fg: string }> = {
  spray: { label: "Spray", bg: "bg-red-500/15", fg: "text-red-300" },
  scout: { label: "Scout", bg: "bg-amber/15", fg: "text-amber" },
  hold: { label: "Hold", bg: "bg-emerald-500/15", fg: "text-emerald-300" },
};

const URGENCY_LABEL: Record<Verdict["urgency"], string> = {
  now: "Today",
  "24h": "Within 24h",
  "72h": "Within 72h",
  none: "—",
};

function num(value: string | number | null | undefined): number {
  if (value === null || value === undefined) return 0;
  return typeof value === "number" ? value : parseFloat(value) || 0;
}

function SeverityBar({
  label,
  severity,
  confidence,
  color,
}: {
  label: string;
  severity: number;
  confidence: number;
  color: string;
}) {
  const pct = Math.max(0, Math.min(100, severity * 10));
  const confPct = Math.round(confidence * 100);
  return (
    <div>
      <div className="flex items-baseline justify-between">
        <span className="frame text-[0.65rem] font-semibold uppercase tracking-wider text-foreground/60">
          {label}
        </span>
        <span className="text-xs text-foreground/60">
          {severity.toFixed(1)}/10 · {confPct}% conf.
        </span>
      </div>
      <div className="mt-1.5 h-2 overflow-hidden rounded-full bg-foreground/10">
        <div
          className={`h-full ${color} transition-all`}
          style={{ width: `${pct}%` }}
        />
      </div>
    </div>
  );
}

export function VerdictCard({
  verdict,
  blockName,
  orgId,
}: {
  verdict: Verdict;
  blockName?: string;
  orgId?: string;
}) {
  const [showDrivers, setShowDrivers] = useState(false);

  const action = ACTION_STYLES[verdict.action];
  const powdery = num(verdict.powdery_severity_1_10);
  const downy = num(verdict.downy_severity_1_10);
  const powderyConf = num(verdict.powdery_confidence);
  const downyConf = num(verdict.downy_confidence);

  return (
    <article className="rounded-md border border-border/40 bg-background/40 p-5">
      <header className="flex items-start justify-between gap-4">
        <div>
          {blockName && (
            <p className="frame text-[0.65rem] font-semibold uppercase tracking-wider text-foreground/50">
              {blockName}
            </p>
          )}
          <h3 className="font-display text-lg">{verdict.date}</h3>
        </div>
        <div className="flex flex-col items-end gap-1">
          <span
            className={`rounded-md px-3 py-1 frame text-[0.7rem] font-semibold uppercase tracking-wider ${action.bg} ${action.fg}`}
          >
            {action.label}
          </span>
          {verdict.urgency !== "none" && (
            <span className="text-[0.65rem] text-foreground/60">
              {URGENCY_LABEL[verdict.urgency]}
            </span>
          )}
        </div>
      </header>

      <div className="mt-5 space-y-3">
        <SeverityBar
          label="Powdery mildew"
          severity={powdery}
          confidence={powderyConf}
          color="bg-amber"
        />
        <SeverityBar
          label="Downy mildew"
          severity={downy}
          confidence={downyConf}
          color="bg-sky-500"
        />
      </div>

      {verdict.split_summary && (
        <p className="mt-4 text-xs italic text-foreground/60">
          {verdict.split_summary}
        </p>
      )}

      <button
        type="button"
        onClick={() => setShowDrivers((s) => !s)}
        className="mt-4 frame text-[0.65rem] font-semibold uppercase tracking-wider text-amber transition-colors hover:text-amber/80"
      >
        {showDrivers ? "Hide drivers ▴" : "Why this verdict? ▾"}
      </button>

      {showDrivers && (
        <ul className="mt-3 space-y-2 border-t border-border/30 pt-3">
          {verdict.drivers.length === 0 && (
            <li className="text-xs text-foreground/50">
              No model fired this period — verdict reflects baseline.
            </li>
          )}
          {verdict.drivers.map((d, i) => (
            <li
              key={`${d.model}-${d.citation_id}-${i}`}
              className="rounded border border-border/30 bg-background/30 px-3 py-2 text-xs"
            >
              <div className="flex items-center justify-between gap-3">
                <span className="font-mono text-foreground/80">{d.model}</span>
                <span className="rounded bg-foreground/10 px-2 py-0.5 text-[0.6rem] uppercase tracking-wider text-foreground/60">
                  [{d.citation_id}]
                </span>
              </div>
              <p className="mt-1 text-foreground/60">
                value {d.value.toFixed(2)} · weight {(d.weight * 100).toFixed(0)}%
              </p>
            </li>
          ))}
        </ul>
      )}

      <footer className="mt-5 flex items-center justify-between border-t border-border/30 pt-3 text-[0.6rem] uppercase tracking-wider text-foreground/40">
        <span title={verdict.audit_hash}>
          audit {verdict.audit_hash.slice(7, 15)}…
        </span>
        <div className="flex items-center gap-3">
          {orgId && verdict.block && (
            <a
              href={`/api/spray/orgs/${orgId}/blocks/${verdict.block}/verdicts/${verdict.id}/audit.pdf`}
              target="_blank"
              rel="noreferrer"
              className="text-amber transition-colors hover:text-amber/80"
              title="Download audit-log PDF"
            >
              audit pdf ↗
            </a>
          )}
          <span>
            {new Date(verdict.generated_at).toLocaleString(undefined, {
              month: "short",
              day: "numeric",
              hour: "2-digit",
              minute: "2-digit",
            })}
          </span>
        </div>
      </footer>
    </article>
  );
}
