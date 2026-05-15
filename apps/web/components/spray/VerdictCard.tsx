/**
 * VerdictCard — renders one BlockVerdict for grower-facing UI (M1.5 PR-F).
 *
 * Spec §13B.1: BlockVerdict IS the daily card. UI consumes it; LLM may
 * render the brief but never originates the numbers. This component
 * displays the schema-validated numbers verbatim with cited drivers.
 */
"use client";

import Link from "next/link";
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
  wind_mph?: number;
  wind_speed_mph?: number;
  wind_speed_ms?: number;
  temp_f?: number;
  max_temp_f?: number;
  temp_c?: number;
  max_temp_c?: number;
  precip_mm?: number;
  rain_mm?: number;
  /** Matches backend directive `_rain_mm` keys when present. */
  rain_next_24h_mm?: number;
};

export type PowderyPmiProfile = {
  pmi: number;
  tier: string;
  phase: string;
  date: string;
  rule_lines: string[];
  data_sources_summary?: Record<string, unknown>;
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
  directive?: {
    risk_level: "low" | "moderate" | "high" | "extreme";
    risk_score_1_10: number;
    primary_risk: string;
    when_to_spray: string;
    what_to_spray: string;
    where_to_spray: string[];
    when_not_to_spray: string[];
    confidence_note: string;
    spray_window?: {
      status: string;
      label: string;
      date?: string;
      reason?: string;
      blocked_reasons?: string[];
      next_safe_window?: string;
    };
  };
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
  powderyPmi,
}: {
  verdict: Verdict;
  blockName?: string;
  orgId?: string;
  powderyPmi?: PowderyPmiProfile | null;
}) {
  const [showDrivers, setShowDrivers] = useState(false);
  const [showPmi, setShowPmi] = useState(false);

  const action = ACTION_STYLES[verdict.action];
  const powdery = num(verdict.powdery_severity_1_10);
  const downy = num(verdict.downy_severity_1_10);
  const powderyConf = num(verdict.powdery_confidence);
  const downyConf = num(verdict.downy_confidence);
  const directive = verdict.directive;

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

      {powderyPmi && (
        <section className="mt-4 rounded-md border border-border/30 bg-background/25 p-3">
          <button
            type="button"
            onClick={() => setShowPmi((s) => !s)}
            className="flex w-full items-center justify-between frame text-[0.65rem] font-semibold uppercase tracking-wider text-amber transition-colors hover:text-amber/90"
          >
            <span>Powdery mildew (Gubler–Thomas PMI)</span>
            <span aria-hidden>{showPmi ? "▴" : "▾"}</span>
          </button>
          {showPmi && (
            <div className="mt-3 space-y-2 text-xs text-foreground/75">
              <p>
                Index{" "}
                <span className="font-semibold text-foreground">{powderyPmi.pmi}</span>{" "}
                ({powderyPmi.tier}) · last rollup {powderyPmi.date} · phase{" "}
                {powderyPmi.phase}
              </p>
              {powderyPmi.rule_lines.length > 0 ? (
                <ul className="list-disc space-y-1 pl-4">
                  {powderyPmi.rule_lines.map((line) => (
                    <li key={line}>{line}</li>
                  ))}
                </ul>
              ) : (
                <p className="text-foreground/50">No rule lines on the latest rollup row.</p>
              )}
            </div>
          )}
        </section>
      )}

      {directive && (
        <section className="mt-5 space-y-3 rounded-md border border-border/30 bg-background/30 p-4">
          <div>
            <p className="frame text-[0.65rem] font-semibold uppercase tracking-wider text-foreground/50">
              Directive
            </p>
            <p className="mt-1 text-sm text-foreground/80">
              {directive.risk_level.toUpperCase()} risk from {directive.primary_risk} ·{" "}
              {directive.risk_score_1_10.toFixed(1)}/10
            </p>
          </div>
          <div className="grid gap-3 text-xs text-foreground/70">
            <div>
              <p className="font-semibold text-foreground/85">When to spray</p>
              <p className="mt-1">{directive.when_to_spray}</p>
            </div>
            {directive.spray_window && (
              <div>
                <p className="font-semibold text-foreground/85">Spray window</p>
                <p className="mt-1">{directive.spray_window.label}</p>
                {directive.spray_window.blocked_reasons &&
                  directive.spray_window.blocked_reasons.length > 0 && (
                    <ul className="mt-2 list-disc space-y-1 pl-4 text-foreground/60">
                      {directive.spray_window.blocked_reasons.map((reason) => (
                        <li key={reason}>{reason}</li>
                      ))}
                    </ul>
                  )}
                {directive.spray_window.next_safe_window && (
                  <p className="mt-2 text-foreground/60">
                    Next likely safe window: {directive.spray_window.next_safe_window}
                  </p>
                )}
              </div>
            )}
            <div>
              <p className="font-semibold text-foreground/85">What to spray</p>
              <p className="mt-1">{directive.what_to_spray}</p>
            </div>
            <div>
              <p className="font-semibold text-foreground/85">Where to spray</p>
              <ul className="mt-1 list-disc space-y-1 pl-4">
                {directive.where_to_spray.map((item) => (
                  <li key={item}>{item}</li>
                ))}
              </ul>
            </div>
            <div>
              <p className="font-semibold text-foreground/85">When not to spray</p>
              <ul className="mt-1 list-disc space-y-1 pl-4">
                {directive.when_not_to_spray.map((item) => (
                  <li key={item}>{item}</li>
                ))}
              </ul>
            </div>
          </div>
        </section>
      )}

      <section className="mt-4 grid gap-2 rounded-md border border-border/30 bg-background/30 p-3 text-xs text-foreground/60 sm:grid-cols-2">
        <p>
          <span className="frame text-[0.6rem] uppercase tracking-wider text-foreground/40">
            Last run
          </span>
          <span className="mt-1 block">
            {new Date(verdict.generated_at).toLocaleString()}
          </span>
        </p>
        <p>
          <span className="frame text-[0.6rem] uppercase tracking-wider text-foreground/40">
            Evidence
          </span>
          <span className="mt-1 block">
            {verdict.drivers.length} model driver(s), audit ready
          </span>
        </p>
      </section>

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
          {(verdict.action === "spray" ||
            verdict.action === "scout" ||
            verdict.action === "hold") && (
            <Link
              href={`/spray/spray-records?block=${verdict.block}&verdict=${verdict.id}&target=${dominantTarget(directive?.primary_risk)}`}
              className="text-amber transition-colors hover:text-amber/80"
            >
              {verdict.action === "spray" ? "record spray" : "open spray log"}
            </Link>
          )}
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

function dominantTarget(primaryRisk?: string) {
  if (!primaryRisk) return "both";
  const lower = primaryRisk.toLowerCase();
  if (lower.includes("powdery")) return "powdery";
  if (lower.includes("downy")) return "downy";
  return "both";
}
