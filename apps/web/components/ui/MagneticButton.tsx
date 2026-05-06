"use client";

import { useRef } from "react";
import Link from "next/link";
import { motion, useMotionValue, useSpring } from "framer-motion";
import { cn } from "@/lib/utils";

export function MagneticButton({
  href,
  children,
  className,
  strength = 0.25,
  "aria-label": ariaLabel,
}: {
  href: string;
  children: React.ReactNode;
  className?: string;
  strength?: number;
  "aria-label"?: string;
}) {
  const wrapRef = useRef<HTMLDivElement>(null);
  const mx = useMotionValue(0);
  const my = useMotionValue(0);
  const x = useSpring(mx, { damping: 22, stiffness: 160, mass: 0.5 });
  const y = useSpring(my, { damping: 22, stiffness: 160, mass: 0.5 });

  const handleMove = (e: React.MouseEvent<HTMLDivElement>) => {
    const el = wrapRef.current;
    if (!el) return;
    const rect = el.getBoundingClientRect();
    mx.set((e.clientX - rect.left - rect.width / 2) * strength);
    my.set((e.clientY - rect.top - rect.height / 2) * strength);
  };

  const handleLeave = () => {
    mx.set(0);
    my.set(0);
  };

  return (
    <motion.div
      ref={wrapRef}
      onMouseMove={handleMove}
      onMouseLeave={handleLeave}
      style={{ x, y }}
      className="inline-block will-change-transform motion-reduce:!transform-none"
    >
      <Link href={href} className={cn(className)} aria-label={ariaLabel}>
        {children}
      </Link>
    </motion.div>
  );
}
