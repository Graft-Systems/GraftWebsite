/**
 * Captures index page (M1-09 step 10).
 *
 * Lists every capture across the user's vineyards. Filterable by
 * block. Click a thumbnail to open the full image in a modal.
 *
 * M1-10 will add severity badges + filter-by-disease-class.
 */
"use client";

import { useEffect, useState } from "react";
import { useAuth } from "@clerk/nextjs";

type Capture = {
  id: string;
  block_id: string;
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
  const { getToken, isSignedIn } = useAuth();
  const [orgId, setOrgId] = useState<string | null>(null);
  const [blocks, setBlocks] = useState<Block[]>([]);
  const [filterBlock, setFilterBlock] = useState<string>("");
  const [captures, setCaptures] = useState<Capture[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [openCapture, setOpenCapture] = useState<Capture | null>(null);

  async function authedFetch(path: string) {
    const token = await getToken();
    return fetch(path, { headers: { Authorization: `Bearer ${token}` } });
  }

  useEffect(() => {
    let cancelled = false;
    async function load() {
      if (!isSignedIn) return;
      try {
        const meRes = await authedFetch("/api/spray/orgs/me");
        if (!meRes.ok) throw new Error("orgs/me");
        const me = (await meRes.json()) as {
          memberships: { org: { id: string } }[];
        };
        const oid = me.memberships?.[0]?.org.id;
        if (!oid) throw new Error("no org");
        if (cancelled) return;
        setOrgId(oid);

        // Pull all vineyards then their blocks for the filter dropdown.
        const vRes = await authedFetch(`/api/spray/orgs/${oid}/vineyards`);
        if (!vRes.ok) throw new Error("vineyards");
        const vineyards = (await vRes.json()) as { id: string }[];
        const blockLists = await Promise.all(
          vineyards.map((v) =>
            authedFetch(
              `/api/spray/orgs/${oid}/vineyards/${v.id}/blocks`
            ).then((r) => (r.ok ? r.json() : []))
          )
        );
        if (cancelled) return;
        setBlocks(blockLists.flat());
      } catch (e) {
        if (!cancelled) setError(e instanceof Error ? e.message : "load failed");
      }
    }
    load();
    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isSignedIn]);

  useEffect(() => {
    let cancelled = false;
    async function loadCaptures() {
      if (!orgId) return;
      const params = new URLSearchParams();
      if (filterBlock) params.set("block_id", filterBlock);
      const res = await authedFetch(
        `/api/spray/orgs/${orgId}/captures?${params}`
      );
      if (!res.ok) {
        setError(`captures fetch failed (${res.status})`);
        return;
      }
      const list = (await res.json()) as Capture[];
      if (!cancelled) setCaptures(list);
    }
    loadCaptures();
    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [orgId, filterBlock]);

  return (
    <div className="mx-auto max-w-6xl">
      <header className="flex items-baseline justify-between">
        <h1 className="font-display text-3xl">Captures</h1>
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
      </header>

      {error && (
        <p className="mt-6 rounded-md border border-red-500/50 bg-red-500/10 p-3 text-sm text-red-300">
          {error}
        </p>
      )}

      {captures === null && !error && (
        <p className="mt-12 text-foreground/50">Loading...</p>
      )}

      {captures && captures.length === 0 && (
        <div className="mt-12 rounded-md border border-dashed border-border/40 p-12 text-center text-foreground/70">
          No captures yet. Open a vineyard, select a block, and upload a photo.
        </div>
      )}

      {captures && captures.length > 0 && (
        <ul className="mt-10 grid gap-3 grid-cols-2 md:grid-cols-3 lg:grid-cols-4">
          {captures.map((c) => (
            <li
              key={c.id}
              onClick={() => c.download_url && setOpenCapture(c)}
              className="aspect-square cursor-pointer overflow-hidden rounded-md border border-border/40 bg-background/40"
            >
              {c.download_url ? (
                /* eslint-disable-next-line @next/next/no-img-element */
                <img
                  src={c.download_url}
                  alt={`Capture ${c.id}`}
                  className="h-full w-full object-cover transition-transform hover:scale-105"
                />
              ) : (
                <div className="flex h-full items-center justify-center text-xs text-foreground/40">
                  {c.status}
                </div>
              )}
            </li>
          ))}
        </ul>
      )}

      {openCapture && openCapture.download_url && (
        <div
          role="dialog"
          aria-modal="true"
          onClick={() => setOpenCapture(null)}
          className="fixed inset-0 z-50 flex items-center justify-center bg-background/80 p-6 backdrop-blur"
        >
          <div onClick={(e) => e.stopPropagation()} className="max-h-full max-w-5xl">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={openCapture.download_url}
              alt={`Capture ${openCapture.id}`}
              className="max-h-[85vh] w-auto rounded-md"
            />
            <p className="mt-3 text-center text-xs text-foreground/50">
              {openCapture.kind} · {openCapture.size_bytes ?? "?"} bytes ·{" "}
              {openCapture.uploaded_at?.slice(0, 19) ?? ""}
            </p>
          </div>
        </div>
      )}
    </div>
  );
}
