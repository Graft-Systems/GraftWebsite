/**
 * WeatherLocationDialog
 *
 * Allows setting the location for the organization's virtual (gridded)
 * weather station (Visual Crossing). Includes address search via Nominatim.
 */
"use client";

import { useState, useCallback, useRef } from "react";
import { Search, MapPin, Loader2 } from "lucide-react";

export type GeocodeResult = {
  lat: number;
  lon: number;
  label: string;
};

export function WeatherLocationDialog({
  initialValues,
  onSubmit,
  onClose,
}: {
  initialValues?: { name: string; lat: number; lon: number };
  onSubmit: (values: { name: string; lat: number; lon: number }) => Promise<void>;
  onClose: () => void;
}) {
  const [name, setName] = useState(initialValues?.name ?? "");
  const [lat, setLat] = useState(initialValues?.lat?.toString() ?? "");
  const [lon, setLon] = useState(initialValues?.lon?.toString() ?? "");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Search state
  const [searchQ, setSearchQ] = useState("");
  const [searchBusy, setSearchBusy] = useState(false);
  const [searchHits, setSearchHits] = useState<GeocodeResult[]>([]);
  const [searchErr, setSearchErr] = useState<string | null>(null);
  const searchAbortRef = useRef<AbortController | null>(null);

  const isValid =
    name.trim().length > 0 &&
    !isNaN(parseFloat(lat)) &&
    !isNaN(parseFloat(lon));

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
          res.status === 429 ? "Too many searches — wait a moment." : "Search failed."
        );
        return;
      }
      const data = (await res.json()) as { results: GeocodeResult[] };
      setSearchHits(data.results ?? []);
      if (data.results?.length === 0) {
        setSearchErr("No results found.");
      }
    } catch (e) {
      if (e instanceof Error && e.name === "AbortError") return;
      setSearchErr("Search failed.");
    } finally {
      setSearchBusy(false);
    }
  }, [searchQ]);

  const selectHit = (hit: GeocodeResult) => {
    setLat(hit.lat.toFixed(6));
    setLon(hit.lon.toFixed(6));
    if (!name) {
      // Extract the first part of the label as a suggested name
      const suggestedName = hit.label.split(",")[0].trim();
      setName(suggestedName);
    }
    setSearchHits([]);
    setSearchQ("");
  };

  async function handleSubmit() {
    setBusy(true);
    setError(null);
    try {
      await onSubmit({
        name,
        lat: parseFloat(lat),
        lon: parseFloat(lon),
      });
    } catch (e) {
      setError(e instanceof Error ? e.message : "submit failed");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div
      role="dialog"
      aria-modal="true"
      onClick={onClose}
      className="fixed inset-0 z-50 flex items-center justify-center bg-background/80 p-4"
    >
      <div
        onClick={(e) => e.stopPropagation()}
        className="w-full max-w-md rounded-md border border-border/40 bg-background p-6 shadow-xl"
      >
        <h2 className="font-display text-xl">Weather Feed Location</h2>
        <p className="mt-2 text-sm text-foreground/60">
          Set the coordinates for your virtual weather station. We use Visual
          Crossing for gridded weather data at this location.
        </p>

        {/* Address Search */}
        <div className="mt-6">
          <label className="frame block text-[0.65rem] font-semibold uppercase tracking-wider text-foreground/60">
            Search for a location
          </label>
          <div className="relative mt-1">
            <input
              type="text"
              placeholder="e.g. Napa, CA"
              value={searchQ}
              onChange={(e) => setSearchQ(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter") {
                  e.preventDefault();
                  void runAddressSearch();
                }
              }}
              className="w-full rounded-md border border-border/40 bg-background/60 pl-9 pr-12 py-2 text-sm"
              autoComplete="off"
            />
            <Search className="absolute left-3 top-2.5 h-4 w-4 text-foreground/40" />
            <button
              type="button"
              onClick={() => void runAddressSearch()}
              disabled={searchBusy || searchQ.trim().length < 2}
              className="absolute right-2 top-1.5 rounded bg-foreground/10 px-2 py-1 text-[0.65rem] font-bold uppercase transition-colors hover:bg-foreground/20 disabled:opacity-30"
            >
              {searchBusy ? <Loader2 className="h-3 w-3 animate-spin" /> : "Find"}
            </button>
          </div>
          {searchErr && <p className="mt-1 text-xs text-amber">{searchErr}</p>}
          
          {searchHits.length > 0 && (
            <ul className="mt-2 max-h-40 overflow-y-auto rounded-md border border-border/40 bg-background shadow-inner">
              {searchHits.map((h, i) => (
                <li key={i}>
                  <button
                    type="button"
                    onClick={() => selectHit(h)}
                    className="flex w-full items-start gap-2 border-b border-border/10 px-3 py-2 text-left text-xs transition-colors hover:bg-foreground/5"
                  >
                    <MapPin className="mt-0.5 h-3 w-3 shrink-0 text-foreground/40" />
                    <span className="line-clamp-2">{h.label}</span>
                  </button>
                </li>
              ))}
            </ul>
          )}
        </div>

        <div className="my-6 flex items-center gap-4">
          <div className="h-px flex-1 bg-border/20" />
          <span className="text-[0.65rem] font-bold uppercase tracking-widest text-foreground/30">or enter manually</span>
          <div className="h-px flex-1 bg-border/20" />
        </div>

        <div className="space-y-4">
          <div>
            <label
              htmlFor="loc-name"
              className="frame block text-[0.65rem] font-semibold uppercase tracking-wider text-foreground/60"
            >
              Location Name
            </label>
            <input
              id="loc-name"
              type="text"
              placeholder="Main Vineyard"
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="mt-1 w-full rounded-md border border-border/40 bg-background/60 px-3 py-2 text-sm"
              autoComplete="off"
            />
          </div>
          <div className="flex gap-3">
            <div className="flex-1">
              <label
                htmlFor="loc-lat"
                className="frame block text-[0.65rem] font-semibold uppercase tracking-wider text-foreground/60"
              >
                Latitude
              </label>
              <input
                id="loc-lat"
                type="text"
                placeholder="38.4"
                value={lat}
                onChange={(e) => setLat(e.target.value)}
                className="mt-1 w-full rounded-md border border-border/40 bg-background/60 px-3 py-2 font-mono text-sm"
                autoComplete="off"
              />
            </div>
            <div className="flex-1">
              <label
                htmlFor="loc-lon"
                className="frame block text-[0.65rem] font-semibold uppercase tracking-wider text-foreground/60"
              >
                Longitude
              </label>
              <input
                id="loc-lon"
                type="text"
                placeholder="-122.3"
                value={lon}
                onChange={(e) => setLon(e.target.value)}
                className="mt-1 w-full rounded-md border border-border/40 bg-background/60 px-3 py-2 font-mono text-sm"
                autoComplete="off"
              />
            </div>
          </div>
        </div>

        {error && (
          <p className="mt-4 rounded-md border border-red-500/40 bg-red-500/10 p-2 text-sm text-red-300">
            {error}
          </p>
        )}

        <div className="mt-8 flex justify-end gap-3">
          <button
            type="button"
            onClick={onClose}
            disabled={busy}
            className="frame text-xs font-semibold uppercase tracking-wider text-foreground/60 hover:text-foreground/80"
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={handleSubmit}
            disabled={!isValid || busy}
            className="rounded-md bg-amber px-4 py-2 frame text-xs font-semibold text-background transition-colors hover:bg-amber/90 disabled:opacity-40 shadow-sm"
          >
            {busy ? "Saving…" : "Save Location"}
          </button>
        </div>
      </div>
    </div>
  );
}
