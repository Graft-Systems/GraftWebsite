/**
 * SprayMap — MapLibre GL satellite map with polygon draw (M0-05).
 *
 * Rendered inside `apps/web/app/spray/(app)/vineyards/[vineyard_id]/`.
 * Uses Esri World Imagery as the basemap (free with attribution); the
 * draw control is @mapbox/mapbox-gl-draw which is API-compatible with
 * MapLibre.
 *
 * Block geoms render as a single GeoJSON source with two layers (fill
 * + stroke). Active selection bumps the opacity. The MapboxDraw
 * instance manages a separate layer for the polygon currently being
 * edited.
 */
"use client";

import { useEffect, useRef, useState } from "react";
import maplibregl, { Map as MaplibreMap, MapLibreEvent } from "maplibre-gl";
import MapboxDraw from "@mapbox/mapbox-gl-draw";
import "maplibre-gl/dist/maplibre-gl.css";
import "@mapbox/mapbox-gl-draw/dist/mapbox-gl-draw.css";

// MapLibre vs Mapbox class-name compatibility shim. @mapbox/mapbox-gl-draw
// targets Mapbox GL's `mapboxgl-*` CSS classes; MapLibre uses
// `maplibregl-*`. Without this remap the draw control's DOM never
// receives the styles MapboxDraw expects, and a draw.create event
// never fires when the user clicks the canvas.
//
// Reference: https://github.com/mapbox/mapbox-gl-draw/issues/1019
//            https://github.com/maplibre/maplibre-gl-js/issues/1018
//
// Safe to call once at module load — MapboxDraw.constants is a single
// shared object, not per-instance.
//
// eslint-disable-next-line @typescript-eslint/no-explicit-any
const _drawConstants: any = (MapboxDraw as any).constants;
if (_drawConstants?.classes) {
  _drawConstants.classes.CANVAS = "maplibregl-canvas";
  _drawConstants.classes.CONTROL_BASE = "maplibregl-ctrl";
  _drawConstants.classes.CONTROL_PREFIX = "maplibregl-ctrl-";
  _drawConstants.classes.CONTROL_BUTTON = "maplibregl-ctrl-icon";
  _drawConstants.classes.ATTRIBUTION = "maplibregl-ctrl-attrib";
}

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
    {
      id: "esri-imagery",
      type: "raster",
      source: "esri-imagery",
      minzoom: 0,
      maxzoom: 19,
    },
  ],
};

