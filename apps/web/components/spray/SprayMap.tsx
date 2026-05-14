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

export type BlockFeature = {
  id: string;
  name: string;
  geom: GeoJSON.Polygon | GeoJSON.MultiPolygon;
  archived: boolean;
};

export type DrawTool = "rectangle" | "polygon";

export type SprayMapProps = {
  centroid: [number, number] | null;
  /** Shown as a map label at `centroid` when both are set. */
  vineyardName?: string | null;
  blocks: BlockFeature[];
  selectedBlockId: string | null;
  editable: boolean;
  onBlockSelect: (blockId: string | null) => void;
  onBlockCreate: (geom: GeoJSON.Polygon) => void;
  onBlockUpdate: (geom: GeoJSON.Polygon) => void;
  /**
   * With `onBlockExtend`, rectangle/polygon commits merge into this block (API `append_geom`)
   * instead of creating a new block. Side panel should offer a way to exit extend mode.
   */
  extendBlockId?: string | null;
  onBlockExtend?: (blockId: string, geom: GeoJSON.Polygon) => void;
  className?: string;
  /** Show OSM-backed address search (default true). */
  showAddressSearch?: boolean;
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
      attribution:
        "Tiles © Esri — Source: Esri, USDA, USGS, … · Search © OpenStreetMap contributors",
    },
  },
  layers: [
    { id: "esri-imagery", type: "raster", source: "esri-imagery", minzoom: 0, maxzoom: 19 },
  ],
};

const BLOCK_FILL_COLOR = "#c08a3e";
const DRAW_FILL_COLOR = "#c08a3e";
const DRAW_STROKE_COLOR = "#ffffff";

const RECT_MIN_PX = 8;

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
        properties: { name: b.name },
      })),
  };
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

type GeocodeHit = { lat: number; lon: number; label: string };

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

  const [searchQ, setSearchQ] = useState("");
  const [searchBusy, setSearchBusy] = useState(false);
  const [searchHits, setSearchHits] = useState<GeocodeHit[]>([]);
  const [searchErr, setSearchErr] = useState<string | null>(null);
  const searchAbortRef = useRef<AbortController | null>(null);

  drawingVertsRef.current = drawingVerts;
  rectDragRef.current = rectDrag;

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

  const flyToResult = useCallback((hit: GeocodeHit) => {
    setSearchHits([]);
    setSearchErr(null);
    if (!mapRef.current) return;
    mapRef.current.flyTo({
      center: [hit.lon, hit.lat],
      zoom: 16,
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

  const finishDraw = useCallback(
    (polygon: GeoJSON.Polygon) => {
      if (extendBlockId != null && onBlockExtend) {
        onBlockExtend(extendBlockId, polygon);
      } else {
        onBlockCreate(polygon);
      }
      clearDrawing();
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
    const initialCenter = centroid ?? NAPA_CENTROID;

    const map = new maplibregl.Map({
      container: containerRef.current,
      style: ESRI_STYLE,
      center: initialCenter,
      zoom: 14,
      attributionControl: { compact: true },
      doubleClickZoom: false,
    });

    map.on("load", () => {
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
    });

    map.on("click", "blocks-fill", (e) => {
      if (drawingVertsRef.current.length > 0 || rectDragRef.current !== null) {
        return;
      }
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
    if (!map.getLayer("blocks-label")) return;
    const sid = selectedBlockId ?? "";
    map.setPaintProperty("blocks-label", "text-color", [
      "case",
      ["==", ["to-string", ["id"]], sid],
      "#ffd27a",
      "#fffef8",
    ]);
    map.setPaintProperty("blocks-label", "text-halo-width", [
      "case",
      ["==", ["to-string", ["id"]], sid],
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
    <div className="relative h-full min-h-[280px] w-full">
      <div
        ref={containerRef}
        className={className ?? "h-full min-h-[280px] w-full"}
        data-testid="spray-map"
      />

      {showAddressSearch && (
        <div
          className="pointer-events-auto absolute right-3 top-3 z-10 w-[min(100%-1.5rem,20rem)] rounded-md border border-border/50 bg-background/92 p-2 shadow-md backdrop-blur-sm"
          onClick={(e) => e.stopPropagation()}
          onKeyDown={(e) => e.stopPropagation()}
        >
          <label className="block text-[10px] font-semibold uppercase tracking-wide text-foreground/55">
            Find address
          </label>
          <div className="mt-1 flex gap-1">
            <input
              type="search"
              value={searchQ}
              onChange={(e) => setSearchQ(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter") void runAddressSearch();
              }}
              placeholder="Street, city, ZIP…"
              className="min-h-9 min-w-0 flex-1 rounded border border-border/50 bg-background/90 px-2 text-sm text-foreground placeholder:text-foreground/35"
              autoComplete="street-address"
            />
            <button
              type="button"
              onClick={() => void runAddressSearch()}
              disabled={searchBusy || searchQ.trim().length < 2}
              className="shrink-0 rounded bg-amber px-3 py-1.5 text-xs font-semibold text-background transition-colors hover:bg-amber/90 disabled:opacity-40"
            >
              {searchBusy ? "…" : "Go"}
            </button>
          </div>
          {searchErr && <p className="mt-1.5 text-xs text-amber">{searchErr}</p>}
          {searchHits.length > 0 && (
            <ul className="mt-1 max-h-48 overflow-auto rounded border border-border/40 bg-background/95 text-xs">
              {searchHits.map((h, i) => (
                <li
                  key={`${h.lat},${h.lon},${i}`}
                  className="border-b border-border/30 last:border-b-0"
                >
                  <button
                    type="button"
                    className="w-full px-2 py-2 text-left text-foreground/85 hover:bg-amber/15"
                    onClick={() => flyToResult(h)}
                  >
                    {h.label}
                  </button>
                </li>
              ))}
            </ul>
          )}
          <p className="mt-1 text-[10px] leading-snug text-foreground/40">
            Results from OpenStreetMap Nominatim — use sparingly (rate limits apply).
          </p>
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
                <strong>Cancel extend</strong> in the side panel when finished.
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
    </div>
  );
}
