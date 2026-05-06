"use client";

import { motion } from "framer-motion";
import { MagneticButton } from "@/components/ui/MagneticButton";
import { SplitTextReveal } from "@/components/ui/SplitTextReveal";

// Block outline positions, hand-traced over french-vineyard.jpg.
// Three blocks covering midground + foreground only — the horizon block
// was dropped (too narrow, kept clipping a farmhouse edge). Each polygon
// sits strictly on visible vineyard rows, clear of structures and paths.
// Coordinates are % of viewport (viewBox 0 0 100 100, preserveAspectRatio="none").
const BLOCKS = [
  // Main block right of the central path
  {
    id: "07",
    d: "M 54 50.8 L 85 50.4 L 88 56.2 L 51 57 Z",
    dotX: 70,
    dotY: 53.5,
    labelX: 71.5,
    labelY: 53.5,
    delay: 1.7,
  },
  // Block left of the central path, shifted rightward so it clears the
  // slope below the left farmhouse and sits fully inside the vineyard.
  {
    id: "04",
    d: "M 25 51 L 48 50.5 L 48 57 L 24 57.7 Z",
    dotX: 36,
    dotY: 53.9,
    labelX: 37.5,
    labelY: 53.9,
    delay: 2.0,
  },
  // Near-foreground block on the right-of-path vines. Pulled back roughly
  // halfway toward Block 07's plane (so it reads as mid-distance rather
  // than extreme foreground) and shifted a touch right while staying
  // fully in frame.
  {
    id: "11",
    d: "M 60 58 L 90 57 L 92 68 L 58 69 Z",
    dotX: 75,
    dotY: 63,
    labelX: 76.5,
    labelY: 63,
    delay: 2.3,
  },
];

export function SceneHero() {
  return (
    <section
      id="hero"
      className="relative h-[100svh] w-full overflow-hidden bg-background"
    >
      {/* Background photo with slow ken burns */}
      <div className="absolute inset-0">
        <img
          src="/photos/aerial/french-vineyard.jpg"
          alt=""
          aria-hidden
          draggable={false}
          className="h-full w-full object-cover animate-ken-burns motion-reduce:animate-none"
          style={{
            filter: "saturate(0.92) contrast(1.06) brightness(0.82)",
          }}
        />
      </div>

      {/* Warm vignette + bottom fade for text legibility */}
      <div
        aria-hidden
        className="absolute inset-0 bg-gradient-to-b from-background/20 via-transparent to-background/80"
      />
      <div
        aria-hidden
        className="absolute inset-0"
        style={{
          background:
            "radial-gradient(ellipse 80% 60% at 50% 40%, transparent 40%, rgba(14,11,8,0.55) 100%)",
        }}
      />

      {/* Block outline overlay */}
      <svg
        viewBox="0 0 100 100"
        preserveAspectRatio="none"
        className="pointer-events-none absolute inset-0 h-full w-full motion-reduce:hidden"
        aria-hidden
      >
        {BLOCKS.map((b) => (
          <motion.path
            key={`outline-${b.id}`}
            d={b.d}
            stroke="hsl(353 55% 52%)"
            strokeWidth={1.4}
            vectorEffect="non-scaling-stroke"
            fill="none"
            strokeLinejoin="round"
            initial={{ pathLength: 0, opacity: 0 }}
            animate={{ pathLength: 1, opacity: 0.9 }}
            transition={{
              pathLength: {
                duration: 2.2,
                delay: b.delay,
                ease: [0.65, 0, 0.35, 1],
              },
              opacity: { duration: 0.6, delay: b.delay },
            }}
          />
        ))}
        {BLOCKS.map((b) => (
          <motion.circle
            key={`dot-${b.id}`}
            cx={b.dotX}
            cy={b.dotY}
            r={0.55}
            fill="#E8A13A"
            initial={{ opacity: 0, scale: 0 }}
            animate={{ opacity: [0, 1, 0.55, 1], scale: 1 }}
            transition={{
              opacity: {
                delay: b.delay + 1.9,
                duration: 2.4,
                repeat: Infinity,
                repeatType: "mirror",
              },
              scale: { delay: b.delay + 1.9, duration: 0.4 },
            }}
          />
        ))}
      </svg>

      {/* Block labels */}
      <div className="pointer-events-none absolute inset-0 motion-reduce:hidden">
        {BLOCKS.map((b) => (
          <motion.span
            key={`label-${b.id}`}
            className="frame absolute text-[0.58rem] font-semibold text-foreground/80"
            style={{
              left: `${b.labelX}%`,
              top: `${b.labelY}%`,
              transform: "translate(0, -50%)",
              textShadow: "0 1px 8px rgba(14,11,8,0.8)",
            }}
            initial={{ opacity: 0, x: -6 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{
              duration: 0.6,
              delay: b.delay + 2.4,
              ease: "easeOut",
            }}
          >
            BLOCK {b.id}
          </motion.span>
        ))}
      </div>

      {/* Headline + subhead + CTA */}
      <div className="absolute inset-x-0 bottom-0 z-10 pb-[10vh] md:pb-[12vh]">
        <div className="mx-auto grid max-w-[1400px] grid-cols-1 gap-8 px-6 md:grid-cols-[1fr_auto] md:items-end md:gap-16 lg:px-10">
          <div className="max-w-2xl">
            <h1 className="display text-display-xl leading-[1.02] text-foreground">
              <SplitTextReveal text="Know your yield" delay={0.35} immediate />
              <br />
              <SplitTextReveal text="before your harvest." delay={0.6} immediate />
            </h1>
            <motion.p
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.9, delay: 2.5, ease: [0.2, 0.9, 0.3, 1] }}
              className="mt-6 max-w-md text-base text-foreground/75 sm:text-lg"
            >
              Yield estimates at the block, row, and vine.
            </motion.p>
          </div>

          <motion.div
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8, delay: 3.0, ease: [0.2, 0.9, 0.3, 1] }}
            className="md:self-end"
          >
            <MagneticButton
              href="/tool"
              className="frame group inline-flex items-center gap-3 rounded-sm bg-burgundy px-7 py-3.5 text-[0.72rem] font-semibold uppercase tracking-[0.14em] text-foreground transition-colors hover:bg-[#8F2433]"
            >
              See it live
              <svg
                width="13"
                height="13"
                viewBox="0 0 14 14"
                fill="none"
                stroke="currentColor"
                strokeWidth="1.5"
                className="transition-transform duration-300 group-hover:translate-x-1"
              >
                <path d="M4 7h6M8 4l3 3-3 3" strokeLinecap="round" strokeLinejoin="round" />
              </svg>
            </MagneticButton>
          </motion.div>
        </div>
      </div>

      {/* Scroll hint */}
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ duration: 1, delay: 3.8 }}
        className="absolute bottom-5 left-1/2 -translate-x-1/2 flex flex-col items-center gap-2 motion-reduce:hidden"
      >
        <span className="frame text-[0.55rem] text-foreground/40">scroll</span>
        <motion.span
          animate={{ y: [0, 4, 0] }}
          transition={{ duration: 2, repeat: Infinity, ease: "easeInOut" }}
          className="h-4 w-px bg-foreground/30"
        />
      </motion.div>
    </section>
  );
}
