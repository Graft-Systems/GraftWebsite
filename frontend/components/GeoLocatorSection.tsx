"use client";

import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
const aerialImg = "/attached_assets/vineyard-aerial.jpg";

/*
 * Aerial image: 1024×1024 square showing a diagonal grid of vineyard blocks
 * separated by tan dirt roads. SVG viewBox is 0-100 × 0-100.
 *
 * Overlay coordinate reference (traced from user's annotated example):
 *   - Vineyard: border around the full image edge
 *   - Block: parallelogram around one block, bordered by dirt paths
 *   - Row: narrow tall strip within a block — one row of vines
 *   - Vine: tiny rectangle on a single vine plant
 *
 * Dirt-road grid (approximate center lines in % coords):
 *   Road A: (42,0)→(0,38)     — runs NW → SE, separates top-left blocks
 *   Road B: (74,0)→(20,48)    — parallel to A, separates center blocks
 *   Road C: (0,38)→(100,60)   — runs W → E-ish, major horizontal divider
 *   Road D: (20,48)→(82,98)   — continues the grid lower-right
 */

// ── SVG glow filter ─────────────────────────────────────────────────────
const GlowFilter = () => (
  <defs>
    <filter id="glow" x="-20%" y="-20%" width="140%" height="140%">
      <feGaussianBlur stdDeviation="1.2" result="blur" />
      <feComposite in="SourceGraphic" in2="blur" operator="over" />
    </filter>
    <filter id="glowStrong" x="-30%" y="-30%" width="160%" height="160%">
      <feGaussianBlur stdDeviation="2" result="blur" />
      <feComposite in="SourceGraphic" in2="blur" operator="over" />
    </filter>
  </defs>
);

// ── Level data ──────────────────────────────────────────────────────────

