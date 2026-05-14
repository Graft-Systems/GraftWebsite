/**
 * SprayMap — MapLibre GL satellite map with NATIVE polygon draw (M0-05).
 *
 * Rendered inside `apps/web/app/spray/(app)/vineyards/[vineyard_id]/`.
 * Uses Esri World Imagery as the basemap (free with attribution).
 *
 * Block geoms render as a single GeoJSON source with two layers (fill
 * + stroke). Drawing is a hand-rolled click-to-add-vertex /
 * double-click-to-close interaction wired straight to MapLibre events
 * — no external draw library, no Mapbox-vs-MapLibre compat layer.
 */
"use client";

import { useEffect, useRef, useState } from "react";
import maplibregl, { Map as MaplibreMap } from "maplibre-gl";
import "maplibre-gl/dist/maplibre-gl.css";

export type BlockFeature = {
  id: string;
  name: string;
  geom: GeoJSON.Polygon;
  archived: boolean;
};

export type SprayMapProps = {
  centroid: [number, number] | null;
  blocks: BlockFeature[];
  selectedBlockId: string | null;
  editable: boolean;
  onBlockSelect: (blockId: string | null) => void;
  onBlockCreate: (geom: GeoJSON.Polygon) => void;
  onBlockUpdate: (blockId: string, geom: GeoJSON.Polygon) => void;
  className?: string;
};

const NAPA_CENTROID: [number, number] = [-122.31, 38.3];
const ESRI_WORLD_IMAGERY_TILE =
  "https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}";

const ESRI_STYLE: maplibregl.StyleSpecification = {
  version: 8,
  sources: {
    "esri-imagery": {
      type: "raster",
      tiles: [ESRI_WORLD_IMAGERY_TILE],
      tileSize: 256,
      attribution:
        'Tiles &copy; Esri &mdash; Source: Esri, i-cubed, USDA, USGS, AEX, GeoEye, Getmapping, Aerogrid, IGN, IGP, UPR-EGP, and the GIS User Community',
    },
  },
  layers: [
    { id: "esri-imagery", type: "raster", source: "esri-imagery", minzoom: 0, maxzoom: 19 },
  ],
};

const BLOCK_FILL_COLOR = "#c08a3e";
const DRAW_FILL_COLOR = "#c08a3e";
const DRAW_STROKE_COLOR = "#ffffff";

function blocksToFeatureCollection(
  blocks: BlockFeature[]
): GeoJSON.FeatureCollection<GeoJSON.Polygon> {
  return {
    type: "FeatureCollection",
    features: blocks
      .filter((b) => !b.archived)
      .map((b) => ({
        type: "Feature",
        id: b.id,
        geometry: b.geom,
        properties: { name: b.name },
      })),
  };
}

function vertsToDrawFeatureCollection(
  verts: [number, number][]
): GeoJSON.FeatureCollection {
  // While drawing, render two layers:
  //   - a LineString through the live vertices (so the user sees the
  //     polygon perimeter forming click-by-click)
  //   - a Point per vertex
  const features: GeoJSON.Feature[] = [];
  if (verts.length >= 2) {
    features.push({
      type: "Feature",
      properties: { kind: "edge" },
      geometry: { type: "LineString", coordinates: verts },
    });
  }
  for (const v of verts) {
    features.push({
      type: "Feature",
      properties: { kind: "vertex" },
      geometry: { type: "Point", coordinates: v },
    });
  }
  return { type: "FeatureCollection", features };
}

function vertsToPolygon(verts: [number, number][]): GeoJSON.Polygon | null {
  // Need at least 3 unique vertices to close into a polygon.
  if (verts.length < 3) return null;
  const ring = [...verts, verts[0]] as GeoJSON.Position[];
  return { type: "Polygon", coordinates: [ring] };
}

