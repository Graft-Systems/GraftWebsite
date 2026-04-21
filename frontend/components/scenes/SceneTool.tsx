"use client";

import { useEffect, useRef } from "react";
import {
  motion,
  useMotionValue,
  useTransform,
  type MotionValue,
} from "framer-motion";

// Cluster positions hand-traced on grape-close-02.jpg.
// Two tight boxes strictly on visible grape mass — upper and lower halves
// of the main hanging cluster. Dropped the left-edge box (too much leaf /
// post intrusion) and kept each polygon conservative so no leaves or trunk
// are enclosed.
// Coordinates are % of the photo container (object-cover).
const CLUSTERS = [
  // Upper half of the main cluster mass
  { id: "01", x: 30, y: 11, w: 14, h: 18, weight: 196 },
  // Lower hanging half of the main cluster mass
  { id: "02", x: 38, y: 32, w: 16, h: 22, weight: 218 },
  // Smaller trailing cluster just right of 02, slightly taller and set
  // lower to catch the secondary hanging bunch.
  { id: "03", x: 55, y: 36, w: 10, h: 28, weight: 152 },
];

const CAPTIONS = [
  { text: "A photo.", in: 0.04, out: 0.22 },
  { text: "Cluster detection.", in: 0.27, out: 0.55 },
  { text: "Per-cluster weight prediction.", in: 0.6, out: 0.8 },
  { text: "Aggregated yield.", in: 0.86, out: 1.02 },
];

