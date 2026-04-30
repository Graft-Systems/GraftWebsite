"use client";

import { useRef } from "react";
import { motion, useScroll, useTransform } from "framer-motion";
import { SplitTextReveal } from "@/components/ui/SplitTextReveal";

const STATS = [
  {
    text: "Manual yield forecasting in current practice carries error of up to 30%, with block-level variance often exceeding that baseline.",
    source: "Ahmedt-Aristizabal et al., IEEE Access, 2024",
    parallax: 32,
  },
  {
    text: "Traditional manual cluster-count sampling averages 7.9% error across seasons and cultivars, with maximum errors reaching 23.5%.",
    source: "Jaramillo et al., 2021",
    parallax: 18,
  },
];

export function SceneProblem() {
  const sectionRef = useRef<HTMLElement>(null);
  const { scrollYProgress } = useScroll({
    target: sectionRef,
    offset: ["start end", "end start"],
  });
  const bgOpacity = useTransform(scrollYProgress, [0, 0.5, 1], [0.02, 0.15, 0.02]);

  return (
    <section
      ref={sectionRef}
      id="problem"
      className="relative w-full overflow-hidden bg-background py-32 lg:py-44"
    >
      {/* Echoed vineyard, heavily dimmed */}
      <motion.div
        aria-hidden
        className="absolute inset-0"
        style={{ opacity: bgOpacity }}
      >
        <img
          src="/photos/aerial/french-vineyard.jpg"
          alt=""
          className="h-full w-full object-cover"
          style={{ filter: "saturate(0.55) contrast(1.1) brightness(0.55)" }}
        />
      </motion.div>
      <div
        aria-hidden
        className="absolute inset-0 bg-gradient-to-b from-background via-background/70 to-background"
      />

      <div className="relative z-10 mx-auto max-w-[1400px] px-6 lg:px-10">
        <div className="mx-auto max-w-3xl">
          <motion.span
            className="frame text-[0.72rem] font-semibold text-sage"
            initial={{ opacity: 0, y: 6 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true, margin: "-120px" }}
            transition={{ duration: 0.55 }}
          >
            THE PROBLEM
          </motion.span>

          <h2 className="display mt-5 text-display-lg leading-[1.05] text-foreground">
            <SplitTextReveal text="Yield forecasts" />
            <br />
            <SplitTextReveal text="are guesses." delay={0.2} />
          </h2>

          <div className="mt-20 space-y-16">
            {STATS.map((stat, i) => (
              <Stat key={i} {...stat} />
            ))}
          </div>

          <PullQuote />
        </div>
      </div>
    </section>
  );
}

function Stat({
  text,
  source,
  parallax,
}: {
  text: string;
  source: string;
  parallax: number;
}) {
  const ref = useRef<HTMLDivElement>(null);
  const { scrollYProgress } = useScroll({
    target: ref,
    offset: ["start end", "end start"],
  });
  const y = useTransform(scrollYProgress, [0, 1], [parallax, -parallax]);

  return (
    <motion.div ref={ref} style={{ y }} className="motion-reduce:!transform-none">
      <motion.div
        initial={{ opacity: 0, y: 22 }}
        whileInView={{ opacity: 1, y: 0 }}
        viewport={{ once: true, margin: "-100px" }}
        transition={{ duration: 0.75, ease: [0.2, 0.9, 0.3, 1] }}
      >
        <p className="text-lg leading-relaxed text-foreground/85 sm:text-xl lg:text-[1.35rem]">
          {text}
        </p>
        <p className="mt-4 frame text-[0.62rem] text-foreground-muted">
          {source}
        </p>
      </motion.div>
    </motion.div>
  );
}

function PullQuote() {
  return (
    <motion.blockquote
      className="mt-24 border-l-2 border-burgundy pl-6 md:pl-8"
      initial={{ opacity: 0, y: 18 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, margin: "-80px" }}
      transition={{ duration: 0.85, ease: [0.2, 0.9, 0.3, 1] }}
    >
      <p className="display text-2xl italic leading-snug text-foreground lg:text-[1.75rem]">
        &ldquo;Current methods are labour-intensive, costly, and lack spatial
        coverage, reducing accuracy and cost-efficiency.&rdquo;
      </p>
      <footer className="mt-5 frame text-[0.62rem] text-foreground-muted">
        Ahmedt-Aristizabal et al. · IEEE Access (2024)
      </footer>
    </motion.blockquote>
  );
}
