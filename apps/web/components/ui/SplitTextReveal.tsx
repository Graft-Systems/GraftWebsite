"use client";

import { useRef } from "react";
import { motion, useInView } from "framer-motion";
import { cn } from "@/lib/utils";

export function SplitTextReveal({
  text,
  delay = 0,
  className,
  wordClassName,
  duration = 0.85,
  once = true,
  immediate = false,
}: {
  text: string;
  delay?: number;
  className?: string;
  wordClassName?: string;
  duration?: number;
  once?: boolean;
  immediate?: boolean;
}) {
  const ref = useRef<HTMLSpanElement>(null);
  const inView = useInView(ref, { once, amount: 0.15 });
  const play = immediate || inView;

  const words = text.split(" ");
  return (
    <span ref={ref} className={cn("inline", className)} aria-label={text}>
      {words.map((word, i) => (
        <span
          key={i}
          aria-hidden
          className={cn(
            "inline-block overflow-hidden align-bottom leading-[1.05]",
            wordClassName
          )}
          style={{ paddingBottom: "0.05em" }}
        >
          <motion.span
            className="inline-block"
            initial={{ y: "110%" }}
            animate={play ? { y: "0%" } : { y: "110%" }}
            transition={{
              duration,
              delay: play ? delay + i * 0.08 : 0,
              ease: [0.2, 0.9, 0.3, 1],
            }}
          >
            {word}
            {i < words.length - 1 ? "\u00A0" : ""}
          </motion.span>
        </span>
      ))}
    </span>
  );
}
