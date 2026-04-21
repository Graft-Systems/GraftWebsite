"use client";

import { useRef, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { cn } from "@/lib/utils";

type ResultItem = {
  filename: string;
  bear: number;
  base: number;
  bull: number;
  blended: number;
  unit: string;
  model: string;
};

type Stage = "idle" | "uploading" | "results" | "error";

export function ToolBasic() {
  const [stage, setStage] = useState<Stage>("idle");
  const [results, setResults] = useState<ResultItem[]>([]);
  const [dragging, setDragging] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  async function handleFiles(files: File[]) {
    if (!files.length) return;
    setStage("uploading");
    setError(null);
    try {
      const form = new FormData();
      for (const f of files.slice(0, 10)) form.append("files", f);
      const res = await fetch("/api/estimate", { method: "POST", body: form });
      if (!res.ok) {
        const body = (await res.json().catch(() => ({}))) as { error?: string };
        throw new Error(body.error ?? "Upload failed.");
      }
      const body = (await res.json()) as { results: ResultItem[] };
      setResults(body.results ?? []);
      setStage("results");
    } catch (err) {
      setStage("error");
      setError(err instanceof Error ? err.message : "Upload failed.");
    }
  }

  function onDrop(e: React.DragEvent) {
    e.preventDefault();
    setDragging(false);
    const files = Array.from(e.dataTransfer.files).filter((f) =>
      f.type.startsWith("image/")
    );
    handleFiles(files);
  }

  function reset() {
    setStage("idle");
    setResults([]);
    setError(null);
  }

  return (
    <div className="flex flex-col gap-8">
      <AnimatePresence mode="wait">
        {stage === "idle" || stage === "error" ? (
          <motion.div
            key="drop"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.3 }}
          >
            <div
              onDragOver={(e) => {
                e.preventDefault();
                setDragging(true);
              }}
              onDragLeave={() => setDragging(false)}
              onDrop={onDrop}
              onClick={() => inputRef.current?.click()}
              className={cn(
                "relative flex min-h-[48vh] cursor-pointer flex-col items-center justify-center rounded-sm border-2 border-dashed px-8 text-center transition-colors",
                dragging
                  ? "border-amber bg-amber/5"
                  : "border-border/60 hover:border-foreground-muted bg-surface/40"
              )}
            >
              <input
                ref={inputRef}
                type="file"
                accept="image/*"
                multiple
                onChange={(e) => handleFiles(Array.from(e.target.files ?? []))}
                className="hidden"
              />
              <svg width="40" height="40" viewBox="0 0 40 40" fill="none" stroke="currentColor" strokeWidth="1.3" className="text-foreground/40">
                <rect x="6" y="8" width="28" height="24" rx="2" />
                <circle cx="14" cy="17" r="2.5" />
                <path d="M6 27 L15 19 L22 24 L28 20 L34 26" strokeLinecap="round" strokeLinejoin="round" />
              </svg>
              <p className="display mt-6 text-xl italic text-foreground lg:text-2xl">
                Drop photos here.
              </p>
              <p className="mt-3 text-sm text-foreground-muted">
                Or click to choose. Up to 10 files per batch.
              </p>
              {error && (
                <p className="mt-4 text-sm text-burgundy/90">{error}</p>
              )}
            </div>
          </motion.div>
        ) : stage === "uploading" ? (
          <motion.div
            key="loading"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.3 }}
            className="flex min-h-[48vh] flex-col items-center justify-center rounded-sm border border-border/60 bg-surface/40"
          >
            <p className="frame text-[0.7rem] text-amber">PROCESSING</p>
            <p className="display mt-4 text-2xl italic text-foreground">
              Estimating clusters…
            </p>
          </motion.div>
        ) : (
          <motion.div
            key="results"
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.4 }}
            className="space-y-6"
          >
            <div className="flex items-center justify-between">
              <div>
                <span className="frame text-[0.62rem] text-sage">RESULTS</span>
                <p className="display mt-2 text-xl italic text-foreground lg:text-2xl">
                  {results.length} {results.length === 1 ? "photo" : "photos"} analyzed.
                </p>
              </div>
              <button
                type="button"
                onClick={reset}
                className="frame text-[0.62rem] text-foreground-muted transition-colors hover:text-foreground"
              >
                ← NEW BATCH
              </button>
            </div>

            <ul className="divide-y divide-border/30 rounded-sm border border-border/40 bg-surface/40">
              {results.map((r, i) => (
                <ResultRow key={i} result={r} />
              ))}
            </ul>

            <p className="frame text-[0.58rem] text-foreground-muted">
              {results[0]?.model === "simulation-v0"
                ? "SIMULATED OUTPUT · MODEL PLACEHOLDER — VALUES NOT DERIVED FROM YOUR IMAGES"
                : `MODEL · ${results[0]?.model ?? "unknown"}`}
            </p>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

function ResultRow({ result }: { result: ResultItem }) {
  // Visual range bar: position of base relative to bear/bull
  const span = result.bull - result.bear;
  const basePct = span > 0 ? ((result.base - result.bear) / span) * 100 : 50;

  return (
    <li className="grid grid-cols-1 gap-4 px-6 py-5 md:grid-cols-[1fr_auto_14rem] md:items-center md:gap-10">
      <div className="min-w-0">
        <p className="truncate text-sm text-foreground">{result.filename}</p>
        <p className="frame mt-1 text-[0.55rem] text-foreground-muted">
          PER-CLUSTER RANGE · {result.unit.toUpperCase()}
        </p>
      </div>

      <div className="flex items-baseline gap-4 text-sm">
        <span className="numeric text-sage">{result.bear}</span>
        <span className="numeric text-foreground">{result.base}</span>
        <span className="numeric text-amber">{result.bull}</span>
      </div>

      <div className="relative h-1 w-full bg-background">
        <div className="absolute inset-y-0 left-0 right-0 bg-border/40" />
        <div
          className="absolute top-1/2 h-2 w-2 -translate-y-1/2 rounded-full bg-amber shadow"
          style={{ left: `calc(${basePct}% - 4px)` }}
        />
      </div>
    </li>
  );
}