export function SceneTool() {
  const sectionRef = useRef<HTMLElement>(null);
  const scrollYProgress = useMotionValue(0);

  useEffect(() => {
    const el = sectionRef.current;
    if (!el) return;

    const calc = () => {
      const rect = el.getBoundingClientRect();
      const vh = window.innerHeight;
      const scrollRange = rect.height - vh;
      if (scrollRange <= 0) return;
      const scrolled = -rect.top;
      const p = Math.max(0, Math.min(1, scrolled / scrollRange));
      scrollYProgress.set(p);
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
  }, [scrollYProgress]);

  const photoScale = useTransform(scrollYProgress, [0.8, 0.96], [1, 0.74]);
  const photoX = useTransform(scrollYProgress, [0.8, 0.96], ["0%", "-16%"]);
  const photoFilter = useTransform(
    scrollYProgress,
    [0, 0.04, 0.1],
    ["brightness(1.1) contrast(1.05)", "brightness(1) contrast(1.05)", "brightness(0.82) contrast(1.1)"]
  );

  const panelX = useTransform(scrollYProgress, [0.82, 0.96], ["110%", "0%"]);
  const panelOpacity = useTransform(scrollYProgress, [0.8, 0.88], [0, 1]);

  return (
    <section
      ref={sectionRef}
      id="tool"
      className="relative h-[260vh] w-full bg-background"
    >
      <div className="sticky top-0 h-[100svh] w-full overflow-hidden">
        {/* Eyebrow + headline — fixed at top */}
        <div className="pointer-events-none absolute left-6 top-24 z-30 max-w-xl lg:left-10 lg:top-28">
          <span className="frame text-[0.72rem] font-semibold text-sage">
            FROM PHOTO TO ESTIMATE
          </span>
          <h2 className="display mt-3 text-display-lg leading-[1.05] text-foreground">
            Seconds per cluster.
          </h2>
        </div>

        {/* Photo + SVG overlay */}
        <motion.div
          className="absolute inset-0 origin-center"
          style={{ scale: photoScale, x: photoX }}
        >
          <motion.img
            src="/photos/cluster/grape-close-02.jpg"
            alt=""
            aria-hidden
            draggable={false}
            className="h-full w-full object-cover"
            style={{ filter: photoFilter }}
          />
          {/* Vignette */}
          <div
            aria-hidden
            className="absolute inset-0 bg-gradient-to-b from-background/50 via-transparent to-background/60"
          />

          <svg
            viewBox="0 0 100 100"
            preserveAspectRatio="none"
            className="pointer-events-none absolute inset-0 h-full w-full motion-reduce:hidden"
            aria-hidden
          >
            {CLUSTERS.map((c, i) => (
              <ClusterDetection
                key={c.id}
                cluster={c}
                index={i}
                progress={scrollYProgress}
              />
            ))}
          </svg>
        </motion.div>

        {/* Side panel (slides in at end) */}
        <motion.aside
          className="absolute right-0 top-0 z-20 flex h-full w-[72%] flex-col justify-center border-l border-border/40 bg-surface/95 px-6 backdrop-blur-md md:w-[40%] lg:w-[32%] lg:px-10"
          style={{ x: panelX, opacity: panelOpacity }}
        >
          <span className="frame text-[0.62rem] text-foreground-muted">
            BLOCK YIELD
          </span>
          <div className="mt-4 flex items-center gap-3">
            <span className="relative inline-block h-2.5 w-2.5 rounded-full bg-amber">
              <span className="absolute inset-0 animate-ping rounded-full bg-amber opacity-60" />
            </span>
            <p className="numeric text-sm text-foreground/90">
              Model output ready.
            </p>
          </div>
          <p className="mt-8 max-w-sm text-sm leading-relaxed text-foreground/70">
            Each photo contributes per-cluster estimates to the block&apos;s
            probability distribution. No single number is promised; every
            output carries a range.
          </p>
          <p className="mt-8 frame text-[0.6rem] text-foreground-muted">
            {CLUSTERS.length} CLUSTERS · 1 FRAME · BLOCK 07
          </p>
          <p className="mt-2 frame text-[0.55rem] text-foreground-muted/70">
            ILLUSTRATIVE — WEIGHTS WITHIN PUBLISHED RANGES
          </p>
        </motion.aside>

        {/* Caption stack (bottom-left, cross-fades) */}
        <div className="pointer-events-none absolute bottom-14 left-6 z-30 h-10 w-[70%] lg:left-10">
          {CAPTIONS.map((c, i) => (
            <Caption key={i} caption={c} progress={scrollYProgress} />
          ))}
        </div>

        {/* Scroll progress bar, bottom */}
        <ProgressIndicator progress={scrollYProgress} />
      </div>
    </section>
  );
}

function ClusterDetection({
  cluster,
  index,
  progress,
}: {
  cluster: (typeof CLUSTERS)[number];
  index: number;
  progress: MotionValue<number>;
}) {
  const boxStart = 0.24 + index * 0.018;
  const boxOpacity = useTransform(
    progress,
    [boxStart, boxStart + 0.06, 0.82, 0.92],
    [0, 0.92, 0.92, 0.3]
  );
  const boxPathLength = useTransform(
    progress,
    [boxStart, boxStart + 0.09],
    [0, 1]
  );

  const weightStart = 0.6 + index * 0.022;
  const weightOpacity = useTransform(
    progress,
    [weightStart, weightStart + 0.04, 0.82, 0.92],
    [0, 1, 1, 0.45]
  );

  const labelX = Math.min(cluster.x + cluster.w + 1.5, 88);
  const labelY = cluster.y + 0.5;

  return (
    <>
      <motion.rect
        x={cluster.x}
        y={cluster.y}
        width={cluster.w}
        height={cluster.h}
        stroke="hsl(353 55% 55%)"
        strokeWidth={1.4}
        vectorEffect="non-scaling-stroke"
        fill="none"
        style={{ pathLength: boxPathLength, opacity: boxOpacity }}
      />
      <motion.text
        x={cluster.x + 0.6}
        y={cluster.y - 0.8}
        fontSize={1.35}
        fill="#F4ECE0"
        fontFamily="var(--font-frame), sans-serif"
        fontWeight={600}
        letterSpacing="0.12em"
        style={{ opacity: boxOpacity }}
      >
        {cluster.id}
      </motion.text>

      {/* Weight label group */}
      <motion.g style={{ opacity: weightOpacity }}>
        <line
          x1={cluster.x + cluster.w}
          y1={cluster.y + cluster.h / 2}
          x2={labelX - 0.4}
          y2={labelY + 1.2}
          stroke="#E8A13A"
          strokeWidth={0.22}
          vectorEffect="non-scaling-stroke"
          strokeDasharray="0.4 0.3"
        />
        <rect
          x={labelX - 0.5}
          y={labelY - 0.8}
          width={7.2}
          height={2.8}
          fill="rgba(14,11,8,0.82)"
          rx={0.3}
        />
        <text
          x={labelX + 0.2}
          y={labelY + 1.15}
          fontSize={1.7}
          fill="#E8A13A"
          fontFamily="var(--font-mono), monospace"
          fontWeight={500}
        >
          {cluster.weight}g
        </text>
      </motion.g>
    </>
  );
}

function Caption({
  caption,
  progress,
}: {
  caption: (typeof CAPTIONS)[number];
  progress: MotionValue<number>;
}) {
  const opacity = useTransform(
    progress,
    [caption.in - 0.03, caption.in, caption.out - 0.03, caption.out],
    [0, 1, 1, 0]
  );
  const y = useTransform(
    progress,
    [caption.in - 0.03, caption.in, caption.out - 0.03, caption.out],
    [14, 0, 0, -14]
  );

  return (
    <motion.p
      className="display absolute text-xl italic leading-tight text-foreground md:text-2xl lg:text-[1.65rem]"
      style={{ opacity, y }}
    >
      {caption.text}
    </motion.p>
  );
}

function ProgressIndicator({ progress }: { progress: MotionValue<number> }) {
  return (
    <div className="absolute bottom-6 left-6 right-6 z-30 h-px overflow-hidden bg-border/30 lg:left-10 lg:right-10">
      <motion.div
        className="h-full origin-left bg-burgundy"
        style={{ scaleX: progress }}
      />
    </div>
  );
}
