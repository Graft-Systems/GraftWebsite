"use client";

import { useCallback, useEffect, useState, type Dispatch, type SetStateAction } from "react";
import type { VineMapFeature, VinePlacementMode } from "@/components/spray/SprayMap";
import { formatSprayHttpError } from "@/lib/sprayApi";
import { pointInBlock } from "@/lib/vinePlacementUtils";

function parseVineFromApi(v: {
  id: string;
  block_id: string;
  row_index: number;
  vine_index: number;
  status: VineMapFeature["status"];
  location: GeoJSON.Point;
  label?: string;
}): VineMapFeature {
  return {
    id: v.id,
    block_id: v.block_id,
    row_index: v.row_index,
    vine_index: v.vine_index,
    status: v.status,
    location: [v.location.coordinates[0], v.location.coordinates[1]],
    label: v.label,
  };
}

export function useBlockVinePlacement({
  orgId,
  blockId,
  blockGeom,
  authedFetch,
  vines,
  onVinesChange,
  rowIndex,
  rowCount,
  onPlacementModeChange,
}: {
  orgId: string | null;
  blockId: string | null;
  blockGeom: GeoJSON.Polygon | GeoJSON.MultiPolygon | null;
  authedFetch: (path: string, init?: RequestInit) => Promise<Response>;
  vines: VineMapFeature[];
  onVinesChange: Dispatch<SetStateAction<VineMapFeature[]>>;
  rowIndex: string;
  rowCount: string;
  onPlacementModeChange: (mode: VinePlacementMode) => void;
}) {
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const loadVines = useCallback(async () => {
    if (!orgId || !blockId) return;
    const res = await authedFetch(`/api/spray/orgs/${orgId}/blocks/${blockId}/vines`);
    if (!res.ok) {
      setError(`Could not load vines (${res.status}).`);
      return;
    }
    const list = (await res.json()) as Parameters<typeof parseVineFromApi>[0][];
    onVinesChange(list.map(parseVineFromApi));
  }, [authedFetch, blockId, onVinesChange, orgId]);

  useEffect(() => {
    if (blockId) {
      void loadVines();
    }
  }, [blockId, loadVines]);

  const placeSingleVine = useCallback(
    async (lngLat: [number, number]) => {
      if (!orgId || !blockId || !blockGeom) return;
      if (!pointInBlock(lngLat, blockGeom)) {
        setError("Click inside the block footprint.");
        return;
      }
      const row = parseInt(rowIndex, 10);
      if (!Number.isFinite(row) || row < 1) {
        setError("Enter a valid row number (1 or greater).");
        return;
      }
      const tempId = `temp-${crypto.randomUUID()}`;
      onVinesChange((prev) => {
        const optimistic: VineMapFeature = {
          id: tempId,
          block_id: blockId,
          row_index: row,
          vine_index: prev.filter((v) => v.row_index === row).length + 1,
          status: "ok",
          location: lngLat,
        };
        return [...prev, optimistic];
      });
      setBusy(true);
      setError(null);
      try {
        const res = await authedFetch(`/api/spray/orgs/${orgId}/blocks/${blockId}/vines`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            row_index: row,
            location: { type: "Point", coordinates: lngLat },
          }),
        });
        if (!res.ok) {
          onVinesChange((prev) => prev.filter((v) => v.id !== tempId));
          setError(await formatSprayHttpError(res));
          return;
        }
        await loadVines();
      } catch {
        onVinesChange((prev) => prev.filter((v) => v.id !== tempId));
        setError("Could not save vine.");
      } finally {
        setBusy(false);
      }
    },
    [authedFetch, blockGeom, blockId, loadVines, onVinesChange, orgId, rowIndex],
  );

  const placeRowCommit = useCallback(
    async (segment: { start: [number, number]; end: [number, number] }) => {
      if (!orgId || !blockId || !blockGeom) return;
      const row = parseInt(rowIndex, 10);
      const count = parseInt(rowCount, 10);
      if (!Number.isFinite(row) || row < 1) {
        setError("Enter a valid row number.");
        return;
      }
      if (!Number.isFinite(count) || count < 2 || count > 250) {
        setError("Vine count must be between 2 and 250.");
        return;
      }
      if (!pointInBlock(segment.start, blockGeom) || !pointInBlock(segment.end, blockGeom)) {
        setError("Row must stay inside the block footprint.");
        return;
      }
      setBusy(true);
      setError(null);
      try {
        const res = await authedFetch(
          `/api/spray/orgs/${orgId}/blocks/${blockId}/vines/row`,
          {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              row_index: row,
              start: segment.start,
              end: segment.end,
              count,
              replace_row: true,
            }),
          },
        );
        if (!res.ok) {
          setError(await formatSprayHttpError(res));
          return;
        }
        onPlacementModeChange(null);
        await loadVines();
      } finally {
        setBusy(false);
      }
    },
    [
      authedFetch,
      blockGeom,
      blockId,
      loadVines,
      onPlacementModeChange,
      orgId,
      rowCount,
      rowIndex,
    ],
  );

  const updateVineStatus = useCallback(
    async (vineId: string, status: VineMapFeature["status"]) => {
      if (!orgId) return;
      setError(null);
      try {
        const res = await authedFetch(`/api/spray/orgs/${orgId}/vines/${vineId}`, {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ status }),
        });
        if (!res.ok) {
          setError(await formatSprayHttpError(res));
          return;
        }
        await loadVines();
      } catch {
        setError("Could not update vine status.");
      }
    },
    [authedFetch, loadVines, orgId],
  );

  const deleteVine = useCallback(
    async (vineId: string, onSelectVine: (id: string | null) => void) => {
      if (!orgId) return;
      if (!confirm("Remove this vine from the map?")) return;
      setError(null);
      try {
        const res = await authedFetch(`/api/spray/orgs/${orgId}/vines/${vineId}`, {
          method: "DELETE",
        });
        if (!res.ok) {
          setError(await formatSprayHttpError(res));
          return;
        }
        onSelectVine(null);
        await loadVines();
      } catch {
        setError("Could not remove vine.");
      }
    },
    [authedFetch, loadVines, orgId],
  );

  const clearRow = useCallback(
    async (row: number, onSelectVine: (id: string | null) => void) => {
      if (!orgId) return;
      const rowVines = vines.filter((v) => v.row_index === row);
      if (rowVines.length === 0) return;
      if (!confirm(`Remove all ${rowVines.length} vines on row ${row}?`)) return;
      setError(null);
      try {
        await Promise.all(
          rowVines.map((v) =>
            authedFetch(`/api/spray/orgs/${orgId}/vines/${v.id}`, { method: "DELETE" }),
          ),
        );
        onSelectVine(null);
        await loadVines();
      } catch {
        setError("Could not clear row.");
      }
    },
    [authedFetch, loadVines, orgId, vines],
  );

  return {
    busy,
    error,
    setError,
    loadVines,
    placeSingleVine,
    placeRowCommit,
    updateVineStatus,
    deleteVine,
    clearRow,
  };
}