export function SprayMap({
  centroid,
  blocks,
  selectedBlockId,
  editable,
  onBlockSelect,
  onBlockCreate,
  onBlockUpdate,
  className,
}: SprayMapProps) {
  const containerRef = useRef<HTMLDivElement | null>(null);
  const mapRef = useRef<MaplibreMap | null>(null);
  const [ready, setReady] = useState(false);
  const [drawingVerts, setDrawingVerts] = useState<[number, number][]>([]);
  const drawingVertsRef = useRef<[number, number][]>([]);

  // Mount + unmount the map exactly once.
  useEffect(() => {
    if (!containerRef.current) return;
    const initialCenter = centroid ?? NAPA_CENTROID;

    const map = new maplibregl.Map({
      container: containerRef.current,
      style: ESRI_STYLE,
      center: initialCenter,
      zoom: 14,
      attributionControl: { compact: true },
      doubleClickZoom: false, // we want double-click to close polygons
    });

    map.on("load", () => {
      // Saved blocks.
      map.addSource("blocks", { type: "geojson", data: blocksToFeatureCollection([]) });
      map.addLayer({
        id: "blocks-fill",
        type: "fill",
        source: "blocks",
        paint: { "fill-color": BLOCK_FILL_COLOR, "fill-opacity": 0.35 },
      });
      map.addLayer({
        id: "blocks-stroke",
        type: "line",
        source: "blocks",
        paint: { "line-color": DRAW_STROKE_COLOR, "line-width": 3 },
      });

      // Polygon being drawn right now.
      map.addSource("drawing", {
        type: "geojson",
        data: { type: "FeatureCollection", features: [] },
      });
      map.addLayer({
        id: "drawing-edge",
        type: "line",
        source: "drawing",
        filter: ["==", ["get", "kind"], "edge"],
        paint: { "line-color": DRAW_FILL_COLOR, "line-width": 2 },
      });
      map.addLayer({
        id: "drawing-vertex-halo",
        type: "circle",
        source: "drawing",
        filter: ["==", ["get", "kind"], "vertex"],
        paint: { "circle-radius": 10, "circle-color": "#ffffff" },
      });
      map.addLayer({
        id: "drawing-vertex",
        type: "circle",
        source: "drawing",
        filter: ["==", ["get", "kind"], "vertex"],
        paint: { "circle-radius": 6, "circle-color": DRAW_FILL_COLOR },
      });

      setReady(true);
    });

    // Click-to-select existing block.
    map.on("click", "blocks-fill", (e) => {
      if (drawingVertsRef.current.length > 0) return; // mid-draw, ignore
      const f = e.features?.[0];
      if (f && f.id != null) onBlockSelect(String(f.id));
    });

    mapRef.current = map;

    return () => {
      map.remove();
      mapRef.current = null;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Refresh saved-blocks layer.
  useEffect(() => {
    if (!ready || !mapRef.current) return;
    const src = mapRef.current.getSource("blocks") as
      | maplibregl.GeoJSONSource
      | undefined;
    if (src) src.setData(blocksToFeatureCollection(blocks));
  }, [blocks, ready]);

  // Recenter when centroid arrives.
  useEffect(() => {
    if (!ready || !mapRef.current || !centroid) return;
    mapRef.current.flyTo({ center: centroid, zoom: 14, duration: 0 });
  }, [centroid, ready]);

  // Refresh drawing-in-progress layer when verts change.
  useEffect(() => {
    drawingVertsRef.current = drawingVerts;
    if (!ready || !mapRef.current) return;
    const src = mapRef.current.getSource("drawing") as
      | maplibregl.GeoJSONSource
      | undefined;
    if (src) src.setData(vertsToDrawFeatureCollection(drawingVerts));
  }, [drawingVerts, ready]);

  // Wire / unwire click handlers when editable toggles.
  useEffect(() => {
    if (!ready || !mapRef.current) return;
    const map = mapRef.current;

    if (!editable) {
      // Reset draw state when leaving edit mode.
      setDrawingVerts([]);
      map.getCanvas().style.cursor = "";
      return;
    }

    map.getCanvas().style.cursor = "crosshair";

    const onClick = (e: maplibregl.MapMouseEvent) => {
      // Add a vertex at click point.
      const { lng, lat } = e.lngLat;
      setDrawingVerts((vs) => [...vs, [lng, lat]]);
    };

    const onDblClick = (e: maplibregl.MapMouseEvent) => {
      // Close the polygon.
      e.preventDefault();
      const verts = drawingVertsRef.current;
      const polygon = vertsToPolygon(verts);
      if (polygon) {
        onBlockCreate(polygon);
      }
      setDrawingVerts([]);
    };

    const onContextMenu = (e: maplibregl.MapMouseEvent) => {
      // Right-click cancels.
      e.preventDefault();
      setDrawingVerts([]);
    };

    map.on("click", onClick);
    map.on("dblclick", onDblClick);
    map.on("contextmenu", onContextMenu);

    return () => {
      map.off("click", onClick);
      map.off("dblclick", onDblClick);
      map.off("contextmenu", onContextMenu);
      map.getCanvas().style.cursor = "";
    };
  }, [editable, ready, onBlockCreate]);

  // void-suppress unused props until edit-mode (drag vertex) lands.
  void onBlockUpdate;
  void selectedBlockId;

  return (
    <div className="relative h-full min-h-[280px] w-full touch-manipulation">
      <div
        ref={containerRef}
        className={className ?? "h-full min-h-[280px] w-full touch-manipulation"}
        data-testid="spray-map"
      />
      {editable && (
        <div className="pointer-events-none absolute left-3 top-3 rounded-md bg-background/85 px-3 py-2 text-xs text-foreground/80 shadow-md">
          Click to add vertices · double-click to close · right-click to cancel
        </div>
      )}
    </div>
  );
}