const BLOCK_FILL_COLOR = "#c08a3e"; // Spray brand amber.

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
  const drawRef = useRef<MapboxDraw | null>(null);
  const [ready, setReady] = useState(false);

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
    });

    map.on("load", () => {
      // Block geom source + layers.
      map.addSource("blocks", {
        type: "geojson",
        data: blocksToFeatureCollection([]),
      });
      map.addLayer({
        id: "blocks-fill",
        type: "fill",
        source: "blocks",
        paint: {
          "fill-color": BLOCK_FILL_COLOR,
          "fill-opacity": 0.35,
        },
      });
      map.addLayer({
        id: "blocks-stroke",
        type: "line",
        source: "blocks",
        paint: {
          "line-color": "#ffffff",
          "line-width": 1.5,
        },
      });
      setReady(true);
    });

    // Click-to-select.
    map.on("click", "blocks-fill", (e) => {
      const f = e.features?.[0];
      if (f && f.id != null) onBlockSelect(String(f.id));
    });
    map.on("click", (e) => {
      // Click outside any feature deselects.
      const features = map.queryRenderedFeatures(e.point, {
        layers: ["blocks-fill"],
      });
      if (features.length === 0) onBlockSelect(null);
    });

    mapRef.current = map;

    return () => {
      drawRef.current = null;
      map.remove();
      mapRef.current = null;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Update blocks data when props change.
  useEffect(() => {
    if (!ready || !mapRef.current) return;
    const src = mapRef.current.getSource("blocks") as
      | maplibregl.GeoJSONSource
      | undefined;
    if (src) src.setData(blocksToFeatureCollection(blocks));
  }, [blocks, ready]);

  // Recenter when the vineyard's centroid changes (rare).
  useEffect(() => {
    if (!ready || !mapRef.current || !centroid) return;
    mapRef.current.flyTo({ center: centroid, zoom: 14, duration: 0 });
  }, [centroid, ready]);

  // Mount / unmount the draw control when editable flips.
  useEffect(() => {
    if (!ready || !mapRef.current) return;
    const map = mapRef.current;

    if (editable && !drawRef.current) {
      // MapboxDraw's DEFAULT styles use Mapbox-GL-specific expression
      // syntax (numeric dasharray arrays without a "literal" wrapper)
      // that MapLibre rejects. Pass our own MapLibre-safe minimal
      // styles so the layer adds cleanly.
      // Reference style ids must include "gl-draw-*" prefixes that
      // mapbox-gl-draw expects when filtering its own layers.
      const draw = new MapboxDraw({
        displayControlsDefault: false,
        controls: { polygon: true, trash: true },
        styles: [
          // Polygon fill (active = selected, inactive = saved/idle)
          {
            id: "gl-draw-polygon-fill-inactive",
            type: "fill",
            filter: [
              "all",
              ["==", "active", "false"],
              ["==", "$type", "Polygon"],
              ["!=", "mode", "static"],
            ],
            paint: { "fill-color": "#c08a3e", "fill-opacity": 0.25 },
          },
          {
            id: "gl-draw-polygon-fill-active",
            type: "fill",
            filter: ["all", ["==", "active", "true"], ["==", "$type", "Polygon"]],
            paint: { "fill-color": "#c08a3e", "fill-opacity": 0.4 },
          },
          // Polygon stroke
          {
            id: "gl-draw-polygon-stroke-inactive",
            type: "line",
            filter: [
              "all",
              ["==", "active", "false"],
              ["==", "$type", "Polygon"],
              ["!=", "mode", "static"],
            ],
            layout: { "line-cap": "round", "line-join": "round" },
            paint: { "line-color": "#ffffff", "line-width": 1.5 },
          },
          {
            id: "gl-draw-polygon-stroke-active",
            type: "line",
            filter: ["all", ["==", "active", "true"], ["==", "$type", "Polygon"]],
            layout: { "line-cap": "round", "line-join": "round" },
            paint: { "line-color": "#c08a3e", "line-width": 2 },
          },
          // Mid-line for the polygon currently being drawn (LineString
          // is what MapboxDraw uses while waiting for the user to close)
          {
            id: "gl-draw-line-active",
            type: "line",
            filter: ["all", ["==", "$type", "LineString"], ["==", "active", "true"]],
            layout: { "line-cap": "round", "line-join": "round" },
            paint: { "line-color": "#c08a3e", "line-width": 2 },
          },
          // Vertex points (the dots on every polygon corner)
          {
            id: "gl-draw-polygon-and-line-vertex-stroke-inactive",
            type: "circle",
            filter: ["all", ["==", "meta", "vertex"], ["==", "$type", "Point"]],
            paint: { "circle-radius": 5, "circle-color": "#ffffff" },
          },
          {
            id: "gl-draw-polygon-and-line-vertex-inactive",
            type: "circle",
            filter: ["all", ["==", "meta", "vertex"], ["==", "$type", "Point"]],
            paint: { "circle-radius": 3, "circle-color": "#c08a3e" },
          },
        ],
      });
      // MapboxDraw's typing assumes mapbox-gl, but it works at runtime
      // with maplibre-gl.
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      map.addControl(draw as any, "top-right");
      drawRef.current = draw;

      map.on("draw.create", (e: { features: GeoJSON.Feature[] }) => {
        const f = e.features[0];
        if (f && f.geometry.type === "Polygon") {
          onBlockCreate(f.geometry);
          // Clear the draw layer so the saved polygon takes over.
          if (drawRef.current) drawRef.current.deleteAll();
        }
      });
      map.on(
        "draw.update",
        (e: { features: GeoJSON.Feature[]; action: string }) => {
          const f = e.features[0];
          if (
            f &&
            f.geometry.type === "Polygon" &&
            selectedBlockId &&
            f.id === selectedBlockId
          ) {
            onBlockUpdate(selectedBlockId, f.geometry);
          }
        }
      );
    } else if (!editable && drawRef.current) {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      map.removeControl(drawRef.current as any);
      drawRef.current = null;
    }
  }, [editable, ready, selectedBlockId, onBlockCreate, onBlockUpdate]);

  return (
    <div
      ref={containerRef}
      className={className ?? "h-full w-full"}
      data-testid="spray-map"
    />
  );
}
