"use client";

import Image from "next/image";
import { motion } from "framer-motion";
import { SplitTextReveal } from "@/components/ui/SplitTextReveal";

export function AboutHero() {
  return (
    <section className="relative flex h-[78vh] min-h-[560px] w-full items-end overflow-hidden bg-background">
      <div className="absolute inset-0">
        <Image
          src="/photos/aerial/sunset-vineyard.jpg"
          alt=""
          fill
          priority
          sizes="100vw"
          aria-hidden
          draggable={false}
          className="object-cover animate-ken-burns motion-reduce:animate-none"
          style={{ filter: "saturate(0.85) brightness(0.62)" }}
        />
      </div>
      <div
        aria-hidden
        className="absolute inset-0 bg-gradient-to-b from-background/30 via-transparent to-background"
      />

      <div className="relative z-10 mx-auto w-full max-w-[1400px] px-6 pb-16 lg:px-10 lg:pb-24">
        <motion.span
          className="frame text-[0.72rem] font-semibold text-sage"
          initial={{ opacity: 0, y: 6 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, delay: 0.3 }}
        >
          ABOUT
        </motion.span>
        <h1 className="display mt-4 max-w-3xl text-display-xl leading-[1.02] text-foreground">
          <SplitTextReveal text="The uncertainty" delay={0.4} immediate />
          <br />
          <SplitTextReveal text="of harvest." delay={0.65} immediate />
        </h1>
        <motion.p
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8, delay: 1.4 }}
          className="mt-6 max-w-xl text-base text-foreground/75 sm:text-lg"
        >
          A working vineyard makes a thousand decisions before fermentation.
          Graft exists to make the most consequential ones – like spraying for
          Powdery Mildew – less of a guess.
        </motion.p>
      </div>
    </section>
  );
}
