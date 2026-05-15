"use client";

import Image from "next/image";
import { useEffect, useRef, useState } from "react";
import {
  AnimatePresence,
  motion,
  useMotionValue,
  useMotionValueEvent,
} from "framer-motion";
import Map, { Layer, Source, type MapRef } from "react-map-gl";
import "mapbox-gl/dist/mapbox-gl.css";
import {
  BLOCKS,
  BLOCKS_GEOJSON as blocksGeoJSON,
  CENTER,
  FOCUS_BLOCK,
  FOCUS_CENTER,
  FOCUS_ROW_CENTER,
  FOCUS_ROW_END,
  FOCUS_ROW_START,
  FOCUS_VINE,
} from "@/lib/vineyard";

const focusBlockGeoJSON: GeoJSON.FeatureCollection = {
  type: "FeatureCollection",
  features: [
    {
      type: "Feature",
      properties: {},
      geometry: { type: "Polygon", coordinates: [FOCUS_BLOCK.coords] },
    },
  ],
};


const focusRowGeoJSON: GeoJSON.FeatureCollection = {
  type: "FeatureCollection",
  features: [
    {
      type: "Feature",
      properties: {},
      geometry: {
        type: "LineString",
        coordinates: [FOCUS_ROW_START, FOCUS_ROW_END],
      },
    },
  ],
};

const focusVineGeoJSON: GeoJSON.FeatureCollection = {
  type: "FeatureCollection",
  features: [
    {
      type: "Feature",
      properties: {},
      geometry: { type: "Point", coordinates: FOCUS_VINE },
    },
  ],
};

// Beat camera states. Zooms tuned so the tighter 5-block grid is
// prominent at beat 1 (was too small at the old 15.3).
const BEATS = [
  { zoom: 16.8, center: CENTER, name: 0 },
  { zoom: 18.0, center: FOCUS_CENTER, name: 1 },
  { zoom: 18.8, center: FOCUS_ROW_CENTER, name: 2 },
  { zoom: 19.6, center: FOCUS_VINE, name: 3 },
];

function interpolate(
  p: number,
  ranges: [number, number][],
  values: number[]
): number {
  for (let i = 0; i < ranges.length; i++) {
    const [a, b] = ranges[i];
    if (p <= b) {
      const t = Math.max(0, Math.min(1, (p - a) / (b - a)));
      return values[i] + (values[i + 1] - values[i]) * t;
    }
  }
  return values[values.length - 1];
}

