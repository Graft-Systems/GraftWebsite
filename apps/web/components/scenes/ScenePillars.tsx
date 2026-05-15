"use client";

import Link from "next/link";
import { motion } from "framer-motion";
import { SplitTextReveal } from "@/components/ui/SplitTextReveal";

const PILLARS = [
  {
    title: "Yield estimation",
    status: "In development",
    statusTone: "amber" as const,
    body: "Imagery-driven previews from cluster to block. MVPs live; we are iterating on workflows and accuracy with early partners.",
    href: "/tool",
    cta: "Try the yield preview",
  },
  {
    title: "Powdery mildew spray intelligence",
    status: "In development",
    statusTone: "amber" as const,
    body: "Graft Spray helps teams reason about when to spray—not just whether to—using fused weather and disease pressure signals, co-designed with working wineries.",
    href: "/spray",
    cta: "Explore Graft Spray",
  },
  {
    title: "UV-C canopy grid",
    status: "Research",
    statusTone: "sage" as const,
    body: "We are studying how structured UV-C coverage could complement chemistry in the canopy. Not a shipping product—talk to us if you want to explore the direction.",
    href: "/contact",
    cta: "Ask about research",
  },
];

export function ScenePillars() {
  return (
    <section
      id="pillars"
      className="relative w-full scroll-mt-20 bg-background py-28 lg:py-36"
    >
      <div className="mx-auto max-w-[1400px] px-6 lg:px-10">
        <div className="max-w-3xl">
          <motion.span
            className="frame text-[0.72rem] font-semibold text-sage"
            initial={{ opacity: 0, y: 6 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true, margin: "-120px" }}
            transition={{ duration: 0.55 }}
          >
            THE SUITE
          </motion.span>
          <h2 className="display mt-5 text-display-lg leading-[1.05] text-foreground">
            <SplitTextReveal text="A suite of tools for modern wineries." />
          </h2>
          <motion.p
            initial={{ opacity: 0, y: 8 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true, margin: "-100px" }}
            transition={{ duration: 0.75, delay: 0.15 }}
            className="mt-6 max-w-2xl text-base leading-relaxed text-foreground/75 sm:text-lg"
          >
            Graft Yield, Graft Spray, and Graft UV-C research each have their own
            roadmap. Together they are the suite we are building with wineries:
            quantitative where it helps, honest about maturity, and shaped in the field.
          </motion.p>
        </div>

        <div className="mt-20 grid grid-cols-1 gap-8 lg:grid-cols-3 lg:gap-10">
          {PILLARS.map((p, i) => (
            <motion.article
              key={p.title}
              initial={{ opacity: 0, y: 22 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true, margin: "-80px" }}
              transition={{
                duration: 0.65,
                delay: 0.1 + i * 0.12,
                ease: [0.2, 0.9, 0.3, 1],
              }}
              className="flex flex-col border border-border/50 bg-surface/40 p-8 backdrop-blur-sm"
            >
              <span
                className={`frame inline-flex w-fit rounded-sm px-2.5 py-1 text-[0.58rem] font-semibold uppercase tracking-[0.12em] ${
                  p.statusTone === "amber"
                    ? "bg-amber/15 text-amber"
                    : "bg-sage/15 text-sage"
                }`}
              >
                {p.status}
              </span>
              <h3 className="mt-6 text-xl font-semibold leading-snug text-foreground">
                {p.title}
              </h3>
              <p className="mt-4 flex-1 text-sm leading-relaxed text-foreground/70">
                {p.body}
              </p>
              <Link
                href={p.href}
                className="frame mt-8 inline-flex items-center gap-2 text-[0.68rem] font-semibold uppercase tracking-[0.12em] text-foreground/85 transition-colors hover:text-amber"
              >
                {p.cta}
                <span aria-hidden className="text-amber">
                  →
                </span>
              </Link>
            </motion.article>
          ))}
        </div>
      </div>
    </section>
  );
}
