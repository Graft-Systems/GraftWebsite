"use client";

import { cn } from "@/lib/utils";

type Mode = "basic" | "advanced";

export function ToolModeToggle({
  mode,
  onChange,
}: {
  mode: Mode;
  onChange: (next: Mode) => void;
}) {
  const next: Mode = mode === "basic" ? "advanced" : "basic";
  const label = mode === "basic" ? "Geospatial view" : "Simple view";

  return (
    <button
      type="button"
      onClick={() => onChange(next)}
      className={cn(
        "frame inline-flex items-center gap-2.5 rounded-sm border border-border/60 px-4 py-2.5 text-[0.62rem] font-semibold uppercase tracking-[0.14em]",
        "transition-colors hover:border-amber hover:text-amber",
        mode === "advanced" ? "text-amber border-amber/60" : "text-foreground/70"
      )}
      aria-label={`Switch to ${label}`}
    >
      {mode === "basic" ? (
        <svg
          width="13"
          height="13"
          viewBox="0 0 14 14"
          fill="none"
          stroke="currentColor"
          strokeWidth="1.3"
          aria-hidden
        >
          <path d="M2 4v8l3.5-1.5L8.5 12 12 10V2L8.5 4 5.5 2.5 2 4Z" strokeLinejoin="round" />
          <path d="M5.5 2.5v8M8.5 4v8" />
        </svg>
      ) : (
        <svg
          width="13"
          height="13"
          viewBox="0 0 14 14"
          fill="none"
          stroke="currentColor"
          strokeWidth="1.4"
          aria-hidden
        >
          <rect x="2" y="3" width="10" height="8" rx="1" />
          <path d="M2 6h10M6 3v8" />
        </svg>
      )}
      {label}
    </button>
  );
}