export function SceneMap() {
  const sectionRef = useRef<HTMLElement>(null);
  const mapRef = useRef<MapRef | null>(null);
  const progress = useMotionValue(0);
  const [beat, setBeat] = useState(0);
  const [tokenMissing] = useState(
    !process.env.NEXT_PUBLIC_MAPBOX_TOKEN
  );

  // Drive progress off window scroll (manual, reliable alongside Lenis)
  useEffect(() => {
    const el = sectionRef.current;
    if (!el) return;
    const calc = () => {
      const rect = el.getBoundingClientRect();
      const range = rect.height - window.innerHeight;
      if (range <= 0) return;
      const scrolled = -rect.top;
      progress.set(Math.max(0, Math.min(1, scrolled / range)));
    };
    calc();
    let rafId = 0;
    const onScroll = () => {
      cancelAnimationFrame(rafId);
      rafId = requestAnimationFrame(calc);
    };
    window.addEventListener("scroll", onScroll, { passive: true });
    window.addEventListener("resize", onScroll, { passive: true });
    return () => {
      cancelAnimationFrame(rafId);
      window.removeEventListener("scroll", onScroll);
      window.removeEventListener("resize", onScroll);
    };
  }, [progress]);

  // Update map camera and active beat as progress changes
  useMotionValueEvent(progress, "change", (p) => {
    // Beat index from progress
    const b = p < 0.23 ? 0 : p < 0.48 ? 1 : p < 0.73 ? 2 : 3;
    setBeat(b);

    const map = mapRef.current?.getMap();
    if (!map) return;

    // Interpolate zoom and center across 4 segments with short transition bands
    let zoom: number;
    let lng: number;
    let lat: number;

    if (p < 0.23) {
      const t = p / 0.23;
      zoom = BEATS[0].zoom + t * 0.2;
      lng = BEATS[0].center[0];
      lat = BEATS[0].center[1];
    } else if (p < 0.30) {
      const t = (p - 0.23) / 0.07;
      zoom = BEATS[0].zoom + 0.2 + t * (BEATS[1].zoom - BEATS[0].zoom - 0.2);
      lng = BEATS[0].center[0] + t * (BEATS[1].center[0] - BEATS[0].center[0]);
      lat = BEATS[0].center[1] + t * (BEATS[1].center[1] - BEATS[0].center[1]);
    } else if (p < 0.48) {
      const t = (p - 0.30) / 0.18;
      zoom = BEATS[1].zoom + t * 0.15;
      lng = BEATS[1].center[0];
      lat = BEATS[1].center[1];
    } else if (p < 0.55) {
      const t = (p - 0.48) / 0.07;
      zoom = BEATS[1].zoom + 0.15 + t * (BEATS[2].zoom - BEATS[1].zoom - 0.15);
      lng = BEATS[1].center[0] + t * (BEATS[2].center[0] - BEATS[1].center[0]);
      lat = BEATS[1].center[1] + t * (BEATS[2].center[1] - BEATS[1].center[1]);
    } else if (p < 0.73) {
      const t = (p - 0.55) / 0.18;
      zoom = BEATS[2].zoom + t * 0.1;
      lng = BEATS[2].center[0];
      lat = BEATS[2].center[1];
    } else if (p < 0.80) {
      const t = (p - 0.73) / 0.07;
      zoom = BEATS[2].zoom + 0.1 + t * (BEATS[3].zoom - BEATS[2].zoom - 0.1);
      lng = BEATS[2].center[0] + t * (BEATS[3].center[0] - BEATS[2].center[0]);
      lat = BEATS[2].center[1] + t * (BEATS[3].center[1] - BEATS[2].center[1]);
    } else {
      const t = (p - 0.80) / 0.20;
      zoom = BEATS[3].zoom + t * 0.2;
      lng = BEATS[3].center[0];
      lat = BEATS[3].center[1];
    }

    map.jumpTo({ zoom, center: [lng, lat] });
  });

  const token = process.env.NEXT_PUBLIC_MAPBOX_TOKEN;

  // Force Mapbox to resize its canvas when the container size changes —
  // crucial on mobile where the initial viewport height can be 0 during
  // layout, and on orientation changes where the container dimensions
  // shift after the map has already mounted.
  useEffect(() => {
    const map = mapRef.current?.getMap();
    if (!map) return;
    const container = map.getContainer();
    if (!container) return;

    const observer = new ResizeObserver(() => {
      map.resize();
    });
    observer.observe(container);

    // One-shot resize after a couple of frames to catch any initial
    // 0-height render.
    const rafId = requestAnimationFrame(() => {
      requestAnimationFrame(() => map.resize());
    });

    return () => {
      cancelAnimationFrame(rafId);
      observer.disconnect();
    };
  }, [token]);

  return (
    <section
      ref={sectionRef}
      id="map"
      className="relative h-[320vh] w-full bg-background"
    >
      <div className="sticky top-0 flex h-[100svh] w-full flex-col md:flex-row">
        {/* Map pane */}
        <div className="relative h-[55svh] w-full shrink-0 md:h-full md:w-auto md:flex-1 md:shrink">
          {tokenMissing || !token ? (
            <MapTokenPlaceholder />
          ) : (
            <Map
              ref={mapRef}
              mapboxAccessToken={token}
              mapStyle="mapbox://styles/mapbox/satellite-v9"
              initialViewState={{
                longitude: CENTER[0],
                latitude: CENTER[1],
                zoom: BEATS[0].zoom,
              }}
              dragPan={false}
              scrollZoom={false}
              doubleClickZoom={false}
              touchZoomRotate={false}
              dragRotate={false}
              attributionControl={false}
              boxZoom={false}
              keyboard={false}
            >
              <Source id="blocks" type="geojson" data={blocksGeoJSON}>
                <Layer
                  id="blocks-outline"
                  type="line"
                  paint={{
                    "line-color": "#7A1F2B",
                    "line-width": 1.6,
                    "line-opacity": beat === 0 ? 0.65 : 0.18,
                  }}
                />
              </Source>

              {beat >= 1 && (
                <Source id="focus-block" type="geojson" data={focusBlockGeoJSON}>
                  <Layer
                    id="focus-block-fill"
                    type="fill"
                    paint={{
                      "fill-color": "#7A1F2B",
                      "fill-opacity": 0.12,
                    }}
                  />
                  <Layer
                    id="focus-block-line"
                    type="line"
                    paint={{
                      "line-color": "#7A1F2B",
                      "line-width": 2.4,
                      "line-opacity": 0.95,
                    }}
                  />
                </Source>
              )}

              {beat >= 2 && (
                <Source id="focus-row" type="geojson" data={focusRowGeoJSON}>
                  <Layer
                    id="focus-row-line"
                    type="line"
                    paint={{
                      "line-color": "#E8A13A",
                      "line-width": 3,
                      "line-opacity": 0.92,
                    }}
                  />
                </Source>
              )}

              {beat >= 3 && (
                <Source id="focus-vine" type="geojson" data={focusVineGeoJSON}>
                  <Layer
                    id="focus-vine-dot"
                    type="circle"
                    paint={{
                      "circle-color": "#E8A13A",
                      "circle-radius": 7,
                      "circle-stroke-color": "#F4ECE0",
                      "circle-stroke-width": 1.5,
                      "circle-opacity": 0.95,
                    }}
                  />
                </Source>
              )}
            </Map>
          )}

          {/* Subtle scrim to knock back satellite saturation behind the headline */}
          <div
            aria-hidden
            className="pointer-events-none absolute inset-y-0 left-0 w-1/2 bg-gradient-to-r from-background/55 via-background/15 to-transparent"
          />

          {/* Headline overlay */}
          <div className="pointer-events-none absolute left-6 top-24 z-10 max-w-xl lg:left-10 lg:top-28">
            <span className="frame text-[0.72rem] font-semibold text-sage">
              SPATIAL COMMON GROUND
            </span>
            <h2 className="display mt-3 text-display-lg leading-[1.05] text-foreground">
              From estate to vine—in one view.
            </h2>
          </div>

          {/* Progress pips — beat indicators */}
          <div className="absolute bottom-10 left-6 z-10 flex items-center gap-2 lg:left-10">
            {[0, 1, 2, 3].map((i) => (
              <span
                key={i}
                className="h-px w-8 transition-colors duration-300"
                style={{
                  backgroundColor:
                    i < beat
                      ? "#F4ECE0"
                      : i === beat
                      ? "#E8A13A"
                      : "rgba(244,236,224,0.2)",
                }}
              />
            ))}
            <span className="frame ml-3 text-[0.58rem] text-foreground/60">
              0{beat + 1} / 04
            </span>
          </div>
        </div>

        {/* Side panel */}
        <aside className="relative z-10 flex w-full flex-1 flex-col justify-center border-t border-border/40 bg-surface/95 px-6 py-8 backdrop-blur-md md:h-full md:w-[36%] md:flex-none md:border-l md:border-t-0 md:px-10 md:py-12 lg:w-[32%]">
          <AnimatePresence mode="wait">
            <motion.div
              key={beat}
              initial={{ opacity: 0, y: 14 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -14 }}
              transition={{ duration: 0.45, ease: [0.2, 0.9, 0.3, 1] }}
            >
              {beat === 0 && <Beat1Panel />}
              {beat === 1 && <Beat2Panel />}
              {beat === 2 && <Beat3Panel />}
              {beat === 3 && <Beat4Panel />}
            </motion.div>
          </AnimatePresence>
        </aside>
      </div>
    </section>
  );
}

