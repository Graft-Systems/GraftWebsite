"use client";

import { useEffect, type Dispatch, type SetStateAction } from "react";
import type { VineMapFeature, VinePlacementMode } from "@/components/spray/SprayMap";

export function BlockVinePanel({
  placementMode,
  onPlacementModeChange,
  rowIndex,
  onRowIndexChange,
  rowCount,
  onRowCountChange,
  nodeScale,
  onNodeScaleChange,
  busy,
  error,
  setError,
  blockId,
}: {
  placementMode: VinePlacementMode;
  onPlacementModeChange: (mode: VinePlacementMode) => void;
  rowIndex: string;
  onRowIndexChange: (v: string) => void;
  rowCount: string;
  onRowCountChange: (v: string) => void;
  nodeScale: number;
  onNodeScaleChange: (v: number) => void;
  busy: boolean;
  error: string | null;
  setError: (msg: string | null) => void;
  blockId: string;
}) {
  useEffect(() => {
    setError(null);
  }, [blockId, setError]);

  return (
    <div className="flex flex-wrap items-center gap-4">
      {error && (
        <span className="rounded-md border border-red-500/40 bg-red-500/10 px-2 py-1 text-xs text-red-300">
          {error}
        </span>
      )}

      <div className="flex items-center gap-2">
        <label className="text-[0.65rem] font-bold uppercase tracking-wider text-foreground/60">
          Row
        </label>
        <input
          type="number"
          min={1}
          value={rowIndex}
          onChange={(e) => onRowIndexChange(e.target.value)}
          className="w-14 rounded-md border border-border/40 bg-background/60 px-2 py-1 text-sm font-semibold"
        />
      </div>

      <div className="flex items-center gap-2">
        <label className="text-[0.65rem] font-bold uppercase tracking-wider text-foreground/60">
          Vines
        </label>
        <input
          type="number"
          min={2}
          max={250}
          value={rowCount}
          onChange={(e) => onRowCountChange(e.target.value)}
          className="w-16 rounded-md border border-border/40 bg-background/60 px-2 py-1 text-sm font-semibold"
        />
      </div>

      <div className="flex items-center gap-2">
        <label className="text-[0.65rem] font-bold uppercase tracking-wider text-foreground/60">
          Scale
        </label>
        <input
          type="range"
          min={0.5}
          max={3.0}
          step={0.05}
          value={nodeScale}
          onChange={(e) => onNodeScaleChange(parseFloat(e.target.value))}
          className="w-20"
        />
      </div>

      <div className="h-6 w-px bg-border/40" />

      <div className="flex gap-2">
        <button
          type="button"
          disabled={busy}
          onClick={() =>
            onPlacementModeChange(placementMode === "single" ? null : "single")
          }
          className={`rounded-md px-3 py-1.5 frame text-xs font-semibold transition-colors ${
            placementMode === "single"
              ? "bg-amber text-background"
              : "border border-border/50 text-foreground/80 hover:border-amber/50 hover:text-foreground"
          }`}
        >
          {placementMode === "single" ? "Cancel" : "Add vine"}
        </button>
        <button
          type="button"
          disabled={busy}
          onClick={() => onPlacementModeChange(placementMode === "row" ? null : "row")}
          className={`rounded-md px-3 py-1.5 frame text-xs font-semibold transition-colors ${
            placementMode === "row"
              ? "bg-amber text-background"
              : "border border-border/50 text-foreground/80 hover:border-amber/50 hover:text-foreground"
          }`}
        >
          {placementMode === "row" ? "Cancel row" : "Add row"}
        </button>
      </div>
    </div>
  );
}
