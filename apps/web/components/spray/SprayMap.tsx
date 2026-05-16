/**
 * SprayMap — MapLibre GL satellite map with NATIVE polygon draw (M0-05).
 *
 * Draw tools: **rectangle** (click-drag) or **polygon** (vertices + Done / Cancel / Esc).
 * Uses Esri World Imagery as the basemap (free with attribution).
 *
 * Block geoms render as a single GeoJSON source with fill + stroke + name
 * labels. Address search uses `/api/geocode` (Nominatim proxy).
 */
"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import maplibregl, { Map as MaplibreMap } from "maplibre-gl";
import "maplibre-gl/dist/maplibre-gl.css";
import { cn } from "@/lib/utils";
import { SprayMapAddressSearch } from "@/components/spray/SprayMapAddressSearch";
import {
  ROW_BEARING_STEP_RAD,
  ROW_LENGTH_STEP_M,
  ROW_MIN_LENGTH_M,
  rowEndpoints,
} from "@/lib/vinePlacementUtils";

export type BlockFeature = {
  id: string;
  name: string;
  geom: GeoJSON.Polygon | GeoJSON.MultiPolygon;
  archived: boolean;
  /** Per-block fill on map; defaults to vineyard amber when omitted. */
  fillColor?: string;
};

export type DrawTool = "rectangle" | "polygon";

export type VineMapFeature = {
  id: string;
  block_id: string;
  row_index: number;
  vine_index: number;
  status: "ok" | "watch" | "alert";
  location: [number, number];
  label?: string;
};

export type VinePlacementMode = "single" | "row" | null;

export type SprayMapProps = {
  centroid: [number, number] | null;
  /** Shown as a map label at `centroid` when both are set. */
  vineyardName?: string | null;
  blocks: BlockFeature[];
  selectedBlockId: string | null;
  editable: boolean;
  onBlockSelect: (blockId: string | null) => void;
  onBlockCreate: (geom: GeoJSON.Polygon) => void | Promise<void>;
  onBlockUpdate: (geom: GeoJSON.Polygon) => void;
  /**
   * With `onBlockExtend`, rectangle/polygon commits merge into this block (API `append_geom`)
   * instead of creating a new block. Side panel should offer a way to exit extend mode.
   */
  extendBlockId?: string | null;
  onBlockExtend?: (blockId: string, geom: GeoJSON.Polygon) => void;
  className?: string;
  /** Show OSM-backed address search overlay on the map (default true). */
  showAddressSearch?: boolean;
  /** Called once the map is ready; use for external address search / flyTo. */
  onMapReady?: (api: { flyTo: (lng: number, lat: number, zoom?: number) => void }) => void;
  /** Vine nodes for the selected block (map circles + labels). */
  vines?: VineMapFeature[];
  selectedVineId?: string | null;
  vinePlacementMode?: VinePlacementMode;
  onVineSelect?: (vineId: string | null) => void;
  onVineMapClick?: (lngLat: [number, number]) => void;
  onVineRowCommit?: (segment: {
    start: [number, number];
    end: [number, number];
  }) => void;
  /** When true, block polygon clicks do not change selection (vine placement). */
  suppressBlockSelect?: boolean;
  /** Number of vines to preview in row mode. */
  vineRowPreviewCount?: number;
  /** Initial row length (m) when anchor is placed. */
  rowDefaultLengthM?: number;
  /** Radius multiplier for vine nodes (default 1.0 = 9px). */
  vineNodeScale?: number;
  /** Overlay components to render on top of the map. */
  children?: React.ReactNode;
};

export type RowDraft = {
  anchor: [number, number];
  bearingRad: number;
  lengthM: number;
};

const NAPA_CENTROID: [number, number] = [-122.31, 38.3];
const ESRI_WORLD_IMAGERY_TILE =
  "https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}";

const ESRI_STYLE: maplibregl.StyleSpecification = {
  version: 8,
  glyphs: "https://demotiles.maplibre.org/font/{fontstack}/{range}.pbf",
  sources: {
    "esri-imagery": {
      type: "raster",
      tiles: [ESRI_WORLD_IMAGERY_TILE],
      tileSize: 256,
      maxzoom: 19,
      attribution:
        "Tiles © Esri — Source: Esri, USDA, USGS, … · Search © OpenStreetMap contributors",
    },
  },
  layers: [
    { id: "esri-imagery", type: "raster", source: "esri-imagery", minzoom: 0 },
  ],
};

const BLOCK_FILL_COLOR = "#c08a3e";
const DRAW_FILL_COLOR = "#c08a3e";
const DRAW_STROKE_COLOR = "#ffffff";

const RECT_MIN_PX = 8;

/** Layers that can receive a block hit (top → bottom for queryRenderedFeatures). */
const BLOCK_HIT_LAYER_IDS = ["blocks-label", "blocks-stroke", "blocks-fill"] as const;

const VINE_HIT_LAYER_IDS = ["vines-label", "vines-circle"] as const;

const VINE_STATUS_COLOR: Record<VineMapFeature["status"], string> = {
  ok: "#3b82f6",
  watch: "#f59e0b",
  alert: "#ef4444",
};