function Beat1Panel() {
  return (
    <div>
      <span className="frame text-[0.62rem] text-foreground-muted">
        ENTIRE VINEYARD
      </span>
      <p className="display mt-5 text-2xl italic leading-tight text-foreground lg:text-[1.8rem]">
        Five blocks. Five varietals.
      </p>
      <dl className="mt-8 space-y-4">
        <Row label="Varietals" value="5" />
        <Row label="Acres" value="~80" />
        <Row label="Last estimate" value="23 Apr 2026" />
      </dl>
      <p className="mt-10 text-xs leading-relaxed text-foreground/55">
        Yield, spray context, and future canopy tools all share the same geography.
        Scroll to drill from blocks to rows to vines.
      </p>
    </div>
  );
}

function Beat2Panel() {
  return (
    <div>
      <span className="frame text-[0.62rem] text-foreground-muted">BLOCK 07</span>
      <p className="display mt-5 text-2xl italic leading-tight text-foreground lg:text-[1.8rem]">
        Cabernet Sauvignon.
      </p>
      <dl className="mt-8 space-y-4">
        <Row label="Clones" value="337 · 169" />
        <Row label="Planted" value="2014" />
        <Row label="Rows" value="38" />
        <Row label="Last estimated" value="23 Apr 2026" />
      </dl>
      <p className="mt-10 frame text-[0.58rem] text-foreground-muted">
        Selected block · ready for drill-down
      </p>
    </div>
  );
}

