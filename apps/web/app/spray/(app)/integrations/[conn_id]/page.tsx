/**
 * Integration detail (M1.5 PR-D).
 *
 * Lists the vendor's stations (live-fetched from the connector + cached
 * as SensorStation rows) with a per-station "Link to block" picker and
 * per-link unlink.
 */
"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import { X } from "lucide-react";
import { useActiveOrg } from "@/lib/sprayApi";
import {
  getStationHealth,
  type StationHealth,
} from "@/lib/spraySetupStatus";

type Station = {
  id: string;
  vendor_station_id: string;
  name: string;
  lat: number | null;
  lon: number | null;
  last_seen_at: string | null;
  linked_block_ids: string[];
};
type Block = {
  id: string;
  name: string;
  archived_at: string | null;
};
type Vineyard = { id: string; name: string; archived_at: string | null };

/** Sync pull-readings API returns this as ``pull_summary`` (subset may be empty). */
type PullSummary = {
  count: number;
  readings: Array<{
    ts: string;
    air_temp_c: number | null;
    rh_pct: number | null;
    leaf_wetness_min: number | null;
    precip_mm: number | null;
    wind_speed_ms: number | null;
    quality_flag: string;
  }>;
  readings_total: number;
  readings_truncated: boolean;
  gap_fill: boolean;
  since_utc: string | null;
  until_utc: string;
  vendor: string;
  vendor_station_id: string;
  station_name: string;
};

const STATION_STATUS_COPY: Record<
  StationHealth,
  { label: string; className: string }
> = {
  active: {
    label: "active",
    className: "bg-emerald-500/15 text-emerald-300",
  },
  stale: {
    label: "stale",
    className: "bg-amber/15 text-amber",
  },
  never_seen: {
    label: "never seen",
    className: "bg-foreground/10 text-foreground/50",
  },
  unmapped: {
    label: "unmapped",
    className: "bg-red-500/15 text-red-300",
  },
};

