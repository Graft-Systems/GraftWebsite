/**
 * Integration detail (M1.5 PR-D).
 *
 * Lists the vendor's stations (live-fetched from the connector + cached
 * as SensorStation rows) with a per-station "Link to block" picker.
 */
"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import { useAuth } from "@clerk/nextjs";
import {
  getStationHealth,
  type StationHealth,
} from "@/lib/spraySetupStatus";

type Membership = { org: { id: string; name: string } };
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
  const { getToken, isSignedIn } = useAuth();

  const [orgId, setOrgId] = useState<string | null>(null);
  const [stations, setStations] = useState<Station[] | null>(null);
  const [blocks, setBlocks] = useState<{ id: string; label: string }[]>([]);
  const [error, setError] = useState<string | null>(null);

  async function authedFetch(path: string, init?: RequestInit) {
    const token = await getToken();
    return fetch(path, {
      ...init,
      headers: {
        ...(init?.headers ?? {}),
        Authorization: `Bearer ${token}`,
      },
    });
  }

  useEffect(() => {
    let cancelled = false;
    async function load() {
      if (!isSignedIn) return;
      try {
        const meRes = await authedFetch("/api/spray/orgs/me");
        const me = (await meRes.json()) as { memberships: Membership[] };
        const oid = me.memberships?.[0]?.org.id;
        if (!oid) throw new Error("no membership");
        if (cancelled) return;
        setOrgId(oid);

        const [sRes, vRes] = await Promise.all([
          authedFetch(
            `/api/spray/orgs/${oid}/integrations/${connId}/stations`,
          ),
          authedFetch(`/api/spray/orgs/${oid}/vineyards`),
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
                `/api/spray/orgs/${oid}/vineyards/${v.id}/blocks`,
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
  }, [isSignedIn, connId]);

  async function linkBlock(stationId: string, blockId: string) {
    if (!orgId) return;
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

  return (
    <div className="mx-auto max-w-4xl">
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
        stations lower confidence until they are fixed.
      </p>

      {error && (
        <p className="mt-6 rounded-md border border-red-500/50 bg-red-500/10 p-3 text-sm text-red-300">
          {error}
        </p>
      )}

      {stations === null && !error && (
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
            const linkedBlocks = s.linked_block_ids
              .map((id) => blocks.find((b) => b.id === id)?.label ?? id)
              .filter(Boolean);
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

                <div className="mt-4">
                  <p className="frame text-[0.65rem] uppercase tracking-wider text-foreground/50">
                    Linked blocks
                  </p>
                  {linkedBlocks.length > 0 ? (
                    <div className="mt-2 flex flex-wrap gap-2">
                      {linkedBlocks.map((label) => (
                        <span
                          key={label}
                          className="rounded border border-border/40 px-2 py-1 text-xs text-foreground/70"
                        >
                          {label}
                        </span>
                      ))}
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