function Beat3Panel() {
  return (
    <div>
      <span className="frame text-[0.62rem] text-foreground-muted">
        BLOCK 07 · ROW 12
      </span>
      <p className="display mt-5 text-2xl italic leading-tight text-foreground lg:text-[1.8rem]">
        A single row.
      </p>
      <dl className="mt-8 space-y-4">
        <Row label="Vines" value="48" />
        <Row label="Length" value="180 ft" />
        <Row label="Planted" value="2014" />
        <Row label="Orientation" value="NE → SW" />
      </dl>
      <p className="mt-10 frame text-[0.58rem] text-foreground-muted">
        Row isolated · vine-level detail available
      </p>
    </div>
  );
}

function Beat4Panel() {
  return (
    <div>
      <span className="frame text-[0.62rem] text-foreground-muted">
        VINE 12–47
      </span>
      <div className="mt-5 aspect-[4/3] overflow-hidden rounded-sm border border-border/60 relative">
        <Image
          src="/photos/cluster/red-gamay-cluster.webp"
          alt="Close-up of a red grape cluster on the vine"
          fill
          sizes="(max-width: 1024px) 100vw, 33vw"
          className="object-cover"
          draggable={false}
        />
      </div>
      <p className="mt-5 frame text-[0.6rem] text-foreground-muted">
        CAPTURED · 14 APR 2026
      </p>
      <p className="mt-4 text-sm leading-relaxed text-foreground/75">
        Selected for analysis. The vine is where yield—and every other signal—has
        to resolve.
      </p>
    </div>
  );
}

function Row({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-baseline justify-between border-b border-border/40 pb-3">
      <dt className="frame text-[0.58rem] text-foreground-muted">{label}</dt>
      <dd className="numeric text-sm text-foreground">{value}</dd>
    </div>
  );
}

function MapTokenPlaceholder() {
  return (
    <div className="flex h-full w-full items-center justify-center bg-surface">
      <div className="max-w-md px-8 text-center">
        <span className="frame text-[0.6rem] text-amber">MAP UNAVAILABLE</span>
        <p className="mt-4 text-sm text-foreground-muted">
          Set <code className="numeric text-foreground">NEXT_PUBLIC_MAPBOX_TOKEN</code>{" "}
          in <code className="numeric text-foreground">.env.local</code> to enable
          the satellite map.
        </p>
      </div>
    </div>
  );
}
