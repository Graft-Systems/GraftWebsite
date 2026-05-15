"use client";

import Image from "next/image";
import { useRef } from "react";
import { motion, useScroll, useTransform } from "framer-motion";
import { SplitTextReveal } from "@/components/ui/SplitTextReveal";
import type { MarketingVariant } from "@/components/scenes/marketingVariant";

const SUITE_STATS = [
  {
    text: "Manual yield forecasting in current practice carries error of up to 30%, with block-level variance often exceeding that baseline.",
    source: "Ahmedt-Aristizabal et al., IEEE Access, 2024",
    parallax: 32,
  },
  {
    text: "In California alone, wineries spend roughly $239 million per year on powdery-mildew fungicides and application—often on a fixed calendar whether the block needs it or not.",
    source: "Sambucci, Alston & Fuller · UC Davis · 2014",
    parallax: 18,
  },
];

const YIELD_STATS = [
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

const COPY = {
  suite: {
    eyebrow: "THE STAKES",
    line1: "The vineyard runs",
    line2: "on partial sight.",
    stats: SUITE_STATS,
    quote:
      "If you make it within 5% accuracy, you are in business.",
    quoteSource: "Top vineyard manager · Kendall-Jackson",
  },
  yield: {
    eyebrow: "THE CHALLENGE",
    line1: "Yield forecasts",
    line2: "are guesses.",
    stats: YIELD_STATS,
    quote:
      "If you make it within 5% accuracy, you are in business.",
    quoteSource: "Top vineyard manager · Kendall-Jackson",
  },
} as const;

export function SceneProblem({
  variant = "suite",
}: {
  variant?: MarketingVariant;
}) {
  const copy = COPY[variant];
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
      <motion.div
        aria-hidden
        className="absolute inset-0"
        style={{ opacity: bgOpacity }}
      >
        <Image
          src="/photos/aerial/french-vineyard.jpg"
          alt=""
          fill
          sizes="100vw"
          className="object-cover"
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
            {copy.eyebrow}
          </motion.span>

          <h2 className="display mt-5 text-display-lg leading-[1.05] text-foreground">
            <SplitTextReveal text={copy.line1} />
            <br />
            <SplitTextReveal text={copy.line2} delay={0.2} />
          </h2>

          <motion.div className="mt-20 space-y-16">
            {copy.stats.map((stat, i) => (
              <Stat key={i} {...stat} />
            ))}
          </motion.div>

          <PullQuote quote={copy.quote} source={copy.quoteSource} />
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

function PullQuote({ quote, source }: { quote: string; source: string }) {
  return (
    <motion.blockquote
      className="mt-24 border-l-2 border-burgundy pl-6 md:pl-8"
      initial={{ opacity: 0, y: 18 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, margin: "-80px" }}
      transition={{ duration: 0.85, ease: [0.2, 0.9, 0.3, 1] }}
    >
      <p className="display text-2xl italic leading-snug text-foreground lg:text-[1.75rem]">
        &ldquo;{quote}&rdquo;
      </p>
      <footer className="mt-5 frame text-[0.62rem] text-foreground-muted">
        {source}
      </footer>
    </motion.blockquote>
  );
}
