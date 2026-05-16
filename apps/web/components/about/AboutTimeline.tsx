"use client";

import { useRef } from "react";
import { motion, useInView } from "framer-motion";

type Milestone = {
  date: string;
  title: string;
  description: string;
  future?: boolean;
};

const MILESTONES: Milestone[] = [
  {
    date: "Jun 2025",
    title: "Bordeaux conversation",
    description:
      "Benson meets Aymeric De Gironde at Chateau Troplong Mondot. Leaves convinced the winemaking industry needs to innovate.",
  },
  {
    date: "Nov 2025",
    title: "The attic",
    description:
      "Benson and Jacob start prototyping in the attic of their house in Ann Arbor. Graft Systems is born.",
  },
  {
    date: "Jan 2026",
    title: "Michigan Build & Launch",
    description:
      "Selected for the Michigan Build & Launch accelerator. The concept becomes a working prototype.",
  },
  {
    date: "Feb 2026",
    title: "First winery conversations",
    description:
      "Interviews with Napa and Sonoma winemakers shape the product. Yield estimation surfaces as the consistent pain.",
  },
  {
    date: "Mar 2026",
    title: "Fungicide Management",
    description:
      "Learning to anticipate when wineries should and shouldn't spray their vineyards with fungicide to combat mildew becomes the focus.",
  },
  {
    date: "May 2026",
    title: "On-site visits",
    description:
      "Meeting winemakers where they work — walking rows, understanding workflows, refining the tool in the field.",
    future: true,
  },
  {
    date: "Aug 2026",
    title: "Ground truth",
    description:
      "Collecting real harvest data to validate and improve the model against actual yields.",
    future: true,
  },
  {
    date: "Nov 2026",
    title: "Launch",
    description:
      "A working and integrated platform that provides live weather feeds with models and sensory data to provide actionable spray recommendations long before sporulation",
    future: true,
  },
];

export function AboutTimeline() {
  return (
    <section className="relative w-full overflow-hidden bg-surface py-28 lg:py-36">
      <div className="mx-auto max-w-[1100px] px-6 lg:px-10">
        <span className="frame text-[0.72rem] font-semibold text-sage">
          TIMELINE
        </span>
        <h2 className="display mt-5 text-display-lg text-foreground">
          Where it came from.
          <br />
          Where it&apos;s going.
        </h2>

        <div className="relative mt-16">
          {/* Vertical rail */}
          <div
            aria-hidden
            className="absolute left-3 top-0 h-full w-px bg-border/80 md:left-[calc(14rem+0.75rem)]"
          />
          <div className="space-y-12">
            {MILESTONES.map((m, i) => (
              <MilestoneRow key={m.date} milestone={m} index={i} />
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}

function MilestoneRow({
  milestone,
  index,
}: {
  milestone: Milestone;
  index: number;
}) {
  const ref = useRef<HTMLDivElement>(null);
  const inView = useInView(ref, { once: true, amount: 0.5 });
  const dotColor = milestone.future ? "hsl(var(--sage))" : "hsl(var(--burgundy))";

  return (
    <motion.div
      ref={ref}
      initial={{ opacity: 0, y: 18 }}
      animate={inView ? { opacity: 1, y: 0 } : {}}
      transition={{ duration: 0.7, delay: 0.05 * index, ease: [0.2, 0.9, 0.3, 1] }}
      className="relative grid grid-cols-[auto_1fr] gap-6 md:grid-cols-[14rem_1fr] md:gap-8"
    >
      <div className="md:text-right">
        <span className="numeric text-sm uppercase tracking-[0.12em] text-foreground-muted">
          {milestone.date}
        </span>
      </div>
      <div className="relative pl-8 md:pl-10">
        {/* Dot */}
        <motion.span
          className="absolute left-0 top-2 block h-2.5 w-2.5 -translate-x-1/2 rounded-full border"
          style={{
            backgroundColor: dotColor,
            borderColor: dotColor,
            left: 0,
          }}
          initial={{ scale: 0 }}
          animate={inView ? { scale: 1 } : {}}
          transition={{ duration: 0.4, delay: 0.2 + 0.05 * index }}
        />
        <h3 className="text-lg font-semibold text-foreground">
          {milestone.title}
          {milestone.future && (
            <span className="ml-3 align-middle frame text-[0.55rem] text-sage">
              PLANNED
            </span>
          )}
        </h3>
        <p className="mt-2 max-w-xl text-sm leading-relaxed text-foreground/70">
          {milestone.description}
        </p>
      </div>
    </motion.div>
  );
}
