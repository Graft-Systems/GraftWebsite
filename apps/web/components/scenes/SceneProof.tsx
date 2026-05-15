"use client";

import { useRef } from "react";
import { motion, useInView } from "framer-motion";
import { SplitTextReveal } from "@/components/ui/SplitTextReveal";

export function SceneProof() {
  const ref = useRef<HTMLDivElement>(null);
  const inView = useInView(ref, { once: true, amount: 0.35 });

  // Smooth bell curve path, width 600 × height 200, y=0 is the baseline at bottom.
  // Using a gaussian-like cubic bezier approximation.
  const curveD =
    "M 10 190 " +
    "C 110 190, 180 190, 220 150 " +
    "C 260 110, 275 30, 300 20 " +
    "C 325 30, 340 110, 380 150 " +
    "C 420 190, 490 190, 590 190";

  return (
    <section
      id="proof"
      className="relative flex min-h-[100vh] w-full flex-col items-center justify-center overflow-hidden bg-background px-6 py-28 lg:py-36"
    >
      <div
        ref={ref}
        className="mx-auto flex w-full max-w-4xl flex-col items-center text-center"
      >
        <span className="frame text-[0.72rem] font-semibold text-sage">
          YIELD · THE PROOF
        </span>
        <h2 className="display mt-5 text-display-lg leading-[1.05] text-foreground">
          <SplitTextReveal text="Not one number." />
          <br />
          <SplitTextReveal text="A distribution." delay={0.2} />
        </h2>

        <motion.p
          initial={{ opacity: 0, y: 10 }}
          animate={inView ? { opacity: 1, y: 0 } : {}}
          transition={{ duration: 0.8, delay: 0.6 }}
          className="mx-auto mt-8 max-w-xl text-base leading-relaxed text-foreground/75 sm:text-lg"
        >
          For yield estimation, Graft returns a full probability curve for every
          estimate. Bear, base, and bull scenarios let teams plan for what&apos;s
          likely—not just what&apos;s possible. Other modules use the same habit:
          show the uncertainty the field actually carries.
        </motion.p>

        {/* Curve */}
        <svg
          viewBox="0 0 600 220"
          className="mt-16 w-full max-w-2xl"
          aria-hidden
        >
          {/* Axis baseline */}
          <motion.line
            x1={10}
            y1={195}
            x2={590}
            y2={195}
            stroke="hsl(var(--border))"
            strokeWidth={1}
            initial={{ pathLength: 0 }}
            animate={inView ? { pathLength: 1 } : {}}
            transition={{ duration: 0.8, delay: 0.9 }}
          />

          {/* Bell curve */}
          <motion.path
            d={curveD}
            fill="none"
            stroke="hsl(353 55% 55%)"
            strokeWidth={2.2}
            strokeLinecap="round"
            initial={{ pathLength: 0, opacity: 0 }}
            animate={inView ? { pathLength: 1, opacity: 0.95 } : {}}
            transition={{
              pathLength: { duration: 2.0, delay: 1.0, ease: [0.6, 0, 0.4, 1] },
              opacity: { duration: 0.6, delay: 1.0 },
            }}
          />

          {/* Tick markers for bear/base/bull */}
          {[
            { x: 170, color: "#6B8E5A" }, // sage bear
            { x: 300, color: "#F4ECE0" }, // off-white base
            { x: 430, color: "#E8A13A" }, // amber bull
          ].map((tick, i) => (
            <motion.line
              key={i}
              x1={tick.x}
              y1={192}
              x2={tick.x}
              y2={200}
              stroke={tick.color}
              strokeWidth={1.5}
              initial={{ opacity: 0 }}
              animate={inView ? { opacity: 0.9 } : {}}
              transition={{ duration: 0.4, delay: 2.4 + i * 0.15 }}
            />
          ))}
        </svg>

        {/* Labels */}
        <div className="mt-6 flex w-full max-w-2xl items-start justify-between px-4 lg:px-0">
          {[
            { label: "BEAR", color: "text-sage", delay: 2.6 },
            { label: "BASE", color: "text-foreground", delay: 2.75 },
            { label: "BULL", color: "text-amber", delay: 2.9 },
          ].map((l) => (
            <motion.span
              key={l.label}
              className={`numeric text-sm font-medium tracking-[0.08em] ${l.color}`}
              initial={{ opacity: 0, y: 6 }}
              animate={inView ? { opacity: 1, y: 0 } : {}}
              transition={{ duration: 0.5, delay: l.delay }}
            >
              {l.label}
            </motion.span>
          ))}
        </div>
      </div>
    </section>
  );
}