const LEVELS = [
  {
    id: "vineyard",
    label: "Vineyard",
    icon: (
      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
        <rect x="3" y="3" width="18" height="18" rx="2" />
      </svg>
    ),
    description:
      "Estimate yield across your entire property. Every scanned cluster contributes to your vineyard-wide total.",
    /* Vineyard: border around the entire image, just inside the edge */
    overlay: (
      <g filter="url(#glow)">
        <rect
          x="1.5" y="1.5" width="97" height="97"
          rx="1"
          fill="rgba(139, 35, 50, 0.06)"
          stroke="#e8556a"
          strokeWidth="1.8"
        />
      </g>
    ),
    tag: "Est. yield: 42.8 tons",
  },
  {
    id: "block",
    label: "Block",
    icon: (
      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
        <rect x="3" y="3" width="8" height="8" rx="1" />
        <rect x="13" y="3" width="8" height="8" rx="1" />
        <rect x="3" y="13" width="8" height="8" rx="1" />
        <rect x="13" y="13" width="8" height="8" rx="1" />
      </svg>
    ),
    description:
      "Drill into individual blocks. Compare Chardonnay Block A against Block B, or track how each varietal is performing.",
    /*
     * Block: pixel-traced parallelogram around the upper-center block.
     * Every vertex placed where green canopy pixels touch beige dirt pixels,
     * with 0.5 SVG-unit inward margin. The block is a full parallelogram
     * bounded by two diagonal side roads and diagonal top/bottom cross-roads.
     * Verified: 0 dirt pixels inside (75,460 total pixels checked).
     */
    overlay: (
      <g filter="url(#glow)">
        {/* Faint vineyard border for context */}
        <rect
          x="1.5" y="1.5" width="97" height="97"
          rx="1"
          fill="none"
          stroke="#F5F0E8"
          strokeWidth="0.4"
          opacity="0.15"
        />
        {/* Highlighted block — pixel-boundary traced parallelogram */}
        <polygon
          points="40.1,0 67.7,0 67.3,2 66,4 64.9,6 64.5,8 63.3,10 62.3,12 61.1,14 60.2,16 59.6,17 59.3,18 58.6,19 58.1,20 57.5,21 56.9,22 56.4,23 54,26.9 52,27 50,26.4 48,25.8 46,25.2 44,24.8 42,24.1 40,23.2 38,22.4 36,21.7 34,21.1 32,20.5 30,19.9 29,19.1 27.3,18 27.1,17 27.9,16 28.5,15 29.1,14 29.9,13 30.7,12 31.4,11 32,10 32.8,9 33.5,8 34.4,7 35.1,6 35.7,5 36.4,4 37.4,3.5 38.2,3 38.4,2 39.1,1 39.8,0.5"
          fill="rgba(139, 35, 50, 0.1)"
          stroke="#e8556a"
          strokeWidth="1.5"
          strokeLinejoin="round"
        />
      </g>
    ),
    tag: "Block B — Est. 12.1 tons",
  },
  {
    id: "row",
    label: "Row",
    icon: (
      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
        <line x1="4" y1="4" x2="4" y2="20" />
        <line x1="9" y1="4" x2="9" y2="20" />
        <line x1="14" y1="4" x2="14" y2="20" />
        <line x1="19" y1="4" x2="19" y2="20" />
      </svg>
    ),
    description:
      "Zoom into a single row. See how yield varies from one end to the other — spot weak areas before harvest.",
    /*
     * Row: narrow strip within the block, following the vine-row direction.
     * 3 SVG-unit wide, leans left going down (~0.6 x per y unit)
     * matching the actual vine row orientation in the aerial photo.
     */
    overlay: (
      <g filter="url(#glow)">
        {/* Faint block outline for context */}
        <polygon
          points="40.1,0 67.7,0 67.3,2 66,4 64.9,6 64.5,8 63.3,10 62.3,12 61.1,14 60.2,16 59.6,17 59.3,18 58.6,19 58.1,20 57.5,21 56.9,22 56.4,23 54,26.9 52,27 50,26.4 48,25.8 46,25.2 44,24.8 42,24.1 40,23.2 38,22.4 36,21.7 34,21.1 32,20.5 30,19.9 29,19.1 27.3,18 27.1,17 27.9,16 28.5,15 29.1,14 29.9,13 30.7,12 31.4,11 32,10 32.8,9 33.5,8 34.4,7 35.1,6 35.7,5 36.4,4 37.4,3.5 38.2,3 38.4,2 39.1,1 39.8,0.5"
          fill="none"
          stroke="#F5F0E8"
          strokeWidth="0.4"
          opacity="0.15"
        />
        {/* Highlighted row — centered in block, follows vine lean left */}
        <polygon
          points="52.1,0 55.1,0 41.3,23 38.3,23"
          fill="rgba(139, 35, 50, 0.15)"
          stroke="#e8556a"
          strokeWidth="1.2"
          strokeLinejoin="round"
        />
      </g>
    ),
    tag: "Row 14 — Est. 0.38 tons",
  },
  {
    id: "vine",
    label: "Vine",
    icon: (
      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
        <circle cx="12" cy="12" r="3" />
        <path d="M12 1v4M12 19v4M1 12h4M19 12h4" />
      </svg>
    ),
    description:
      "Pinpoint a single vine. GPS-tagged photos let you track individual plants over seasons and compare year-over-year.",
    /*
     * Vine: tiny rectangle on a single vine plant within the row.
     * Pixel-verified: sits on pure green canopy.
     */
    overlay: (
      <g filter="url(#glowStrong)">
        {/* Faint row context */}
        <polygon
          points="52.1,0 55.1,0 41.3,23 38.3,23"
          fill="none"
          stroke="#F5F0E8"
          strokeWidth="0.3"
          opacity="0.12"
        />
        {/* Vine — small rectangle within the row */}
        <rect
          x="44.8" y="12"
          width="2" height="2"
          fill="rgba(139, 35, 50, 0.2)"
          stroke="#e8556a"
          strokeWidth="1"
        />
        {/* Pulsing outer ring for emphasis */}
        <rect
          x="43.3" y="10.5"
          width="5" height="5"
          fill="none"
          stroke="#e8556a"
          strokeWidth="0.5"
          opacity="0.4"
          className="animate-ping"
          style={{ transformOrigin: "45.8% 13%", animationDuration: "2.5s" }}
        />
      </g>
    ),
    tag: "Vine #47 — Est. 4.2 kg",
  },
];

