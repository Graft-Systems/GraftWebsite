"use client";

import { useRef } from "react";
import { motion, useInView } from "framer-motion";
import { SplitTextReveal } from "@/components/ui/SplitTextReveal";

const PRINCIPLES = [
  {
    title: "Science where it belongs",
    body: "Yield models lean on aggregated academic cluster data; spray intelligence follows published disease models and fused weather. We do not paper over the science with marketing curves.",
    icon: OpenSourceIcon,
  },
  {
    title: "Honest uncertainty",
    body: "Where the field is noisy—tonnage, timing, canopy treatments—we show ranges and scenarios instead of false precision. Same habit across yield, spray, and future UV-C work.",
    icon: DistributionIcon,
  },
  {
    title: "Built with wineries",
    body: "Spray workflows and yield previews are co-developed with working cellars and vineyard teams. If it does not survive a real season, it does not ship.",
    icon: HandshakeIcon,
  },
];

export function SceneApproach() {
  const ref = useRef<HTMLDivElement>(null);
  const inView = useInView(ref, { once: true, amount: 0.2 });

  return (
    <section
      id="approach"
      className="relative w-full overflow-hidden bg-background py-28 lg:py-36"
    >
      <div
        ref={ref}
        className="mx-auto max-w-[1200px] px-6 lg:px-10"
      >
        <div className="max-w-3xl">
          <span className="frame text-[0.72rem] font-semibold text-sage">
            HOW WE BUILD
          </span>
          <h2 className="display mt-5 text-[clamp(1.75rem,3.5vw,2.5rem)] leading-[1.1] text-foreground">
            <SplitTextReveal text="One standard" />
            <br />
            <SplitTextReveal text="across the suite." delay={0.2} />
          </h2>
        </div>

        <div className="mt-20 grid grid-cols-1 gap-10 md:grid-cols-3 md:gap-8 lg:gap-14">
          {PRINCIPLES.map((p, i) => (
            <motion.div
              key={p.title}
              initial={{ opacity: 0, y: 24 }}
              animate={inView ? { opacity: 1, y: 0 } : {}}
              transition={{
                duration: 0.7,
                delay: 0.3 + i * 0.15,
                ease: [0.2, 0.9, 0.3, 1],
              }}
              className="flex flex-col"
            >
              <p.icon className="h-8 w-8 text-burgundy" />
              <h3 className="mt-5 text-lg font-semibold text-foreground">
                {p.title}
              </h3>
              <p className="mt-3 text-sm leading-relaxed text-foreground/70">
                {p.body}
              </p>
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  );
}

function OpenSourceIcon(props: React.SVGProps<SVGSVGElement>) {
  return (
    <svg viewBox="0 0 32 32" fill="none" stroke="currentColor" strokeWidth={1.3} {...props}>
      <circle cx={16} cy={16} r={10} />
      <path d="M12 16 L14.8 18.8 L20 13.6" strokeLinecap="round" strokeLinejoin="round" />
      <path d="M16 6 L16 2 M16 30 L16 26 M26 16 L30 16 M2 16 L6 16" strokeLinecap="round" />
    </svg>
  );
}

function DistributionIcon(props: React.SVGProps<SVGSVGElement>) {
  return (
    <svg viewBox="0 0 32 32" fill="none" stroke="currentColor" strokeWidth={1.3} {...props}>
      <path d="M3 24 C 8 24, 11 24, 13 18 C 15 8, 17 8, 19 18 C 21 24, 24 24, 29 24" strokeLinecap="round" />
      <line x1={3} y1={26.5} x2={29} y2={26.5} strokeLinecap="round" />
      <circle cx={10} cy={26} r={1} fill="currentColor" />
      <circle cx={16} cy={26} r={1} fill="currentColor" />
      <circle cx={22} cy={26} r={1} fill="currentColor" />
    </svg>
  );
}

function HandshakeIcon(props: React.SVGProps<SVGSVGElement>) {
  return (
    <svg viewBox="0 0 32 32" fill="none" stroke="currentColor" strokeWidth={1.3} {...props}>
      <path d="M4 12 L10 8 L16 12 L22 8 L28 12" strokeLinejoin="round" />
      <path d="M4 12 L4 22 L10 26 L16 22 L22 26 L28 22 L28 12" strokeLinejoin="round" />
      <path d="M16 12 L16 22" strokeLinecap="round" />
    </svg>
  );
}
