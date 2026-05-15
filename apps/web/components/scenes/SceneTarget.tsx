"use client";

import { useRef } from "react";
import { motion, useInView } from "framer-motion";
import { SplitTextReveal } from "@/components/ui/SplitTextReveal";
import type { MarketingVariant } from "@/components/scenes/marketingVariant";

const COPY = {
  suite: {
    eyebrow: "YIELD · WHERE WE'RE HEADED",
    headline1: "Tighter bands",
    headline2: "at the block.",
    body: "Published work still puts manual yield forecasting error in the double digits at the block scale (Ahmedt-Aristizabal et al., 2024). We are engineering toward a much tighter band—while MVPs ship with explicit ranges so no one plans on a false single number.",
    tagline: "Precision without pretending we are finished.",
    manualLabel: "TYPICAL MANUAL FORECAST",
    manualSub: "High double-digit error risk",
    graftLabel: "GRAFT ENGINEERING GOAL",
    graftSub: "Block-level · low single digits",
    footnote:
      "Baseline reference · Ahmedt-Aristizabal et al. (2024), IEEE Access · goal is directional while we validate in the field",
  },
  yield: {
    eyebrow: "THE TARGET",
    headline1: "Within 5%.",
    headline2: "Not 30.",
    body: "The current industry baseline for manual yield forecasting runs up to 30% error (Ahmedt-Aristizabal et al., 2024). Graft is engineered toward ±5% error at the block level, with probabilistic output at every granularity.",
    tagline: "Precision by design.",
    manualLabel: "MANUAL FORECAST",
    manualSub: "±30% error",
    graftLabel: "GRAFT TARGET",
    graftSub: "±5% error",
    footnote: "SOURCE · AHMEDT-ARISTIZABAL ET AL. (2024). IEEE Access.",
  },
} as const;

export function SceneTarget({
  variant = "suite",
}: {
  variant?: MarketingVariant;
}) {
  const copy = COPY[variant];
  const ref = useRef<HTMLDivElement>(null);
  const inView = useInView(ref, { once: true, amount: 0.3 });

  return (
    <section
      id="target"
      className="relative min-h-[100vh] w-full overflow-hidden bg-background py-28 lg:py-36"
    >
      <motion.div
        ref={ref}
        className="mx-auto grid max-w-[1200px] grid-cols-1 items-center gap-16 px-6 lg:grid-cols-[1fr_1fr] lg:gap-20 lg:px-10"
      >
        <motion.div>
          <span className="frame text-[0.72rem] font-semibold text-sage">
            {copy.eyebrow}
          </span>
          <h2 className="display mt-5 text-display-lg leading-[1.02] text-foreground">
            <SplitTextReveal text={copy.headline1} />
            <br />
            <SplitTextReveal text={copy.headline2} delay={0.22} />
          </h2>

          <motion.p
            initial={{ opacity: 0, y: 10 }}
            animate={inView ? { opacity: 1, y: 0 } : {}}
            transition={{ duration: 0.8, delay: 0.6 }}
            className="mt-8 max-w-md text-base leading-relaxed text-foreground/75 sm:text-lg"
          >
            {copy.body}
          </motion.p>

          <motion.p
            initial={{ opacity: 0 }}
            animate={inView ? { opacity: 1 } : {}}
            transition={{ duration: 0.8, delay: 1.6 }}
            className="display mt-12 text-xl italic text-foreground/90 lg:text-2xl"
          >
            {copy.tagline}
          </motion.p>
        </motion.div>

        <div className="flex flex-col gap-10 lg:pl-6">
          <BarRow
            label={copy.manualLabel}
            sub={copy.manualSub}
            color="hsl(var(--sage))"
            width={1}
            delay={0.9}
            inView={inView}
            bgOpacity={0.4}
          />
          <BarRow
            label={copy.graftLabel}
            sub={copy.graftSub}
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
            {copy.footnote}
          </motion.p>
        </div>
      </motion.div>
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
    <motion.div>
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
    </motion.div>
  );
}
