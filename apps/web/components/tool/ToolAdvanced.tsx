"use client";

import { useRef, useState } from "react";
import Map, { Layer, Source, type MapRef } from "react-map-gl";
import "mapbox-gl/dist/mapbox-gl.css";
import type { MapLayerMouseEvent } from "mapbox-gl";
import { AnimatePresence, motion } from "framer-motion";
import { BLOCKS, BLOCKS_GEOJSON, CENTER, centroid } from "@/lib/vineyard";

export function ToolAdvanced() {
  const mapRef = useRef<MapRef>(null);
  const [selected, setSelected] = useState<string | null>(null);
  const [hover, setHover] = useState<string | null>(null);
  const token = process.env.NEXT_PUBLIC_MAPBOX_TOKEN;

  const selectedBlock = BLOCKS.find((b) => b.name === selected);

  function handleClick(e: MapLayerMouseEvent) {
    const feature = e.features?.[0];
    if (feature && feature.properties && "name" in feature.properties) {
      const name = String(feature.properties.name);
      setSelected(name);
      const block = BLOCKS.find((b) => b.name === name);
      if (block) {
        const [cx, cy] = centroid(block.coords);
        mapRef.current?.getMap().easeTo({
          center: [cx, cy],
          zoom: 18,
          duration: 900,
        });
      }
    }
  }

  if (!token) {
    return (
      <div className="flex min-h-[55vh] items-center justify-center rounded-sm border border-border/60 bg-surface/40">
        <div className="max-w-md px-8 text-center">
          <span className="frame text-[0.6rem] text-amber">MAP UNAVAILABLE</span>
          <p className="mt-4 text-sm text-foreground-muted">
            Set <code className="numeric text-foreground">NEXT_PUBLIC_MAPBOX_TOKEN</code>{" "}
            in <code className="numeric text-foreground">.env.local</code> to enable.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="grid grid-cols-1 gap-6 lg:grid-cols-[1fr_22rem]">
      <div className="relative h-[55vh] min-h-[420px] overflow-hidden rounded-sm border border-border/60">
        <Map
          ref={mapRef}
          mapboxAccessToken={token}
          mapStyle="mapbox://styles/mapbox/satellite-v9"
          initialViewState={{
            longitude: CENTER[0],
            latitude: CENTER[1],
            zoom: 16.8,
          }}
          interactiveLayerIds={["blocks-fill"]}
          onClick={handleClick}
          onMouseMove={(e) => {
            const f = e.features?.[0];
            setHover(f?.properties?.name ? String(f.properties.name) : null);
          }}
          onMouseLeave={() => setHover(null)}
          attributionControl={false}
          cursor={hover ? "pointer" : "grab"}
          dragRotate={false}
        >
          <Source id="blocks" type="geojson" data={BLOCKS_GEOJSON}>
            <Layer
              id="blocks-fill"
              type="fill"
              paint={{
                "fill-color": [
                  "case",
                  ["==", ["get", "name"], selected ?? ""],
                  "#7A1F2B",
                  ["==", ["get", "name"], hover ?? ""],
                  "#E8A13A",
                  "#7A1F2B",
                ],
                "fill-opacity": [
                  "case",
                  ["==", ["get", "name"], selected ?? ""],
                  0.25,
                  ["==", ["get", "name"], hover ?? ""],
                  0.2,
                  0.05,
                ],
              }}
            />
            <Layer
              id="blocks-outline"
              type="line"
              paint={{
                "line-color": "#7A1F2B",
                "line-width": [
                  "case",
                  ["==", ["get", "name"], selected ?? ""],
                  2.4,
                  1.4,
                ],
                "line-opacity": 0.85,
              }}
            />
          </Source>
        </Map>
      </div>

      {/* Info panel */}
      <aside className="relative flex flex-col rounded-sm border border-border/60 bg-surface/60 p-6 lg:p-8">
        <AnimatePresence mode="wait">
          {selectedBlock ? (
            <motion.div
              key={selectedBlock.name}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              transition={{ duration: 0.35 }}
            >
              <span className="frame text-[0.6rem] text-foreground-muted">
                BLOCK {selectedBlock.name}
              </span>
              <p className="display mt-3 text-xl italic text-foreground lg:text-2xl">
                {selectedBlock.varietal}.
              </p>
              <dl className="mt-6 space-y-4">
                <InfoRow label="Clones" value={selectedBlock.clones.join(" · ")} />
                <InfoRow label="Planted" value={String(selectedBlock.planted)} />
                <InfoRow label="Rows" value={String(selectedBlock.rows)} />
                <InfoRow label="Vines" value={String(selectedBlock.vines)} />
              </dl>
              <p className="frame mt-8 text-[0.56rem] text-foreground-muted">
                DEMO DATA · FICTIONAL VINEYARD
              </p>
            </motion.div>
          ) : (
            <motion.div
              key="empty"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.3 }}
            >
              <span className="frame text-[0.6rem] text-foreground-muted">
                SELECT A BLOCK
              </span>
              <p className="mt-4 text-sm leading-relaxed text-foreground/70">
                Click any block on the map to see its varietal, clones, and
                planting details. Drag to pan, scroll to zoom.
              </p>
            </motion.div>
          )}
        </AnimatePresence>
      </aside>
    </div>
  );
}

function InfoRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-baseline justify-between border-b border-border/30 pb-3">
      <dt className="frame text-[0.56rem] text-foreground-muted">{label}</dt>
      <dd className="numeric text-sm text-foreground">{value}</dd>
    </div>
  );
}
