/**
 * Captures index page (M1-09 step 10).
 *
 * Lists captures across the org with block, date, and kind filters.
 */
"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { useActiveOrg } from "@/lib/sprayApi";

type Capture = {
  id: string;
  block_id: string;
  block_name?: string;
  vineyard_name?: string;
  kind: string;
  size_bytes: number | null;
  taken_at: string | null;
  uploaded_at: string | null;
  status: string;
  download_url: string | null;
  created_at: string;
};

type Block = { id: string; name: string };

export default function CapturesPage() {
  const { org, loading: orgLoading, authedFetch } = useActiveOrg();
  const [blocks, setBlocks] = useState<Block[]>([]);
  const [filterBlock, setFilterBlock] = useState("");
  const [dateFrom, setDateFrom] = useState("");
  const [dateTo, setDateTo] = useState("");
  const [kind, setKind] = useState("");
  const [captures, setCaptures] = useState<Capture[] | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!org) return;
    const orgId = org.id;
    let cancelled = false;
    async function loadBlocks() {
      try {
        const vRes = await authedFetch(`/api/spray/orgs/${orgId}/vineyards`);
        if (!vRes.ok) throw new Error("vineyards");
        const vineyards = (await vRes.json()) as { id: string }[];
        const blockLists = await Promise.all(
          vineyards.map((v) =>
            authedFetch(`/api/spray/orgs/${orgId}/vineyards/${v.id}/blocks`).then(
              (r) => (r.ok ? r.json() : []),
            ),
          ),
        );
        if (!cancelled) setBlocks(blockLists.flat() as Block[]);
      } catch (e) {
        if (!cancelled) setError(e instanceof Error ? e.message : "load failed");
      }
    }
    void loadBlocks();
    return () => {
      cancelled = true;
    };
  }, [authedFetch, org]);

  useEffect(() => {
    if (!org) return;
    const orgId = org.id;
    let cancelled = false;
    async function loadCaptures() {
      const params = new URLSearchParams();
      if (filterBlock) params.set("block_id", filterBlock);
      if (dateFrom) params.set("date_from", dateFrom);
      if (dateTo) params.set("date_to", dateTo);
      if (kind) params.set("kind", kind);
      const qs = params.toString();
      const res = await authedFetch(
        `/api/spray/orgs/${orgId}/captures${qs ? `?${qs}` : ""}`,
      );
      if (!res.ok) {
        if (!cancelled) setError(`captures fetch failed (${res.status})`);
        return;
      }
      const list = (await res.json()) as Capture[];
      if (!cancelled) {
        setCaptures(list);
        setError(null);
      }
    }
    void loadCaptures();
    return () => {
      cancelled = true;
    };
  }, [authedFetch, org, filterBlock, dateFrom, dateTo, kind]);

  return (
    <div className="mx-auto max-w-6xl pb-24 md:pb-0">
      <header className="flex flex-wrap items-end justify-between gap-4">
        <h1 className="font-display text-3xl">Captures</h1>
        <div className="flex flex-wrap items-end gap-3">
          <label className="block text-xs text-foreground/60">
            <span className="mb-1 block">Block</span>
            <select
              value={filterBlock}
              onChange={(e) => setFilterBlock(e.target.value)}
              className="rounded-md border border-border/60 bg-background/40 px-3 py-2 text-sm"
            >
              <option value="">All blocks</option>
              {blocks.map((b) => (
                <option key={b.id} value={b.id}>
                  {b.name}
                </option>
              ))}
            </select>
          </label>
          <label className="block text-xs text-foreground/60">
            <span className="mb-1 block">From</span>
            <input
              type="date"
              value={dateFrom}
              onChange={(e) => setDateFrom(e.target.value)}
              className="rounded-md border border-border/60 bg-background/40 px-3 py-2 text-sm"
            />
          </label>
          <label className="block text-xs text-foreground/60">
            <span className="mb-1 block">To</span>
            <input
              type="date"
              value={dateTo}
              onChange={(e) => setDateTo(e.target.value)}
              className="rounded-md border border-border/60 bg-background/40 px-3 py-2 text-sm"
            />
          </label>
          <label className="block text-xs text-foreground/60">
            <span className="mb-1 block">Kind</span>
            <select
              value={kind}
              onChange={(e) => setKind(e.target.value)}
              className="rounded-md border border-border/60 bg-background/40 px-3 py-2 text-sm"
            >
              <option value="">All</option>
              <option value="photo">Photo</option>
              <option value="video">Video</option>
            </select>
          </label>
        </div>
      </header>

      <p className="mt-4 text-sm text-foreground/55">
        ML severity and disease labels ship when the inference API is wired — filters
        today follow upload metadata only.
      </p>

      {error && (
        <p className="mt-6 rounded-md border border-red-500/50 bg-red-500/10 p-3 text-sm text-red-300">
          {error}
        </p>
      )}

      {!org && !orgLoading && (
        <p className="mt-8 text-sm text-foreground/60">Sign in to view captures.</p>
      )}

      {captures === null && org && !error && (
        <p className="mt-12 text-foreground/50">Loading...</p>
      )}

      {captures && captures.length === 0 && (
        <div className="mt-12 rounded-md border border-dashed border-border/40 p-12 text-center text-foreground/70">
          No captures yet. Open a vineyard, select a block, and upload a photo.
        </div>
      )}

      {captures && captures.length > 0 && (
        <ul className="mt-10 grid grid-cols-2 gap-3 md:grid-cols-3 lg:grid-cols-4">
          {captures.map((c) => (
            <li key={c.id}>
              <Link
                href={`/spray/captures/${c.id}`}
                className="block overflow-hidden rounded-md border border-border/40 bg-background/40 transition-colors hover:border-amber/50"
              >
                <div className="aspect-square">
                  {c.download_url ? (
                    /* eslint-disable-next-line @next/next/no-img-element */
                    <img
                      src={c.download_url}
                      alt=""
                      className="h-full w-full object-cover transition-transform hover:scale-105"
                    />
                  ) : (
                    <div className="flex h-full items-center justify-center text-xs text-foreground/40">
                      {c.status}
                    </div>
                  )}
                </div>
                <p className="frame truncate px-2 py-1 text-[0.65rem] text-foreground/50">
                  {c.vineyard_name && c.block_name
                    ? `${c.vineyard_name} · ${c.block_name}`
                    : c.block_id.slice(0, 8)}
                </p>
              </Link>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
