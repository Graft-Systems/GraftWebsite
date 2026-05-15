"use client";

import { motion } from "framer-motion";
import { SplitTextReveal } from "@/components/ui/SplitTextReveal";
import { MagneticButton } from "@/components/ui/MagneticButton";

export function SceneAsk() {
  return (
    <section
      id="ask"
      className="relative flex flex-col items-center justify-center bg-background px-6 pb-20 pt-10 md:pb-24 md:pt-12"
    >
      <div className="mx-auto w-full max-w-3xl text-center">
        <h2 className="display text-display-xl leading-[1.05] text-foreground">
          <SplitTextReveal text="Start with a product" />
          <br />
          <SplitTextReveal text="or say hello." delay={0.2} />
        </h2>

        <motion.p
          initial={{ opacity: 0 }}
          whileInView={{ opacity: 0.65 }}
          viewport={{ once: true, margin: "-60px" }}
          transition={{ duration: 0.8, delay: 0.6 }}
          className="mx-auto mt-6 max-w-2xl text-base text-foreground/70 sm:text-lg"
        >
          Whether you want to pressure-test the yield preview, co-develop spray
          intelligence, or ask about UV-C research—we answer the same inbox.
        </motion.p>

        <motion.div
          initial={{ opacity: 0, y: 10 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, margin: "-60px" }}
          transition={{ duration: 0.85, delay: 0.85, ease: [0.2, 0.9, 0.3, 1] }}
          className="mt-12 flex justify-center"
        >
          <MagneticButton
            href="/contact"
            className="frame group inline-flex items-center justify-center gap-3 rounded-sm bg-burgundy px-10 py-4 text-[0.78rem] font-semibold uppercase tracking-[0.14em] text-foreground transition-colors hover:bg-[#8F2433]"
          >
            Talk to the team
            <svg
              width="14"
              height="14"
              viewBox="0 0 14 14"
              fill="none"
              stroke="currentColor"
              strokeWidth="1.5"
              className="transition-transform duration-300 group-hover:translate-x-1"
            >
              <path d="M4 7h6M8 4l3 3-3 3" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
          </MagneticButton>
        </motion.div>

      </div>
    </section>
  );
}
