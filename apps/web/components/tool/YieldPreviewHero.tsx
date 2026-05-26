"use client";

import Image from "next/image";
import { motion } from "framer-motion";
import { MagneticButton } from "@/components/ui/MagneticButton";
import { SplitTextReveal } from "@/components/ui/SplitTextReveal";

/** Full-viewport hero for the Yield Preview page (restored from the former homepage opener). */
export function YieldPreviewHero() {
  return (
    <section
      id="yield-hero"
      className="relative h-[100svh] w-full overflow-hidden bg-background"
    >
      <div className="absolute inset-0">
        <Image
          src="/photos/aerial/landing-page.jpg"
          alt=""
          fill
          priority
          sizes="100vw"
          draggable={false}
          className="object-cover animate-ken-burns motion-reduce:animate-none"
          style={{
            filter: "saturate(0.92) contrast(1.06) brightness(0.82)",
          }}
        />
      </div>

      <div
        aria-hidden
        className="absolute inset-0 bg-gradient-to-b from-background/20 via-transparent to-background/80"
      />
      <div
        aria-hidden
        className="absolute inset-0"
        style={{
          background:
            "radial-gradient(ellipse 80% 60% at 50% 40%, transparent 40%, rgba(14,11,8,0.55) 100%)",
        }}
      />

      <div className="absolute inset-x-0 bottom-0 z-10 pb-[10vh] md:pb-[12vh]">
        <div className="mx-auto grid max-w-[1400px] grid-cols-1 gap-8 px-6 md:grid-cols-[1fr_auto] md:items-end md:gap-16 lg:px-10">
          <div className="max-w-2xl">
            <h1 className="display text-display-xl leading-[1.02] text-foreground">
              <SplitTextReveal text="Know your yield" delay={0.35} immediate />
              <br />
              <SplitTextReveal text="before you harvest." delay={0.6} immediate />
            </h1>
            <motion.p
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.9, delay: 2.5, ease: [0.2, 0.9, 0.3, 1] }}
              className="mt-6 max-w-md text-base text-foreground/75 sm:text-lg"
            >
              Yield estimates at the block, row, and vine.
            </motion.p>
          </div>

          <motion.div
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8, delay: 3.0, ease: [0.2, 0.9, 0.3, 1] }}
            className="md:self-end"
          >
            <MagneticButton
              href="#yield-upload"
              className="frame group inline-flex items-center gap-3 rounded-sm bg-burgundy px-7 py-3.5 text-[0.72rem] font-semibold uppercase tracking-[0.14em] text-foreground transition-colors hover:bg-[#8F2433]"
            >
              See it live
              <svg
                width="13"
                height="13"
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
      </div>

      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ duration: 1, delay: 3.8 }}
        className="absolute bottom-5 left-1/2 -translate-x-1/2 flex flex-col items-center gap-2 motion-reduce:hidden"
      >
        <span className="frame text-[0.55rem] text-foreground/40">scroll</span>
        <motion.span
          animate={{ y: [0, 4, 0] }}
          transition={{ duration: 2, repeat: Infinity, ease: "easeInOut" }}
          className="h-4 w-px bg-foreground/30"
        />
      </motion.div>
    </section>
  );
}