function blockIdFromRenderedFeature(f: maplibregl.MapGeoJSONFeature): string | null {
  const p = f.properties as Record<string, unknown> | null | undefined;
  const raw = p?.block_id;
  if (typeof raw === "string" && raw.length > 0) return raw;
  if (f.id != null) return String(f.id);
  return null;
}

function blocksToFeatureCollection(
  blocks: BlockFeature[]
): GeoJSON.FeatureCollection<GeoJSON.Polygon | GeoJSON.MultiPolygon> {
  return {
    type: "FeatureCollection",
    features: blocks
      .filter((b) => !b.archived)
      .map((b) => ({
        type: "Feature",
        id: b.id,
        geometry: b.geom,
        properties: {
          block_id: b.id,
          name: b.name,
          ...(b.fillColor ? { fill_color: b.fillColor } : {}),
        },
      })),
  };
}

function vinesToFeatureCollection(vines: VineMapFeature[]): GeoJSON.FeatureCollection {
  return {
    type: "FeatureCollection",
    features: vines.map((v) => ({
      type: "Feature",
      id: v.id,
      geometry: { type: "Point", coordinates: v.location },
      properties: {
        vine_id: v.id,
        row_index: v.row_index,
        vine_index: v.vine_index,
        status: v.status,
        label: v.label ?? String(v.vine_index),
      },
    })),
  };
}

function rowLabelsCollection(vines: VineMapFeature[]): GeoJSON.FeatureCollection {
  const byRow = new Map<number, VineMapFeature[]>();
  for (const v of vines) {
    const list = byRow.get(v.row_index) ?? [];
    list.push(v);
    byRow.set(v.row_index, list);
  }
  const features: GeoJSON.Feature[] = [];
  for (const [row, rowVines] of byRow) {
    if (rowVines.length === 0) continue;
    const lng =
      rowVines.reduce((s, v) => s + v.location[0], 0) / rowVines.length;
    const lat =
      rowVines.reduce((s, v) => s + v.location[1], 0) / rowVines.length;
    features.push({
      type: "Feature",
      properties: { name: `Row ${row}` },
      geometry: { type: "Point", coordinates: [lng, lat] },
    });
  }
  return { type: "FeatureCollection", features };
}

function rowPreviewCollection(
  draft: RowDraft | null,
  count: number = 0,
): GeoJSON.FeatureCollection {
  if (!draft) {
    return { type: "FeatureCollection", features: [] };
  }
  const { start, end } = rowEndpoints(draft.anchor, draft.bearingRad, draft.lengthM);
  const features: GeoJSON.Feature[] = [
    {
      type: "Feature",
      properties: { kind: "row-line" },
      geometry: { type: "LineString", coordinates: [start, end] },
    },
  ];
  if (count >= 2) {
    for (let i = 0; i < count; i++) {
      const t = i / (count - 1);
      const lng = start[0] + (end[0] - start[0]) * t;
      const lat = start[1] + (end[1] - start[1]) * t;
      const kind =
        i === 0 ? "row-start" : i === count - 1 ? "row-end" : "row-mid";
      features.push({
        type: "Feature",
        properties: { kind },
        geometry: { type: "Point", coordinates: [lng, lat] },
      });
    }
  } else {
    features.push({
      type: "Feature",
      properties: { kind: "row-start" },
      geometry: { type: "Point", coordinates: start },
    });
  }
  return { type: "FeatureCollection", features };
}

function vineyardLabelCollection(
  centroid: [number, number] | null,
  name: string | null | undefined
): GeoJSON.FeatureCollection {
  if (!centroid || !name?.trim()) {
    return { type: "FeatureCollection", features: [] };
  }
  return {
    type: "FeatureCollection",
    features: [
      {
        type: "Feature",
        properties: { name: name.trim() },
        geometry: { type: "Point", coordinates: centroid },
      },
    ],
  };
}

function bboxToPolygon(
  a: [number, number],
  b: [number, number]
): GeoJSON.Polygon {
  const [x1, y1] = a;
  const [x2, y2] = b;
  const minX = Math.min(x1, x2);
  const maxX = Math.max(x1, x2);
  const minY = Math.min(y1, y2);
  const maxY = Math.max(y1, y2);
  return {
    type: "Polygon",
    coordinates: [
      [
        [minX, minY],
        [maxX, minY],
        [maxX, maxY],
        [minX, maxY],
        [minX, minY],
      ],
    ],
  };
}

function vertsToDrawFeatureCollection(
  verts: [number, number][]
): GeoJSON.Feature[] {
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
  return features;
}

function buildDrawingData(
  verts: [number, number][],
  rectDrag: { start: [number, number]; current: [number, number] } | null
): GeoJSON.FeatureCollection {
  const features: GeoJSON.Feature[] = [...vertsToDrawFeatureCollection(verts)];
  if (rectDrag) {
    const poly = bboxToPolygon(rectDrag.start, rectDrag.current);
    const [w, s, e, n] = [
      poly.coordinates[0][0][0],
      poly.coordinates[0][0][1],
      poly.coordinates[0][2][0],
      poly.coordinates[0][2][1],
    ];
    if (w !== e || s !== n) {
      features.push({
        type: "Feature",
        properties: { kind: "rect-preview" },
        geometry: poly,
      });
    }
  }
  return { type: "FeatureCollection", features };
}

