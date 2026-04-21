"use client";

import { useEffect, useState } from "react";
import { ToolBasic } from "@/components/tool/ToolBasic";
import { ToolAdvanced } from "@/components/tool/ToolAdvanced";
import { ToolModeToggle } from "@/components/tool/ToolModeToggle";

type Mode = "basic" | "advanced";
const STORAGE_KEY = "graft:tool-mode";

export default function ToolPage() {
  const [mode, setMode] = useState<Mode>("basic");
  const [ready, setReady] = useState(false);

  // Restore preference from localStorage on mount
  useEffect(() => {
    try {
      const stored = window.localStorage.getItem(STORAGE_KEY);
      if (stored === "basic" || stored === "advanced") setMode(stored);
    } catch {
      /* ignore storage failures (private mode, etc.) */
    }
    setReady(true);
  }, []);

  function handleChange(next: Mode) {
    setMode(next);
    try {
      window.localStorage.setItem(STORAGE_KEY, next);
    } catch {
      /* ignore */
    }
  }

  return (
    <main className="relative min-h-dvh bg-background pt-28">
      <div className="mx-auto max-w-[1400px] px-6 lg:px-10">
        <div className="flex items-start justify-between gap-6">
          <div>
            <span className="frame text-[0.72rem] font-semibold text-sage">
              TOOL
            </span>
            <h1 className="display mt-5 text-display-lg leading-[1.05] text-foreground">
              Try it.
            </h1>
            <p className="mt-4 max-w-md text-sm leading-relaxed text-foreground/70 sm:text-base">
              Drop in a photo set to see per-cluster estimates. Toggle geospatial
              view to explore a vineyard map.
            </p>
          </div>
          <ToolModeToggle mode={mode} onChange={handleChange} />
        </div>

        <div className="mt-14">
          {ready && mode === "basic" && <ToolBasic />}
          {ready && mode === "advanced" && <ToolAdvanced />}
        </div>
      </div>
    </main>
  );
}
