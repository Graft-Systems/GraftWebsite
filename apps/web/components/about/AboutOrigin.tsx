"use client";

import Image from "next/image";
import { useRef } from "react";
import { motion, useInView } from "framer-motion";

export function AboutOrigin() {
  const ref = useRef<HTMLDivElement>(null);
  const inView = useInView(ref, { once: true, amount: 0.25 });

  return (
    <section className="relative w-full bg-background py-28 lg:py-36">
      <div
        ref={ref}
        className="mx-auto grid max-w-[1200px] grid-cols-1 gap-16 px-6 lg:grid-cols-[minmax(18rem,22rem)_1fr] lg:gap-24 lg:px-10"
      >
        {/* Left — Denis Toner endorsement */}
        <aside>
          <motion.blockquote
            initial={{ opacity: 0, y: 14 }}
            animate={inView ? { opacity: 1, y: 0 } : {}}
            transition={{ duration: 0.8 }}
            className="display text-[clamp(1.35rem,2.4vw,1.75rem)] italic leading-[1.2] text-foreground"
          >
            &ldquo;It really helps the viticulturist. The guy in the
            vineyard. This is the stuff they need to know.&rdquo;
          </motion.blockquote>

          <motion.div
            initial={{ opacity: 0 }}
            animate={inView ? { opacity: 1 } : {}}
            transition={{ duration: 0.5, delay: 0.35 }}
            className="relative mt-8 aspect-[4/5] overflow-hidden rounded-sm border border-border/60"
          >
            <Image
              src="/portrait/denis-toner.png"
              alt="Denis Toner"
              fill
              sizes="(max-width: 1024px) 100vw, 22rem"
              draggable={false}
              className="object-cover grayscale-[15%]"
            />
          </motion.div>

          <motion.div
            initial={{ opacity: 0, y: 8 }}
            animate={inView ? { opacity: 1, y: 0 } : {}}
            transition={{ duration: 0.6, delay: 0.5 }}
            className="mt-6"
          >
            <p className="display text-lg text-foreground">Denis Toner</p>
            <ul className="mt-4 space-y-2 text-[0.78rem] leading-relaxed text-foreground-muted">
              <li>Founder — Nantucket Wine Festival</li>
              <li>President — Nantucket/Beaune Jumelage Committee</li>
              <li>Chevalier — Mérite Agricole</li>
              <li>Chevalier — Confrèrie des Chevalier du Tastevin</li>
            </ul>
          </motion.div>
        </aside>

        {/* Right — Why Graft exists */}
        <div>
          <motion.span
            initial={{ opacity: 0 }}
            animate={inView ? { opacity: 1 } : {}}
            transition={{ duration: 0.5 }}
            className="frame text-[0.72rem] font-semibold text-sage"
          >
            ORIGIN
          </motion.span>

          <motion.h2
            initial={{ opacity: 0, y: 14 }}
            animate={inView ? { opacity: 1, y: 0 } : {}}
            transition={{ duration: 0.8, delay: 0.15 }}
            className="display mt-5 text-display-lg leading-[1.1] text-foreground"
          >
            Why Graft exists.
          </motion.h2>

          <div className="mt-10 space-y-6 text-base leading-relaxed text-foreground/80 sm:text-lg">
            {[
              "Graft started in an attic in Ann Arbor, after a conversation in a Bordeaux tasting room. Benson had been sitting with Aymeric De Gironde, head winemaker at Chateau Troplong Mondot, and walked away sure of one thing: this craft was too old, too careful, and too exposed to be running on pre-harvest guesswork.",
              "A few months later, he and Jacob started prototyping. Michigan Build & Launch gave the idea a deadline. Market research gave it a focus: the Powdery Mildew problem kept coming up in every grower conversation across Burgundy, Bordeaux, Napa, and Sonoma.",
              "The solution took shape fast, with over 16 wineries validating a need for plot specific spray forecasts that could replace costly fixed calendar sprays. Soon after, we were invited to the America 250 Startup Competition and won $25,000 in front of a legendary panel of judges like Sarah Friar (CFO, OpenAI), Chris Larsen (Chairman, Ripple), Tim Draper (Founder, Draper Associates), and Rosie Rios (Former U.S. Treasurer).",
              "Graft isn't a winemaker's assistant. It doesn't touch the creative work. It just makes the logistics, like not knowing when you should spray your crops, something you can anticipate.",
            ].map((para, i) => (
              <motion.p
                key={i}
                initial={{ opacity: 0, y: 14 }}
                animate={inView ? { opacity: 1, y: 0 } : {}}
                transition={{
                  duration: 0.7,
                  delay: 0.3 + i * 0.1,
                  ease: [0.2, 0.9, 0.3, 1],
                }}
              >
                {para}
              </motion.p>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}