function vertsToPolygon(verts: [number, number][]): GeoJSON.Polygon | null {
  if (verts.length < 3) return null;
  const ring = [...verts, verts[0]] as GeoJSON.Position[];
  return { type: "Polygon", coordinates: [ring] };
}

function lngLatFromEvent(
  map: MaplibreMap,
  e: MouseEvent | TouchEvent
): [number, number] | null {
  const canvas = map.getCanvas();
  const rect = canvas.getBoundingClientRect();
  let clientX: number;
  let clientY: number;
  if ("touches" in e) {
    const t = e.touches[0] ?? e.changedTouches[0];
    if (!t) return null;
    clientX = t.clientX;
    clientY = t.clientY;
  } else if ("clientX" in e) {
    clientX = e.clientX;
    clientY = e.clientY;
  } else {
    return null;
  }
  return map.unproject([clientX - rect.left, clientY - rect.top]).toArray() as [
    number,
    number,
  ];
}

export function SprayMap({
  centroid,
  vineyardName,
  blocks,
  selectedBlockId,
  editable,
  onBlockSelect,
  onBlockCreate,
  onBlockUpdate: _onBlockUpdate,
  extendBlockId = null,
  onBlockExtend,
  className,
  showAddressSearch = true,
  onMapReady,
  vines = [],
  selectedVineId = null,
  vinePlacementMode = null,
  onVineSelect,
  onVineMapClick,
  onVineRowCommit,
  suppressBlockSelect = false,
  vineRowPreviewCount = 0,
  rowDefaultLengthM = 12,
  vineNodeScale = 1.0,
  children,
  }: SprayMapProps) {

  const containerRef = useRef<HTMLDivElement | null>(null);
  const mapRef = useRef<MaplibreMap | null>(null);
  const [ready, setReady] = useState(false);
  const [drawTool, setDrawTool] = useState<DrawTool>("rectangle");
  const [drawingVerts, setDrawingVerts] = useState<[number, number][]>([]);
  const drawingVertsRef = useRef<[number, number][]>([]);
  const [rectDrag, setRectDrag] = useState<{
    start: [number, number];
    current: [number, number];
  } | null>(null);
  const rectDragRef = useRef<typeof rectDrag>(null);
  /** Same as rect drag state, updated synchronously so pointerup reads the latest box. */
  const rectSessionRef = useRef<{
    start: [number, number];
    current: [number, number];
  } | null>(null);

  const onMapReadyRef = useRef(onMapReady);
  onMapReadyRef.current = onMapReady;
  const onBlockSelectRef = useRef(onBlockSelect);
  onBlockSelectRef.current = onBlockSelect;
  const vinePlacementModeRef = useRef(vinePlacementMode);
  vinePlacementModeRef.current = vinePlacementMode;
  const onVineMapClickRef = useRef(onVineMapClick);
  onVineMapClickRef.current = onVineMapClick;
  const onVineRowCommitRef = useRef(onVineRowCommit);
  onVineRowCommitRef.current = onVineRowCommit;
  const onVineSelectRef = useRef(onVineSelect);
  onVineSelectRef.current = onVineSelect;
  const suppressBlockSelectRef = useRef(suppressBlockSelect);
  suppressBlockSelectRef.current = suppressBlockSelect;
  const rowDefaultLengthMRef = useRef(rowDefaultLengthM);
  rowDefaultLengthMRef.current = rowDefaultLengthM;
  const rowDraftRef = useRef<RowDraft | null>(null);
  const [rowDraft, setRowDraft] = useState<RowDraft | null>(null);

  drawingVertsRef.current = drawingVerts;
  rectDragRef.current = rectDrag;
  rowDraftRef.current = rowDraft;

  const flyToLngLat = useCallback((lng: number, lat: number, zoom = 16) => {
    mapRef.current?.flyTo({
      center: [lng, lat],
      zoom,
      duration: 1200,
    });
  }, []);

  const clearDrawing = useCallback(() => {
    setDrawingVerts([]);
    setRectDrag(null);
    rectSessionRef.current = null;
  }, []);

  const extendMode = extendBlockId != null && onBlockExtend != null;
  const drawActive = Boolean(editable) || extendMode;
  const drawActiveRef = useRef(drawActive);
  const drawToolRef = useRef(drawTool);
  drawActiveRef.current = drawActive;
  drawToolRef.current = drawTool;

  const finishDraw = useCallback(
    async (polygon: GeoJSON.Polygon) => {
      try {
        if (extendBlockId != null && onBlockExtend) {
          await onBlockExtend(extendBlockId, polygon);
        } else {
          await onBlockCreate(polygon);
        }
        clearDrawing();
      } catch {
        /* Parent surfaces errors; keep sketch on map so the user can retry. */
      }
    },
    [extendBlockId, onBlockExtend, onBlockCreate, clearDrawing]
  );

  const commitPolygon = useCallback(() => {
    const verts = drawingVertsRef.current;
    const polygon = vertsToPolygon(verts);
    if (polygon) {
      finishDraw(polygon);
    } else {
      clearDrawing();
    }
  }, [finishDraw, clearDrawing]);

  // Mount + unmount the map exactly once.
  useEffect(() => {
    if (!containerRef.current) return;
    let destroyed = false;
    let removeWheelCapture: (() => void) | null = null;
    const initialCenter = centroid ?? NAPA_CENTROID;

    const map = new maplibregl.Map({
      container: containerRef.current,
      style: ESRI_STYLE,
      center: initialCenter,
      zoom: 14,
      attributionControl: { compact: true },
      doubleClickZoom: false,
    });

    const mapRoot = map.getContainer();
    // Cancel browser scroll on <main> for any wheel whose target is inside the map (capture
    // phase + non-passive). MapLibre still receives the event afterward; map-root-only listeners
    // miss some trackpad targets and leave scroll chaining to the shell.
    const stopWheelFromScrollingShell = (ev: WheelEvent) => {
      const t = ev.target;
      if (!(t instanceof Node) || !mapRoot.contains(t)) return;
      ev.preventDefault();
    };
    window.addEventListener("wheel", stopWheelFromScrollingShell, {
      passive: false,
      capture: true,
    });
    removeWheelCapture = () =>
      window.removeEventListener("wheel", stopWheelFromScrollingShell, {
        capture: true,
      });

    map.on("load", () => {
      if (destroyed) return;
      map.addSource("blocks", { type: "geojson", data: blocksToFeatureCollection([]) });
      map.addLayer({
        id: "blocks-fill",
        type: "fill",
        source: "blocks",
        paint: {
          "fill-color": ["coalesce", ["get", "fill_color"], BLOCK_FILL_COLOR],
          "fill-opacity": 0.38,
        },
      });
      map.addLayer({
        id: "blocks-stroke",
        type: "line",
        source: "blocks",
        paint: { "line-color": DRAW_STROKE_COLOR, "line-width": 3 },
      });
      map.addLayer({
        id: "blocks-label",
        type: "symbol",
        source: "blocks",
        layout: {
          "text-field": ["get", "name"],
          "text-size": 13,
          "text-anchor": "center",
          "text-allow-overlap": true,
          "text-ignore-placement": false,
        },
        paint: {
          "text-color": "#fffef8",
          "text-halo-color": "#1a1208",
          "text-halo-width": 2,
          "text-halo-blur": 0.5,
        },
      });

      map.addSource("vines", { type: "geojson", data: vinesToFeatureCollection([]) });
      map.addLayer({
        id: "vines-circle",
        type: "circle",
        source: "vines",
        paint: {
          "circle-radius": 9,
          "circle-color": [
            "match",
            ["get", "status"],
            "alert",
            VINE_STATUS_COLOR.alert,
            "watch",
            VINE_STATUS_COLOR.watch,
            VINE_STATUS_COLOR.ok,
          ],
          "circle-stroke-width": 2,
          "circle-stroke-color": "#ffffff",
        },
      });
      map.addLayer({
        id: "vines-label",
        type: "symbol",
        source: "vines",
        layout: {
          "text-field": ["to-string", ["get", "vine_index"]],
          "text-size": 10,
          "text-allow-overlap": true,
        },
        paint: {
          "text-color": "#ffffff",
          "text-halo-color": "#1a1208",
          "text-halo-width": 1.5,
        },
      });

      map.addSource("row-labels", {
        type: "geojson",
        data: rowLabelsCollection([]),
      });
      map.addLayer({
        id: "row-labels",
        type: "symbol",
        source: "row-labels",
        layout: {
          "text-field": ["get", "name"],
          "text-size": 12,
          "text-anchor": "center",
          "text-allow-overlap": true,
        },
        paint: {
          "text-color": "#f5e6c8",
          "text-halo-color": "#2a1810",
          "text-halo-width": 2,
        },
      });

      map.addSource("vine-row-preview", {
        type: "geojson",
        data: rowPreviewCollection(null),
      });
      map.addLayer({
        id: "vine-row-preview-line",
        type: "line",
        source: "vine-row-preview",
        filter: ["==", ["get", "kind"], "row-line"],
        paint: { "line-color": "#ffd27a", "line-width": 3, "line-dasharray": [2, 1] },
      });
      map.addLayer({
        id: "vine-row-preview-point",
        type: "circle",
        source: "vine-row-preview",
        filter: [
          "any",
          ["==", ["get", "kind"], "row-start"],
          ["==", ["get", "kind"], "row-end"],
        ],
        paint: {
          "circle-radius": 8,
          "circle-color": "#ffd27a",
          "circle-stroke-width": 2,
          "circle-stroke-color": "#ffffff",
        },
      });
      map.addLayer({
        id: "vine-row-preview-mid",
        type: "circle",
        source: "vine-row-preview",
        filter: ["==", ["get", "kind"], "row-mid"],
        paint: {
          "circle-radius": 5,
          "circle-color": "#ffd27a",
          "circle-stroke-width": 1.5,
          "circle-stroke-color": "#ffffff",
          "circle-opacity": 0.8,
        },
      });

      map.addSource("vineyard-label", {
        type: "geojson",
        data: vineyardLabelCollection(null, null),
      });
      map.addLayer({
        id: "vineyard-label",
        type: "symbol",
        source: "vineyard-label",
        layout: {
          "text-field": ["get", "name"],
          "text-size": 15,
          "text-anchor": "top",
          "text-offset": [0, 0.6],
          "text-allow-overlap": true,
        },
        paint: {
          "text-color": "#f5e6c8",
          "text-halo-color": "#2a1810",
          "text-halo-width": 2.5,
        },
      });

      map.addSource("drawing", {
        type: "geojson",
        data: { type: "FeatureCollection", features: [] },
      });
      map.addLayer({
        id: "drawing-rect-fill",
        type: "fill",
        source: "drawing",
        filter: ["==", ["get", "kind"], "rect-preview"],
        paint: { "fill-color": DRAW_FILL_COLOR, "fill-opacity": 0.25 },
      });
      map.addLayer({
        id: "drawing-rect-stroke",
        type: "line",
        source: "drawing",
        filter: ["==", ["get", "kind"], "rect-preview"],
        paint: { "line-color": DRAW_STROKE_COLOR, "line-width": 2 },
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
      onMapReadyRef.current?.({
        flyTo: (lng, lat, zoom) => flyToLngLat(lng, lat, zoom),
      });
    });

    const blockHitLayers = () =>
      BLOCK_HIT_LAYER_IDS.filter((id) => Boolean(map.getLayer(id)));

    map.on("click", (e) => {
      const placementMode = vinePlacementModeRef.current;
      const lngLat: [number, number] = [e.lngLat.lng, e.lngLat.lat];

      if (placementMode === "single" && onVineMapClickRef.current) {
        onVineMapClickRef.current(lngLat);
        return;
      }

      if (placementMode === "row") {
        const prev = rowDraftRef.current;
        const draft: RowDraft = {
          anchor: lngLat,
          bearingRad: prev?.bearingRad ?? 0,
          lengthM: prev?.lengthM ?? Math.max(ROW_MIN_LENGTH_M, rowDefaultLengthMRef.current),
        };
        rowDraftRef.current = draft;
        setRowDraft(draft);
        return;
      }

      if (drawingVertsRef.current.length > 0 || rectDragRef.current !== null) {
        return;
      }
      if (drawActiveRef.current && drawToolRef.current === "polygon") {
        return;
      }

      const vineLayers = VINE_HIT_LAYER_IDS.filter((id) => Boolean(map.getLayer(id)));
      if (vineLayers.length > 0 && !placementMode) {
        const vineHits = map.queryRenderedFeatures(e.point, { layers: [...vineLayers] });
        const vf = vineHits[0];
        if (vf) {
          const raw = vf.properties?.vine_id;
          const vineId = typeof raw === "string" ? raw : raw != null ? String(raw) : null;
          if (vineId) {
            onVineSelectRef.current?.(vineId);
            return;
          }
        }
      }

      if (suppressBlockSelectRef.current) return;

      const layers = blockHitLayers();
      if (layers.length === 0) return;
      const hits = map.queryRenderedFeatures(e.point, { layers: [...layers] });
      const f = hits[0];
      if (!f) return;
      const bid = blockIdFromRenderedFeature(f);
      if (bid) onBlockSelectRef.current(bid);
    });

    mapRef.current = map;

    return () => {
      destroyed = true;
      removeWheelCapture?.();
      map.remove();
      mapRef.current = null;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    if (!ready || !mapRef.current) return;
    const src = mapRef.current.getSource("blocks") as
      | maplibregl.GeoJSONSource
      | undefined;
    if (src) src.setData(blocksToFeatureCollection(blocks));
  }, [blocks, ready]);

  useEffect(() => {
    if (!ready || !mapRef.current) return;
    const src = mapRef.current.getSource("vineyard-label") as
      | maplibregl.GeoJSONSource
      | undefined;
    if (src) src.setData(vineyardLabelCollection(centroid, vineyardName));
  }, [centroid, vineyardName, ready]);

  useEffect(() => {
    if (!ready || !mapRef.current) return;
    const map = mapRef.current;
    const vinesSrc = map.getSource("vines") as maplibregl.GeoJSONSource | undefined;
    if (vinesSrc) vinesSrc.setData(vinesToFeatureCollection(vines));
    const rowSrc = map.getSource("row-labels") as maplibregl.GeoJSONSource | undefined;
    if (rowSrc) rowSrc.setData(rowLabelsCollection(vines));
    if (map.getLayer("vines-circle")) {
      const sid = selectedVineId ?? "";
      const baseRadius = 9 * (vineNodeScale ?? 1.0);
      map.setPaintProperty("vines-circle", "circle-radius", [
        "case",
        ["==", ["to-string", ["get", "vine_id"]], sid],
        baseRadius * 1.4,
        baseRadius,
      ]);
      map.setPaintProperty("vines-circle", "circle-stroke-width", [
        "case",
        ["==", ["to-string", ["get", "vine_id"]], sid],
        3,
        2,
      ]);
    }
  }, [vines, selectedVineId, vineNodeScale, ready]);

  useEffect(() => {
    if (!ready || !mapRef.current) return;
    const src = mapRef.current.getSource("vine-row-preview") as
      | maplibregl.GeoJSONSource
      | undefined;
    if (src) src.setData(rowPreviewCollection(rowDraft, vineRowPreviewCount));
  }, [rowDraft, vineRowPreviewCount, ready]);

  useEffect(() => {
    rowDraftRef.current = null;
    setRowDraft(null);
  }, [vinePlacementMode]);

  useEffect(() => {
    if (!ready || !mapRef.current || vinePlacementMode !== "row") return;
    const map = mapRef.current;

    const projectLengthFromPointer = (lngLat: [number, number]) => {
      const draft = rowDraftRef.current;
      if (!draft) return;
      const { start } = rowEndpoints(draft.anchor, draft.bearingRad, draft.lengthM);
      const latRad = (start[1] * Math.PI) / 180;
      const mPerDegLat = 111_320;
      const mPerDegLng = 111_320 * Math.cos(latRad);
      const dx = (lngLat[0] - start[0]) * mPerDegLng;
      const dy = (lngLat[1] - start[1]) * mPerDegLat;
      const along =
        dx * Math.cos(draft.bearingRad) + dy * Math.sin(draft.bearingRad);
      const next: RowDraft = {
        ...draft,
        lengthM: Math.max(ROW_MIN_LENGTH_M, along),
      };
      rowDraftRef.current = next;
      setRowDraft(next);
    };

    const onMove = (e: maplibregl.MapMouseEvent) => {
      if (!rowDraftRef.current) return;
      projectLengthFromPointer([e.lngLat.lng, e.lngLat.lat]);
    };

    const onKey = (e: KeyboardEvent) => {
      const draft = rowDraftRef.current;
      if (!draft) return;
      const tag = (e.target as HTMLElement | null)?.tagName;
      if (tag === "INPUT" || tag === "TEXTAREA" || tag === "SELECT") return;

      if (e.key === "Escape") {
        e.preventDefault();
        rowDraftRef.current = null;
        setRowDraft(null);
        return;
      }

      if (e.key === "Enter") {
        e.preventDefault();
        const segment = rowEndpoints(draft.anchor, draft.bearingRad, draft.lengthM);
        onVineRowCommitRef.current?.(segment);
        rowDraftRef.current = null;
        setRowDraft(null);
        return;
      }

      let next: RowDraft | null = null;
      if (e.key === "[" || e.key === "]" || e.key === "ArrowLeft" || e.key === "ArrowRight") {
        e.preventDefault();
        const sign =
          e.key === "[" || e.key === "ArrowLeft" ? -1 : 1;
        next = {
          ...draft,
          bearingRad: draft.bearingRad + sign * ROW_BEARING_STEP_RAD,
        };
      } else if (e.key === "-" || e.key === "=" || e.key === "+" || e.key === "ArrowDown" || e.key === "ArrowUp") {
        e.preventDefault();
        const sign =
          e.key === "-" || e.key === "ArrowDown" ? -1 : 1;
        next = {
          ...draft,
          lengthM: Math.max(ROW_MIN_LENGTH_M, draft.lengthM + sign * ROW_LENGTH_STEP_M),
        };
      }

      if (next) {
        rowDraftRef.current = next;
        setRowDraft(next);
      }
    };

    map.on("mousemove", onMove);
    window.addEventListener("keydown", onKey);
    return () => {
      map.off("mousemove", onMove);
      window.removeEventListener("keydown", onKey);
    };
  }, [vinePlacementMode, ready]);

  useEffect(() => {
    if (!ready || !mapRef.current) return;
    const canvas = mapRef.current.getCanvas();
    if (vinePlacementMode) {
      canvas.style.cursor = "crosshair";
    } else if (!drawActive) {
      canvas.style.cursor = "";
    }
  }, [vinePlacementMode, drawActive, ready]);

  useEffect(() => {
    if (!ready || !mapRef.current) return;
    const map = mapRef.current;
    if (!map.getLayer("blocks-label")) return;
    const sid = selectedBlockId ?? "";
    map.setPaintProperty("blocks-label", "text-color", [
      "case",
      ["==", ["to-string", ["get", "block_id"]], sid],
      "#ffd27a",
      "#fffef8",
    ]);
    map.setPaintProperty("blocks-label", "text-halo-width", [
      "case",
      ["==", ["to-string", ["get", "block_id"]], sid],
      3,
      2,
    ]);
  }, [selectedBlockId, ready]);

  useEffect(() => {
    if (!ready || !mapRef.current || !centroid) return;
    mapRef.current.flyTo({ center: centroid, zoom: 14, duration: 0 });
  }, [centroid, ready]);

  useEffect(() => {
    if (!ready || !mapRef.current) return;
    const src = mapRef.current.getSource("drawing") as
      | maplibregl.GeoJSONSource
      | undefined;
    if (src) src.setData(buildDrawingData(drawingVerts, rectDrag));
  }, [drawingVerts, rectDrag, ready]);

  useEffect(() => {
    if (!drawActive) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        e.preventDefault();
        clearDrawing();
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [drawActive, clearDrawing]);

  useEffect(() => {
    if (!ready || !mapRef.current) return;
    const map = mapRef.current;

    if (!drawActive) {
      clearDrawing();
      map.getCanvas().style.cursor = "";
      return;
    }

    if (drawTool === "polygon") {
      map.getCanvas().style.cursor = "crosshair";

      const onClick = (e: maplibregl.MapMouseEvent) => {
        if (vinePlacementModeRef.current) return;
        const { lng, lat } = e.lngLat;
        setDrawingVerts((vs) => [...vs, [lng, lat]]);
      };

      const onDblClick = (e: maplibregl.MapMouseEvent) => {
        e.preventDefault();
        const verts = drawingVertsRef.current;
        const polygon = vertsToPolygon(verts);
        if (polygon) {
          finishDraw(polygon);
        } else {
          clearDrawing();
        }
      };

      map.on("click", onClick);
      map.on("dblclick", onDblClick);

      return () => {
        map.off("click", onClick);
        map.off("dblclick", onDblClick);
        map.getCanvas().style.cursor = "";
      };
    }

    map.getCanvas().style.cursor = "crosshair";
    return () => {
      map.getCanvas().style.cursor = "";
    };
  }, [drawActive, ready, drawTool, finishDraw, clearDrawing]);

  useEffect(() => {
    if (!ready || !mapRef.current || !drawActive || drawTool !== "rectangle") return;
    const map = mapRef.current;
    const canvas = map.getCanvas();

    let dragging = false;

    const screenDist = (a: [number, number], b: [number, number]) => {
      const pa = map.project(a);
      const pb = map.project(b);
      return Math.hypot(pa.x - pb.x, pa.y - pb.y);
    };

    const onDown = (e: MouseEvent | TouchEvent) => {
      if (vinePlacementModeRef.current) return;
      if ("button" in e && e.button !== 0) return;
      if ("touches" in e && e.touches.length !== 1) return;
      const ll = lngLatFromEvent(map, e);
      if (!ll) return;
      dragging = true;
      map.dragPan.disable();
      map.scrollZoom.disable();
      const touchZoom = (
        map as unknown as { touchZoomRotate?: { disable(): void; enable(): void } }
      ).touchZoomRotate;
      touchZoom?.disable();
      const session = { start: ll, current: ll };
      rectSessionRef.current = session;
      setRectDrag(session);
      try {
        if ("pointerId" in e && (e as PointerEvent).pointerId != null) {
          canvas.setPointerCapture((e as PointerEvent).pointerId);
        }
      } catch {
        /* ignore */
      }
    };

    const onMove = (e: MouseEvent | TouchEvent) => {
      if (!dragging) return;
      const ll = lngLatFromEvent(map, e);
      if (!ll) return;
      setRectDrag((prev) => {
        const next = prev ? { ...prev, current: ll } : { start: ll, current: ll };
        rectSessionRef.current = next;
        return next;
      });
    };

    const endDrag = (e: MouseEvent | TouchEvent) => {
      if (!dragging) return;
      dragging = false;
      map.dragPan.enable();
      map.scrollZoom.enable();
      const touchZoom = (
        map as unknown as { touchZoomRotate?: { disable(): void; enable(): void } }
      ).touchZoomRotate;
      touchZoom?.enable();
      try {
        if ("pointerId" in e && (e as PointerEvent).pointerId != null) {
          canvas.releasePointerCapture((e as PointerEvent).pointerId);
        }
      } catch {
        /* ignore */
      }

      const drag = rectSessionRef.current;
      rectSessionRef.current = null;
      setRectDrag(null);
      if (!drag) return;
      if (screenDist(drag.start, drag.current) < RECT_MIN_PX) return;
      const poly = bboxToPolygon(drag.start, drag.current);
      finishDraw(poly);
    };

    canvas.addEventListener("mousedown", onDown);
    canvas.addEventListener("mousemove", onMove);
    canvas.addEventListener("mouseup", endDrag);
    canvas.addEventListener("mouseleave", endDrag);
    canvas.addEventListener("touchstart", onDown, { passive: true });
    canvas.addEventListener("touchmove", onMove, { passive: true });
    canvas.addEventListener("touchend", endDrag);
    canvas.addEventListener("touchcancel", endDrag);

    return () => {
      canvas.removeEventListener("mousedown", onDown);
      canvas.removeEventListener("mousemove", onMove);
      canvas.removeEventListener("mouseup", endDrag);
      canvas.removeEventListener("mouseleave", endDrag);
      canvas.removeEventListener("touchstart", onDown);
      canvas.removeEventListener("touchmove", onMove);
      canvas.removeEventListener("touchend", endDrag);
      canvas.removeEventListener("touchcancel", endDrag);
      map.dragPan.enable();
      map.scrollZoom.enable();
      const touchZoom = (
        map as unknown as { touchZoomRotate?: { disable(): void; enable(): void } }
      ).touchZoomRotate;
      touchZoom?.enable();
      rectSessionRef.current = null;
      setRectDrag(null);
    };
  }, [drawActive, ready, drawTool, finishDraw]);

  useEffect(() => {
    if (!drawActive) {
      setDrawTool("rectangle");
    }
  }, [drawActive]);

  return (
    <div
      className="relative h-full min-h-0 w-full overflow-hidden overscroll-contain"
      data-lenis-prevent
    >
      <div
        ref={containerRef}
        className={cn(
          "h-full min-h-[280px] w-full overscroll-contain",
          className
        )}
        data-testid="spray-map"
      />

      {showAddressSearch && (
        <div
          className="pointer-events-auto absolute right-3 top-3 z-10 w-[min(100%-1.5rem,20rem)] rounded-md border border-border/50 bg-background/92 p-2 shadow-md backdrop-blur-sm"
          onClick={(e) => e.stopPropagation()}
          onKeyDown={(e) => e.stopPropagation()}
        >
          <SprayMapAddressSearch onFlyTo={flyToLngLat} />
        </div>
      )}

      {vinePlacementMode && (
        <div
          className={cn(
            "pointer-events-none absolute left-3 z-10 max-w-[min(100%-1.5rem,20rem)] rounded-md border border-amber/40 bg-background/95 px-3 py-2 text-xs text-foreground/90 shadow-md backdrop-blur-sm",
            drawActive ? "top-44" : "top-3",
          )}
        >
          {vinePlacementMode === "single" ? (
            <p>
              <strong className="text-amber">Add vine</strong> — click inside the block on the
              map.
            </p>
          ) : (
            <div className="space-y-1">
              <p>
                <strong className="text-amber">Add row</strong> — click to set the row anchor.
                Move the mouse to set length.
              </p>
              {rowDraft && (
                <p className="text-[10px] text-foreground/50">
                  <kbd className="rounded bg-foreground/10 px-1 font-mono">[</kbd>{" "}
                  <kbd className="rounded bg-foreground/10 px-1 font-mono">]</kbd> rotate ·{" "}
                  <kbd className="rounded bg-foreground/10 px-1 font-mono">-</kbd>{" "}
                  <kbd className="rounded bg-foreground/10 px-1 font-mono">=</kbd> length ·{" "}
                  <kbd className="rounded bg-foreground/10 px-1 font-mono">Enter</kbd> place ·{" "}
                  <kbd className="rounded bg-foreground/10 px-1 font-mono">Esc</kbd> cancel
                </p>
              )}
            </div>
          )}
        </div>
      )}

      {drawActive && (
        <div className="pointer-events-auto absolute left-3 top-3 z-10 flex max-w-[min(100%-1.5rem,22rem)] flex-col gap-2 rounded-md border border-border/50 bg-background/95 p-3 text-xs text-foreground/90 shadow-md backdrop-blur-sm">
          {extendMode ? (
            <>
              <div className="font-semibold text-foreground">Add to block footprint</div>
              <p className="text-foreground/70">
                Draw a <strong>rectangle</strong> (click-drag) or <strong>polygon</strong> (tap
                corners, then Done). The shape merges with this block. Use{" "}
                <strong>Cancel extend</strong> in the toolbar above the map when finished.
              </p>
            </>
          ) : (
            <div className="font-semibold text-foreground">Draw new block</div>
          )}
          <div className="flex flex-wrap gap-2">
            <button
              type="button"
              onClick={() => {
                clearDrawing();
                setDrawTool("rectangle");
              }}
              className={`rounded px-2.5 py-1.5 font-medium transition-colors ${
                drawTool === "rectangle"
                  ? "bg-amber text-background"
                  : "border border-border/50 bg-background/60 hover:bg-background/80"
              }`}
            >
              Rectangle
            </button>
            <button
              type="button"
              onClick={() => {
                clearDrawing();
                setDrawTool("polygon");
              }}
              className={`rounded px-2.5 py-1.5 font-medium transition-colors ${
                drawTool === "polygon"
                  ? "bg-amber text-background"
                  : "border border-border/50 bg-background/60 hover:bg-background/80"
              }`}
            >
              Polygon
            </button>
          </div>
          {!extendMode &&
            (drawTool === "rectangle" ? (
              <p className="text-foreground/70">
                Click and drag on the map to draw a rectangle. Release to save.
              </p>
            ) : (
              <p className="text-foreground/70">
                Tap the map to add corners. Press <strong>Done</strong> when finished
                (≥3 points), or <strong>Cancel</strong> / <strong>Esc</strong> to discard.
                Double-click also closes the shape.
              </p>
            ))}
          {drawTool === "polygon" && (
            <div className="flex flex-wrap gap-2">
              <button
                type="button"
                onClick={commitPolygon}
                disabled={drawingVerts.length < 3}
                className="rounded bg-amber px-3 py-2 font-semibold text-background disabled:opacity-40"
              >
                Done
              </button>
              <button
                type="button"
                onClick={clearDrawing}
                className="rounded border border-border/60 px-3 py-2 font-semibold text-foreground/85 hover:bg-background/80"
              >
                Cancel
              </button>
            </div>
          )}
          {drawTool === "polygon" && drawingVerts.length > 0 && (
            <p className="text-foreground/50">{drawingVerts.length} point(s)</p>
          )}
        </div>
      )}

      {children}
    </div>
  );
}