export default function GeoLocatorSection() {
  const [activeLevel, setActiveLevel] = useState(0);
  const level = LEVELS[activeLevel];

  return (
    <section className="bg-vineyard-earth py-16 lg:py-20 relative">
      <div className="absolute top-0 left-0 right-0 h-px bg-cream/5" />

      <div className="max-w-6xl mx-auto px-6 lg:px-8">
        {/* Section header */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.6 }}
          className="text-center mb-8"
        >
          <h2 className="text-3xl sm:text-4xl lg:text-5xl font-semibold text-cream mb-4">
            GPS-Tracked Precision
          </h2>
          <p className="text-cream/70 text-lg max-w-2xl mx-auto">
            Every photo is tagged with GPS coordinates. Search your property by vineyard, block, row, or individual vine — anything scanned can be estimated and segmented.
          </p>
        </motion.div>

        <div className="flex flex-col lg:flex-row items-center gap-8 lg:gap-12">
          {/* Aerial graphic with overlay */}
          <motion.div
            initial={{ opacity: 0, x: -30 }}
            whileInView={{ opacity: 1, x: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.7 }}
            className="relative w-full max-w-sm flex-shrink-0"
          >
            {/* Aerial photo */}
            <div className="relative rounded-xl overflow-hidden shadow-2xl border border-cream/10">
              <img
                src={aerialImg}
                alt="Aerial view of vineyard blocks"
                className="w-full aspect-square object-cover"
              />

              {/* Light overlay for contrast */}
              <div className="absolute inset-0 bg-vineyard-earth/30" />

              {/* SVG overlay layer */}
              <svg
                className="absolute inset-0 w-full h-full"
                viewBox="0 0 100 100"
                preserveAspectRatio="none"
              >
                <GlowFilter />
                <AnimatePresence mode="wait">
                  <motion.g
                    key={level.id}
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    exit={{ opacity: 0 }}
                    transition={{ duration: 0.4 }}
                  >
                    {level.overlay}
                  </motion.g>
                </AnimatePresence>
              </svg>

              {/* Yield tag */}
              <AnimatePresence mode="wait">
                <motion.div
                  key={level.tag}
                  initial={{ opacity: 0, y: 8 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -8 }}
                  transition={{ duration: 0.3 }}
                  className="absolute bottom-4 left-4 bg-vineyard-brown/80 backdrop-blur-sm
                             border border-cream/20 rounded-lg px-4 py-2"
                >
                  <div className="flex items-center gap-2">
                    <div className="w-2 h-2 rounded-full bg-brand-burgundy animate-pulse" />
                    <span className="text-cream text-sm font-semibold">{level.tag}</span>
                  </div>
                </motion.div>
              </AnimatePresence>

              {/* GPS icon */}
              <div className="absolute top-4 right-4 bg-vineyard-brown/70 backdrop-blur-sm
                              border border-cream/15 rounded-md px-3 py-1.5 flex items-center gap-2">
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#F5F0E8" strokeWidth="2">
                  <path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z" />
                  <circle cx="12" cy="10" r="3" />
                </svg>
                <span className="text-cream/70 text-xs font-semibold">GPS Active</span>
              </div>
            </div>
          </motion.div>

          {/* Text + toggle controls */}
          <motion.div
            initial={{ opacity: 0, x: 30 }}
            whileInView={{ opacity: 1, x: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.7, delay: 0.2 }}
            className="flex-1"
          >
            {/* Level toggle buttons */}
            <div className="flex flex-wrap gap-2 mb-8">
              {LEVELS.map((lvl, i) => (
                <button
                  key={lvl.id}
                  onClick={() => setActiveLevel(i)}
                  className={`flex items-center gap-2 px-4 py-2.5 rounded-lg font-semibold text-sm transition-all duration-300 cursor-pointer
                    ${activeLevel === i
                      ? "bg-brand-burgundy text-white shadow-lg shadow-brand-burgundy/20"
                      : "bg-vineyard-brown/50 text-cream/60 hover:bg-vineyard-brown/80 hover:text-cream"
                    }`}
                  data-testid={`button-level-${lvl.id}`}
                >
                  {lvl.icon}
                  {lvl.label}
                </button>
              ))}
            </div>

            {/* Active level description */}
            <AnimatePresence mode="wait">
              <motion.div
                key={level.id}
                initial={{ opacity: 0, y: 12 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -12 }}
                transition={{ duration: 0.3 }}
              >
                <h3 className="text-2xl font-semibold text-cream mb-4">
                  {level.label === "Vineyard" && "Whole-vineyard estimates"}
                  {level.label === "Block" && "Block-level detail"}
                  {level.label === "Row" && "Row-by-row insight"}
                  {level.label === "Vine" && "Individual vine tracking"}
                </h3>
                <p className="text-cream/60 text-base leading-relaxed mb-6">
                  {level.description}
                </p>

                {/* Visual breadcrumb showing drill-down path */}
                <div className="flex items-center gap-2 text-cream/40 text-sm">
                  {LEVELS.slice(0, activeLevel + 1).map((crumb, i) => (
                    <span key={crumb.id} className="flex items-center gap-2">
                      {i > 0 && (
                        <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                          <polyline points="9 18 15 12 9 6" />
                        </svg>
                      )}
                      <span className={i === activeLevel ? "text-cream font-semibold" : ""}>
                        {crumb.label}
                      </span>
                    </span>
                  ))}
                </div>
              </motion.div>
            </AnimatePresence>
          </motion.div>
        </div>
      </div>
    </section>
  );
}