export default function IntegrationDetailPage() {
  const params = useParams<{ conn_id: string }>();
  const connId = params.conn_id;
  const { org, loading: orgLoading, authedFetch } = useActiveOrg();
  const orgId = org?.id ?? null;

  const [stations, setStations] = useState<Station[] | null>(null);
  const [blocks, setBlocks] = useState<{ id: string; label: string }[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [pullingStationId, setPullingStationId] = useState<string | null>(null);
  const [unlinkingKey, setUnlinkingKey] = useState<string | null>(null);
  const [pullReports, setPullReports] = useState<Record<string, PullSummary>>({});

  useEffect(() => {
    let cancelled = false;
    async function load() {
      if (!orgId) return;
      try {
        const [sRes, vRes] = await Promise.all([
          authedFetch(
            `/api/spray/orgs/${orgId}/integrations/${connId}/stations`,
          ),
          authedFetch(`/api/spray/orgs/${orgId}/vineyards`),
        ]);
        if (!sRes.ok) throw new Error(`stations ${sRes.status}`);
        const sData = (await sRes.json()) as { results: Station[] };
        if (!cancelled) setStations(sData.results);

        if (vRes.ok) {
          const vineyards = ((await vRes.json()) as Vineyard[]).filter(
            (v) => v.archived_at === null,
          );
          const lists = await Promise.all(
            vineyards.map(async (v) => {
              const r = await authedFetch(
                `/api/spray/orgs/${orgId}/vineyards/${v.id}/blocks`,
              );
              if (!r.ok) return [] as { id: string; label: string }[];
              const bs = ((await r.json()) as Block[]).filter(
                (b) => b.archived_at === null,
              );
              return bs.map((b) => ({
                id: b.id,
                label: `${v.name} · ${b.name}`,
              }));
            }),
          );
          if (!cancelled) setBlocks(lists.flat());
        }
      } catch (e) {
        if (!cancelled) setError(e instanceof Error ? e.message : "load failed");
      }
    }
    load();
    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [orgId, connId, authedFetch]);

  async function linkBlock(stationId: string, blockId: string) {
    if (!orgId) return;
    setError(null);
    const r = await authedFetch(
      `/api/spray/orgs/${orgId}/integrations/${connId}/stations/${stationId}/link-block`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ block_id: blockId }),
      },
    );
    if (!r.ok) {
      setError(`link ${r.status}`);
      return;
    }
    setStations((prev) =>
      (prev ?? []).map((s) =>
        s.id === stationId
          ? {
              ...s,
              linked_block_ids: Array.from(
                new Set([...s.linked_block_ids, blockId]),
              ),
            }
          : s,
      ),
    );
  }

  async function pullReadings(stationId: string) {
    if (!orgId) return;
    setPullingStationId(stationId);
    setError(null);
    try {
      const r = await authedFetch(
        `/api/spray/orgs/${orgId}/integrations/${connId}/stations/${stationId}/pull-readings`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ sync: true }),
        },
      );
      const data = (await r.json().catch(() => ({}))) as {
        detail?: string;
        readings_upserted?: number;
        queued?: boolean;
        pull_summary?: PullSummary;
      };
      if (!r.ok) {
        setError(data.detail ?? `pull readings failed (${r.status})`);
        return;
      }
      if (data.pull_summary) {
        setPullReports((prev) => ({
          ...prev,
          [stationId]: data.pull_summary as PullSummary,
        }));
      }
      const sRes = await authedFetch(
        `/api/spray/orgs/${orgId}/integrations/${connId}/stations`,
      );
      if (sRes.ok) {
        const sData = (await sRes.json()) as { results: Station[] };
        setStations(sData.results);
      }
      if (data.readings_upserted === 0 && !data.queued) {
        setError(
          "Pull finished but vendor returned no new rows (check API keys, demo mode, or station ID).",
        );
      }
    } catch (e) {
      setError(e instanceof Error ? e.message : "pull failed");
    } finally {
      setPullingStationId(null);
    }
  }

  async function unlinkBlock(stationId: string, blockId: string) {
    if (!orgId) return;
    setError(null);
    const key = `${stationId}:${blockId}`;
    setUnlinkingKey(key);
    try {
      const r = await authedFetch(
        `/api/spray/orgs/${orgId}/integrations/${connId}/stations/${stationId}/link-block`,
        {
          method: "DELETE",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ block_id: blockId }),
        },
      );
      const data = (await r.json().catch(() => ({}))) as { detail?: string };
      if (!r.ok) {
        setError(data.detail ?? `unlink failed (${r.status})`);
        return;
      }
      setStations((prev) =>
        (prev ?? []).map((s) =>
          s.id === stationId
            ? {
                ...s,
                linked_block_ids: s.linked_block_ids.filter((id) => id !== blockId),
              }
            : s,
        ),
      );
    } finally {
      setUnlinkingKey(null);
    }
  }

  return (
    <div className="w-full max-w-4xl">
      <Link
        href="/spray/integrations"
        className="frame text-xs font-semibold text-amber hover:underline"
      >
        ← Integrations
      </Link>
      <h1 className="mt-3 font-display text-3xl">Stations</h1>
      <p className="mt-2 text-sm text-foreground/60">
        Link each station to the blocks it represents. Mapped stations feed
        15-minute readings into the mildew verdict engine; stale or unmapped
        stations lower confidence until they are fixed. Use{" "}
        <span className="font-semibold text-foreground/80">Pull readings now</span>{" "}
        to fetch the latest points from the vendor immediately (runs in the API
        process — fine for dev/testing).
      </p>

      {error && (
        <p className="mt-6 rounded-md border border-red-500/50 bg-red-500/10 p-3 text-sm text-red-300">
          {error}
        </p>
      )}

      {!orgId && !orgLoading && (
        <p className="mt-6 text-sm text-foreground/60">
          No organization context — open Integrations from a signed-in session with a membership.
        </p>
      )}

      {stations === null && orgId && !error && (
        <p className="mt-12 text-foreground/50">Loading…</p>
      )}

      {stations && stations.length === 0 && (
        <p className="mt-10 text-sm text-foreground/60">
          No stations on this account yet.
        </p>
      )}

      {stations && stations.length > 0 && (
        <ul className="mt-6 space-y-3">
          {stations.map((s) => {
            const status = getStationHealth(s);
            const statusCopy = STATION_STATUS_COPY[status];
            const linkedEntries = s.linked_block_ids.map((blockId) => ({
              id: blockId,
              label:
                blocks.find((b) => b.id === blockId)?.label ??
                `Archived or removed block (${blockId.slice(0, 8)}…)`,
            }));
            const availableBlocks = blocks.filter(
              (b) => !s.linked_block_ids.includes(b.id),
            );

            return (
              <li
                key={s.id}
                className="rounded-md border border-border/40 bg-background/40 p-4"
              >
                <div className="flex flex-wrap items-start justify-between gap-4">
                  <div>
                    <p className="font-display text-lg">
                      {s.name || s.vendor_station_id}
                    </p>
                    <p className="mt-1 text-xs text-foreground/60">
                      {s.vendor_station_id} ·{" "}
                      {s.last_seen_at
                        ? `last seen ${new Date(s.last_seen_at).toLocaleString()}`
                        : "no readings received yet"}
                    </p>
                  </div>
                  <span
                    className={`rounded px-2 py-1 frame text-[0.65rem] font-semibold uppercase tracking-wider ${statusCopy.className}`}
                  >
                    {statusCopy.label}
                  </span>
                </div>

                <div className="mt-3">
                  <button
                    type="button"
                    disabled={pullingStationId === s.id}
                    onClick={() => pullReadings(s.id)}
                    className="rounded-md border border-amber/50 bg-amber/10 px-3 py-1.5 frame text-xs font-semibold text-amber transition-colors hover:bg-amber/20 disabled:opacity-50"
                  >
                    {pullingStationId === s.id ? "Pulling…" : "Pull readings now"}
                  </button>
                </div>

                {pullReports[s.id] ? (
                  <PullReportPanel report={pullReports[s.id]} />
                ) : null}

                <div className="mt-4">
                  <p className="frame text-[0.65rem] uppercase tracking-wider text-foreground/50">
                    Linked blocks
                  </p>
                  <p className="mt-1 text-xs text-foreground/50">
                    A plain id is usually an archived or removed block still linked here — use
                    the button on the right to unlink.
                  </p>
                  {linkedEntries.length > 0 ? (
                    <div className="mt-2 flex flex-wrap gap-2">
                      {linkedEntries.map((entry) => {
                        const busy =
                          unlinkingKey === `${s.id}:${entry.id}`;
                        return (
                          <span
                            key={entry.id}
                            className="inline-flex items-center gap-1 rounded border border-border/40 px-2 py-1 text-xs text-foreground/70"
                          >
                            <span>{entry.label}</span>
                            <button
                              type="button"
                              disabled={busy}
                              aria-label={`Unlink ${entry.label}`}
                              onClick={() => unlinkBlock(s.id, entry.id)}
                              className="rounded p-0.5 text-foreground/50 transition-colors hover:bg-red-500/20 hover:text-red-300 disabled:opacity-40"
                            >
                              <X className="h-3.5 w-3.5" strokeWidth={2.5} />
                            </button>
                          </span>
                        );
                      })}
                    </div>
                  ) : (
                    <p className="mt-2 text-sm text-amber">
                      Not mapped yet. Link this station before relying on its
                      block-level readings.
                    </p>
                  )}
                </div>

                {blocks.length > 0 ? (
                  <div className="mt-4 flex flex-wrap items-center gap-2">
                    <label
                      htmlFor={`link-${s.id}`}
                      className="frame text-[0.65rem] uppercase tracking-wider text-foreground/50"
                    >
                      Link station to block
                    </label>
                    <select
                      id={`link-${s.id}`}
                      defaultValue=""
                      disabled={availableBlocks.length === 0}
                      onChange={(e) => {
                        if (e.target.value) {
                          linkBlock(s.id, e.target.value);
                          e.target.value = "";
                        }
                      }}
                      className="rounded-md border border-border/40 bg-background/60 px-3 py-1 text-sm disabled:opacity-50"
                    >
                      <option value="" disabled>
                        {availableBlocks.length > 0
                          ? "Select a block..."
                          : "All blocks linked"}
                      </option>
                      {availableBlocks.map((b) => (
                        <option key={b.id} value={b.id}>
                          {b.label}
                        </option>
                      ))}
                    </select>
                  </div>
                ) : (
                  <p className="mt-4 text-sm text-foreground/60">
                    No blocks are available yet.{" "}
                    <Link
                      href="/spray/vineyards"
                      className="font-semibold text-amber hover:text-amber/80"
                    >
                      Create vineyard blocks
                    </Link>{" "}
                    before mapping stations.
                  </p>
                )}
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}

function dashNum(v: number | null | undefined): string {
  if (v === null || v === undefined) return "—";
  if (typeof v === "number" && Number.isNaN(v)) return "—";
  return String(v);
}

function PullReportPanel({ report }: { report: PullSummary }) {
  return (
    <div className="mt-3 rounded-md border border-border/40 bg-foreground/[0.04] p-3 text-xs">
      <p className="frame text-[0.65rem] font-semibold uppercase tracking-wider text-foreground/55">
        Last pull result
      </p>
      <p className="mt-2 text-foreground/75">
        <span className="font-semibold text-foreground/90">{report.readings_total}</span>{" "}
        readings upserted
        {report.readings_truncated ? (
          <span className="text-amber">
            {" "}
            (table shows first {report.readings.length} of {report.readings_total})
          </span>
        ) : null}
        {" · "}
        vendor {report.vendor} / device {report.vendor_station_id}
        {report.station_name ? ` (${report.station_name})` : ""}
        {" · "}
        window {report.since_utc ?? "—"} → {report.until_utc}
        {report.gap_fill ? (
          <span className="text-amber"> · gap-fill quality flag applied</span>
        ) : null}
      </p>
      {report.readings.length > 0 ? (
        <div className="mt-2 max-h-72 overflow-auto rounded border border-border/30">
          <table className="w-full min-w-[36rem] border-collapse text-left text-[0.7rem]">
            <thead className="sticky top-0 z-[1] bg-background/95 text-foreground/50">
              <tr>
                <th className="border-b border-border/40 px-2 py-1 font-semibold">
                  Timestamp (UTC)
                </th>
                <th className="border-b border-border/40 px-2 py-1 font-semibold">°C</th>
                <th className="border-b border-border/40 px-2 py-1 font-semibold">RH%</th>
                <th className="border-b border-border/40 px-2 py-1 font-semibold">LW min</th>
                <th className="border-b border-border/40 px-2 py-1 font-semibold">Rain mm</th>
                <th className="border-b border-border/40 px-2 py-1 font-semibold">Wind m/s</th>
                <th className="border-b border-border/40 px-2 py-1 font-semibold">Quality</th>
              </tr>
            </thead>
            <tbody>
              {report.readings.map((row, idx) => (
                <tr key={`${row.ts}-${idx}`} className="text-foreground/80">
                  <td className="border-b border-border/20 px-2 py-0.5 font-mono">{row.ts}</td>
                  <td className="border-b border-border/20 px-2 py-0.5">{dashNum(row.air_temp_c)}</td>
                  <td className="border-b border-border/20 px-2 py-0.5">{dashNum(row.rh_pct)}</td>
                  <td className="border-b border-border/20 px-2 py-0.5">
                    {dashNum(row.leaf_wetness_min)}
                  </td>
                  <td className="border-b border-border/20 px-2 py-0.5">{dashNum(row.precip_mm)}</td>
                  <td className="border-b border-border/20 px-2 py-0.5">{dashNum(row.wind_speed_ms)}</td>
                  <td className="border-b border-border/20 px-2 py-0.5">{row.quality_flag}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ) : (
        <p className="mt-2 text-foreground/55">
          No reading rows in this pull (vendor returned nothing new for that window).
        </p>
      )}
      <details className="mt-2">
        <summary className="cursor-pointer text-foreground/60 hover:text-foreground/90">
          Raw JSON (full server payload)
        </summary>
        <pre className="mt-2 max-h-56 overflow-auto whitespace-pre-wrap break-all rounded bg-foreground/10 p-2 font-mono text-[0.65rem] text-foreground/75">
          {JSON.stringify(report, null, 2)}
        </pre>
      </details>
    </div>
  );
}
