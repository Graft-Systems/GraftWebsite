"use client";

import { useCallback, useRef, useState } from "react";
import { cn } from "@/lib/utils";

export type GeocodeHit = { lat: number; lon: number; label: string };

type SprayMapAddressSearchProps = {
  onFlyTo: (lng: number, lat: number) => void;
  className?: string;
};

export function SprayMapAddressSearch({ onFlyTo, className }: SprayMapAddressSearchProps) {
  const [searchQ, setSearchQ] = useState("");
  const [searchBusy, setSearchBusy] = useState(false);
  const [searchHits, setSearchHits] = useState<GeocodeHit[]>([]);
  const [searchErr, setSearchErr] = useState<string | null>(null);
  const searchAbortRef = useRef<AbortController | null>(null);

  const runAddressSearch = useCallback(async () => {
    const q = searchQ.trim();
    if (q.length < 2) return;
    searchAbortRef.current?.abort();
    const ac = new AbortController();
    searchAbortRef.current = ac;
    setSearchBusy(true);
    setSearchErr(null);
    setSearchHits([]);
    try {
      const res = await fetch(`/api/geocode?q=${encodeURIComponent(q)}`, {
        signal: ac.signal,
      });
      if (!res.ok) {
        setSearchErr(
          res.status === 429 ? "Too many searches — wait a moment." : "Search failed.",
        );
        return;
      }
      const data = (await res.json()) as { results?: GeocodeHit[] };
      setSearchHits(data.results ?? []);
      if (!data.results?.length) {
        setSearchErr("No results — try a fuller street address.");
      }
    } catch (e) {
      if ((e as Error).name === "AbortError") return;
      setSearchErr("Search failed.");
    } finally {
      setSearchBusy(false);
    }
  }, [searchQ]);

  const selectHit = useCallback(
    (hit: GeocodeHit) => {
      setSearchHits([]);
      setSearchErr(null);
      onFlyTo(hit.lon, hit.lat);
    },
    [onFlyTo],
  );

  return (
    <div className={cn("w-full", className)}>
      <label className="block text-[10px] font-semibold uppercase tracking-wide text-foreground/55">
        Find address
      </label>
      <div className="mt-1 flex gap-2">
        <input
          type="search"
          value={searchQ}
          onChange={(e) => setSearchQ(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter") void runAddressSearch();
          }}
          placeholder="Street, city, ZIP…"
          className="min-h-9 min-w-0 flex-1 rounded-md border border-border/50 bg-background/90 px-3 text-sm text-foreground placeholder:text-foreground/35"
          autoComplete="street-address"
        />
        <button
          type="button"
          onClick={() => void runAddressSearch()}
          disabled={searchBusy || searchQ.trim().length < 2}
          className="shrink-0 rounded-md bg-amber px-4 py-2 text-xs font-semibold text-background transition-colors hover:bg-amber/90 disabled:opacity-40"
        >
          {searchBusy ? "…" : "Go"}
        </button>
      </div>
      {searchErr && <p className="mt-1.5 text-xs text-amber">{searchErr}</p>}
      {searchHits.length > 0 && (
        <ul className="mt-2 max-h-40 overflow-auto rounded-md border border-border/40 bg-background/95 text-xs">
          {searchHits.map((h, i) => (
            <li key={`${h.lat},${h.lon},${i}`} className="border-b border-border/30 last:border-b-0">
              <button
                type="button"
                className="w-full px-3 py-2 text-left text-foreground/85 hover:bg-amber/15"
                onClick={() => selectHit(h)}
              >
                {h.label}
              </button>
            </li>
          ))}
        </ul>
      )}
      <p className="mt-1.5 text-[10px] leading-snug text-foreground/40">
        Results from OpenStreetMap Nominatim — use sparingly (rate limits apply).
      </p>
    </div>
  );
}
