"use client";

import { useRef } from "react";
import { motion, useInView } from "framer-motion";
import { SplitTextReveal } from "@/components/ui/SplitTextReveal";

export function SceneTarget() {
  const ref = useRef<HTMLDivElement>(null);
  const inView = useInView(ref, { once: true, amount: 0.3 });

  return (
    <section
      id="target"
      className="relative min-h-[100vh] w-full overflow-hidden bg-background py-28 lg:py-36"
    >
      <div
        ref={ref}
        className="mx-auto grid max-w-[1200px] grid-cols-1 items-center gap-16 px-6 lg:grid-cols-[1fr_1fr] lg:gap-20 lg:px-10"
      >
        {/* Left column — typographic statement */}
        <div>
          <span className="frame text-[0.72rem] font-semibold text-sage">
            THE TARGET
          </span>
          <h2 className="display mt-5 text-display-lg leading-[1.02] text-foreground">
            <SplitTextReveal text="Within 5%." />
            <br />
            <SplitTextReveal text="Not 30." delay={0.22} />
          </h2>

          <motion.p
            initial={{ opacity: 0, y: 10 }}
            animate={inView ? { opacity: 1, y: 0 } : {}}
            transition={{ duration: 0.8, delay: 0.6 }}
            className="mt-8 max-w-md text-base leading-relaxed text-foreground/75 sm:text-lg"
          >
            The industry baseline for manual yield forecasting is ±20 to 30%
            error (Dunn and Martin, 2004). Graft is engineered toward 95%
            accuracy at the block level, with probabilistic output at every
            granularity.
          </motion.p>

          <motion.p
            initial={{ opacity: 0 }}
            animate={inView ? { opacity: 1 } : {}}
            transition={{ duration: 0.8, delay: 1.6 }}
            className="display mt-12 text-xl italic text-foreground/90 lg:text-2xl"
          >
            Precision by design.
          </motion.p>
        </div>

        {/* Right column — comparison bars */}
        <div className="flex flex-col gap-10 lg:pl-6">
          <BarRow
            label="MANUAL FORECAST"
            sub="±30% error"
            color="hsl(var(--sage))"
            width={1}
            delay={0.9}
            inView={inView}
            bgOpacity={0.4}
          />
          <BarRow
            label="GRAFT TARGET"
            sub="±5% error"
            color="hsl(var(--burgundy))"
            width={0.17}
            delay={1.35}
            inView={inView}
            bgOpacity={1}
          />

          <motion.p
            initial={{ opacity: 0 }}
            animate={inView ? { opacity: 1 } : {}}
            transition={{ duration: 0.6, delay: 1.8 }}
            className="frame pt-6 text-[0.6rem] text-foreground-muted"
          >
            SOURCE · DUNN AND MARTIN (2004). Australian Journal of Grape and
            Wine Research, 10(3), 196–198.
          </motion.p>
        </div>
      </div>
    </section>
  );
}

function BarRow({
  label,
  sub,
  color,
  width,
  delay,
  inView,
  bgOpacity,
}: {
  label: string;
  sub: string;
  color: string;
  width: number;
  delay: number;
  inView: boolean;
  bgOpacity: number;
}) {
  return (
    <div>
      <div className="mb-3 flex items-baseline justify-between">
        <span className="frame text-[0.62rem] text-foreground-muted">
          {label}
        </span>
        <span className="numeric text-sm text-foreground">{sub}</span>
      </div>
      <div className="relative h-2 w-full overflow-hidden bg-surface">
        <motion.div
          className="absolute left-0 top-0 h-full origin-left"
          style={{ backgroundColor: color, opacity: bgOpacity }}
          initial={{ scaleX: 0 }}
          animate={inView ? { scaleX: width } : {}}
          transition={{ duration: 1.1, delay, ease: [0.2, 0.9, 0.3, 1] }}
        />
      </div>
    </div>
  );
}
