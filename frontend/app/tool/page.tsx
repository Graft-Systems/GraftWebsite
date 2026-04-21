"use client";

import { useState, useRef, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import Navbar from "@/components/Navbar";
import VineTracker from "@/components/VineTracker";

/* ─── Types ─── */
interface ClusterImage {
  id: string;
  file: File;
  preview: string;
}

interface ClusterResult {
  id: string;
  preview: string;
  fileName: string;
  bear: number;   // conservative / low-end estimate
  base: number;   // most likely estimate
  bull: number;   // optimistic / high-end estimate
  blended: number; // weighted final estimate
  confidence: number;
}

/* ─── Helpers ─── */
function hashString(str: string): number {
  let hash = 0;
  for (let i = 0; i < str.length; i++) {
    const char = str.charCodeAt(i);
    hash = ((hash << 5) - hash) + char;
    hash |= 0;
  }
  return Math.abs(hash);
}

function seededRandom(seed: number): number {
  const x = Math.sin(seed + 1) * 10000;
  return x - Math.floor(x);
}

/* ─── Simulated estimation logic ─── */
function simulateEstimation(img: ClusterImage): ClusterResult {
  const seed = hashString(img.file.name + img.file.size);
  // Base case: most likely weight (120-320g range)
  const base = Math.round((140 + seededRandom(seed) * 180) * 10) / 10;
  // 5% error margin applied asymmetrically
  const errorPct = 0.05;
  const bearSkew = 1 + seededRandom(seed + 1) * 0.4; // bear goes 5-7% below
  const bullSkew = 1 + seededRandom(seed + 2) * 0.4;  // bull goes 5-7% above
  const bear = Math.round((base * (1 - errorPct * bearSkew)) * 10) / 10;
  const bull = Math.round((base * (1 + errorPct * bullSkew)) * 10) / 10;
  // Blended: weighted average (25% bear, 50% base, 25% bull)
  const blended = Math.round((bear * 0.25 + base * 0.50 + bull * 0.25) * 10) / 10;
  const confidence = Math.round((90 + seededRandom(seed + 3) * 7) * 10) / 10;

  return {
    id: img.id,
    preview: img.preview,
    fileName: img.file.name,
    bear,
    base,
    bull,
    blended,
    confidence,
  };
}

/* ─── Scenario Bar Chart ─── */
function ScenarioChart({ bear, base, bull, blended }: { bear: number; base: number; bull: number; blended: number }) {
  const max = bull * 1.15;
  const barH = (val: number) => `${(val / max) * 100}%`;

  const scenarios = [
    { label: "Bear", value: bear, color: "#3B82F6", desc: "Conservative" },
    { label: "Base", value: base, color: "#8B2332", desc: "Most Likely" },
    { label: "Bull", value: bull, color: "#22C55E", desc: "Optimistic" },
    { label: "Blended", value: blended, color: "#D97706", desc: "Final Est." },
  ];

  return (
    <div className="flex items-end gap-3 h-36">
      {scenarios.map((s) => (
        <div key={s.label} className="flex-1 flex flex-col items-center gap-1">
          <span className="text-xs font-semibold text-vineyard-earth">{s.value}g</span>
          <motion.div
            initial={{ height: 0 }}
            animate={{ height: barH(s.value) }}
            transition={{ duration: 0.8, ease: [0.16, 1, 0.3, 1] }}
            className="w-full max-w-[48px] rounded-t-md"
            style={{ backgroundColor: s.color, minHeight: 4 }}
          />
          <span className="text-[10px] font-semibold text-vineyard-earth/70 mt-1">{s.label}</span>
          <span className="text-[9px] text-vineyard-earth/40">{s.desc}</span>
        </div>
      ))}
    </div>
  );
}

/* ─── Range Visualization ─── */
function RangeBar({ bear, base, bull, blended }: { bear: number; base: number; bull: number; blended: number }) {
  const min = bear * 0.92;
  const max = bull * 1.08;
  const range = max - min;
  const pos = (val: number) => ((val - min) / range) * 100;

  return (
    <div className="mt-4">
      <div className="relative h-8 rounded-full bg-vineyard-earth/5 overflow-visible">
        {/* Range fill bear to bull */}
        <div
          className="absolute h-full rounded-full"
          style={{
            left: `${pos(bear)}%`,
            width: `${pos(bull) - pos(bear)}%`,
            background: "linear-gradient(90deg, #3B82F6, #8B2332, #22C55E)",
            opacity: 0.15,
          }}
        />
        {/* Bear marker */}
        <div className="absolute top-0 h-full flex items-center" style={{ left: `${pos(bear)}%` }}>
          <div className="w-0.5 h-5 bg-blue-500 rounded-full" />
        </div>
        {/* Bull marker */}
        <div className="absolute top-0 h-full flex items-center" style={{ left: `${pos(bull)}%` }}>
          <div className="w-0.5 h-5 bg-green-500 rounded-full" />
        </div>
        {/* Base marker */}
        <div className="absolute top-0 h-full flex items-center" style={{ left: `${pos(base)}%` }}>
          <div className="w-0.5 h-6 bg-brand-burgundy rounded-full" />
        </div>
        {/* Blended marker (diamond) */}
        <div className="absolute top-0 h-full flex items-center" style={{ left: `${pos(blended)}%`, transform: "translateX(-5px)" }}>
          <div className="w-2.5 h-2.5 bg-amber-500 rotate-45 rounded-sm" />
        </div>
      </div>
      {/* Labels */}
      <div className="relative mt-1.5 text-[10px]">
        <span className="absolute text-blue-500 font-semibold" style={{ left: `${pos(bear)}%`, transform: "translateX(-50%)" }}>
          {bear}g
        </span>
        <span className="absolute text-brand-burgundy font-semibold" style={{ left: `${pos(base)}%`, transform: "translateX(-50%)" }}>
          {base}g
        </span>
        <span className="absolute text-green-600 font-semibold" style={{ left: `${pos(bull)}%`, transform: "translateX(-50%)" }}>
          {bull}g
        </span>
        <span className="absolute text-amber-600 font-semibold" style={{ left: `${pos(blended)}%`, transform: "translateX(-50%)", top: "12px" }}>
          {blended}g
        </span>
      </div>
    </div>
  );
}

/* ─── Summary Stats ─── */
function SummaryStats({ results }: { results: ClusterResult[] }) {
  const totalBlended = results.reduce((sum, r) => sum + r.blended, 0);
  const totalBear = results.reduce((sum, r) => sum + r.bear, 0);
  const totalBull = results.reduce((sum, r) => sum + r.bull, 0);
  const avgConfidence = results.reduce((sum, r) => sum + r.confidence, 0) / results.length;

  return (
    <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
      {[
        { label: "Blended Estimate", value: `${Math.round(totalBlended)}g`, sub: `${results.length} cluster${results.length > 1 ? "s" : ""}` },
        { label: "Bear Case (Total)", value: `${Math.round(totalBear)}g`, sub: "conservative" },
        { label: "Bull Case (Total)", value: `${Math.round(totalBull)}g`, sub: "optimistic" },
        { label: "Model Accuracy", value: `${Math.round(avgConfidence * 10) / 10}%`, sub: "95% target" },
      ].map((stat) => (
        <div
          key={stat.label}
          className="bg-white rounded-xl border border-vineyard-earth/10 p-4 text-center"
        >
          <p className="text-xs text-vineyard-earth/50 mb-1">{stat.label}</p>
          <p className="text-xl font-semibold text-vineyard-earth">{stat.value}</p>
          <p className="text-xs text-vineyard-earth/40 mt-0.5">{stat.sub}</p>
        </div>
      ))}
    </div>
  );
}

/* ─── Main Tool Page ─── */
export default function Tool() {
  const [images, setImages] = useState<ClusterImage[]>([]);
  const [results, setResults] = useState<ClusterResult[] | null>(null);
  const [isEstimating, setIsEstimating] = useState(false);
  const [estimationProgress, setEstimationProgress] = useState(0);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFiles = useCallback(
    (files: FileList | null) => {
      if (!files) return;
      const newImages: ClusterImage[] = [];
      const remaining = 5 - images.length;

      for (let i = 0; i < Math.min(files.length, remaining); i++) {
        const file = files[i];
        if (!file.type.startsWith("image/")) continue;
        newImages.push({
          id: `${Date.now()}-${i}`,
          file,
          preview: URL.createObjectURL(file),
        });
      }

      setImages((prev) => [...prev, ...newImages]);
      setResults(null);
    },
    [images.length]
  );

  const removeImage = (id: string) => {
    setImages((prev) => {
      const removed = prev.find((img) => img.id === id);
      if (removed) URL.revokeObjectURL(removed.preview);
      return prev.filter((img) => img.id !== id);
    });
    setResults(null);
  };

  const runEstimation = async () => {
    setIsEstimating(true);
    setEstimationProgress(0);

    const allResults: ClusterResult[] = [];
    for (let i = 0; i < images.length; i++) {
      await new Promise((r) => setTimeout(r, 800 + Math.random() * 600));
      allResults.push(simulateEstimation(images[i]));
      setEstimationProgress(((i + 1) / images.length) * 100);
    }

    setResults(allResults);
    setIsEstimating(false);
  };

  const reset = () => {
    images.forEach((img) => URL.revokeObjectURL(img.preview));
    setImages([]);
    setResults(null);
    setEstimationProgress(0);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    handleFiles(e.dataTransfer.files);
  };

  return (
    <div className="min-h-screen bg-cream">
      <Navbar />
      <VineTracker />

      {/* Header */}
      <section className="pt-24 pb-8 lg:pt-28 lg:pb-12">
        <div className="max-w-4xl mx-auto px-6 lg:px-8 text-center">
          <motion.h1
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6 }}
            className="text-3xl lg:text-4xl font-semibold text-vineyard-earth mb-3"
          >
            Cluster Weight Estimation
          </motion.h1>
          <motion.p
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 0.1 }}
            className="text-vineyard-earth/60 text-lg max-w-2xl mx-auto"
          >
            Upload up to 5 photos of grape clusters. Each estimate includes bear, base,
            and bull cases to account for our 5% error margin — plus a blended final weight.
          </motion.p>
        </div>
      </section>

      {/* Tool area */}
      <section className="pb-20">
        <div className="max-w-5xl mx-auto px-6 lg:px-8">
          {/* Upload zone */}
          {!results && (
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5, delay: 0.2 }}
            >
              {/* Drop zone */}
              <div
                onDragOver={(e) => e.preventDefault()}
                onDrop={handleDrop}
                onClick={() => fileInputRef.current?.click()}
                className={`border-2 border-dashed rounded-xl p-10 text-center cursor-pointer
                  transition-colors duration-200
                  ${images.length >= 5
                    ? "border-vineyard-earth/10 bg-vineyard-earth/5 cursor-not-allowed"
                    : "border-brand-burgundy/30 hover:border-brand-burgundy/60 hover:bg-brand-burgundy/5"
                  }`}
                data-testid="drop-zone"
              >
                <input
                  ref={fileInputRef}
                  type="file"
                  accept="image/*"
                  multiple
                  className="hidden"
                  onChange={(e) => handleFiles(e.target.files)}
                  disabled={images.length >= 5}
                />
                <svg
                  width="48"
                  height="48"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="#8B2332"
                  strokeWidth="1.5"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  className="mx-auto mb-4 opacity-50"
                >
                  <path d="M21 15v4a2 2 0 01-2 2H5a2 2 0 01-2-2v-4" />
                  <polyline points="17 8 12 3 7 8" />
                  <line x1="12" y1="3" x2="12" y2="15" />
                </svg>
                <p className="text-vineyard-earth/70 font-semibold mb-1">
                  {images.length >= 5
                    ? "Maximum 5 images reached"
                    : "Drop grape cluster photos here"}
                </p>
                <p className="text-vineyard-earth/40 text-sm">
                  {images.length >= 5
                    ? "Remove an image to add a new one"
                    : `or click to browse (${5 - images.length} remaining)`}
                </p>
              </div>

              {/* Uploaded image previews */}
              {images.length > 0 && (
                <div className="mt-6">
                  <div className="flex flex-wrap gap-4">
                    {images.map((img) => (
                      <motion.div
                        key={img.id}
                        initial={{ opacity: 0, scale: 0.9 }}
                        animate={{ opacity: 1, scale: 1 }}
                        className="relative group"
                      >
                        <img
                          src={img.preview}
                          alt={img.file.name}
                          className="w-28 h-28 object-cover rounded-lg border border-vineyard-earth/10"
                        />
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            removeImage(img.id);
                          }}
                          className="absolute -top-2 -right-2 w-6 h-6 bg-red-500 text-white rounded-full
                                     flex items-center justify-center text-xs opacity-0 group-hover:opacity-100
                                     transition-opacity"
                          data-testid={`button-remove-${img.id}`}
                        >
                          ×
                        </button>
                        <p className="text-xs text-vineyard-earth/40 mt-1 truncate w-28">
                          {img.file.name}
                        </p>
                      </motion.div>
                    ))}
                  </div>

                  {/* Estimate button */}
                  <div className="mt-8 flex items-center gap-4">
                    <button
                      onClick={runEstimation}
                      disabled={isEstimating || images.length === 0}
                      className={`px-8 py-3 rounded-lg font-semibold text-base transition-all duration-200
                        ${isEstimating
                          ? "bg-vineyard-earth/20 text-vineyard-earth/40 cursor-wait"
                          : "bg-brand-burgundy text-white hover:bg-brand-burgundy-light hover:scale-[1.02] active:scale-[0.98]"
                        }`}
                      data-testid="button-estimate"
                    >
                      {isEstimating ? "Estimating..." : `Estimate ${images.length} Cluster${images.length > 1 ? "s" : ""}`}
                    </button>
                    {isEstimating && (
                      <div className="flex-1 max-w-xs">
                        <div className="h-2 rounded-full bg-vineyard-earth/10 overflow-hidden">
                          <motion.div
                            className="h-full bg-brand-burgundy rounded-full"
                            initial={{ width: 0 }}
                            animate={{ width: `${estimationProgress}%` }}
                            transition={{ duration: 0.3 }}
                          />
                        </div>
                        <p className="text-xs text-vineyard-earth/40 mt-1">
                          Processing {Math.ceil((estimationProgress / 100) * images.length)} of {images.length}...
                        </p>
                      </div>
                    )}
                  </div>
                </div>
              )}
            </motion.div>
          )}

          {/* Results */}
          <AnimatePresence>
            {results && (
              <motion.div
                initial={{ opacity: 0, y: 30 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.6 }}
              >
                {/* Summary */}
                <SummaryStats results={results} />

                {/* Methodology note */}
                <div className="bg-white/60 rounded-lg border border-vineyard-earth/8 px-5 py-3 mb-6">
                  <p className="text-xs text-vineyard-earth/50 leading-relaxed">
                    <span className="font-semibold text-vineyard-earth/70">How we estimate: </span>
                    Our model targets 95% accuracy. To account for the 5% margin, each cluster gets three scenarios —{" "}
                    <span className="text-blue-600 font-semibold">Bear</span> (weight may be lower),{" "}
                    <span className="text-brand-burgundy font-semibold">Base</span> (most likely), and{" "}
                    <span className="text-green-600 font-semibold">Bull</span> (weight may be higher).
                    The <span className="text-amber-600 font-semibold">Blended</span> estimate weighs all three for your final number.
                  </p>
                </div>

                {/* Individual results */}
                <div className="space-y-6">
                  {results.map((result, idx) => (
                    <motion.div
                      key={result.id}
                      initial={{ opacity: 0, y: 20 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ duration: 0.4, delay: idx * 0.1 }}
                      className="bg-white rounded-xl border border-vineyard-earth/10 overflow-hidden"
                    >
                      <div className="flex flex-col md:flex-row">
                        {/* Image */}
                        <div className="md:w-48 flex-shrink-0">
                          <img
                            src={result.preview}
                            alt={result.fileName}
                            className="w-full h-48 md:h-full object-cover"
                          />
                        </div>

                        {/* Data */}
                        <div className="flex-1 p-6">
                          {/* Header row */}
                          <div className="flex items-start justify-between mb-5">
                            <div>
                              <p className="text-sm text-vineyard-earth/40 mb-0.5">
                                Cluster {idx + 1}
                              </p>
                              <p className="text-3xl font-semibold text-amber-600">
                                {result.blended}
                                <span className="text-lg text-vineyard-earth/50 ml-1">grams</span>
                              </p>
                              <p className="text-xs text-vineyard-earth/40 mt-0.5">Blended estimate</p>
                            </div>
                            <div className="text-right">
                              <p className="text-xs text-vineyard-earth/40">Model Accuracy</p>
                              <p className="text-lg font-semibold text-vineyard-earth">
                                {result.confidence}%
                              </p>
                            </div>
                          </div>

                          {/* Scenario cards */}
                          <div className="grid grid-cols-3 gap-3 mb-5">
                            <div className="rounded-lg bg-blue-50 border border-blue-100 p-3 text-center">
                              <p className="text-[10px] font-semibold text-blue-500 uppercase tracking-wider mb-1">Bear</p>
                              <p className="text-lg font-semibold text-blue-700">{result.bear}g</p>
                              <p className="text-[10px] text-blue-400">Conservative</p>
                            </div>
                            <div className="rounded-lg bg-red-50 border border-red-100 p-3 text-center">
                              <p className="text-[10px] font-semibold text-brand-burgundy uppercase tracking-wider mb-1">Base</p>
                              <p className="text-lg font-semibold text-brand-burgundy">{result.base}g</p>
                              <p className="text-[10px] text-brand-burgundy/60">Most Likely</p>
                            </div>
                            <div className="rounded-lg bg-green-50 border border-green-100 p-3 text-center">
                              <p className="text-[10px] font-semibold text-green-600 uppercase tracking-wider mb-1">Bull</p>
                              <p className="text-lg font-semibold text-green-700">{result.bull}g</p>
                              <p className="text-[10px] text-green-500">Optimistic</p>
                            </div>
                          </div>

                          {/* Scenario chart + range */}
                          <div className="grid md:grid-cols-2 gap-6">
                            <div>
                              <p className="text-xs font-semibold text-vineyard-earth/50 mb-3 uppercase tracking-wide">
                                Scenario Comparison
                              </p>
                              <ScenarioChart bear={result.bear} base={result.base} bull={result.bull} blended={result.blended} />
                            </div>
                            <div>
                              <p className="text-xs font-semibold text-vineyard-earth/50 mb-3 uppercase tracking-wide">
                                Estimation Range
                              </p>
                              <div className="mt-4">
                                <RangeBar bear={result.bear} base={result.base} bull={result.bull} blended={result.blended} />
                              </div>
                              <div className="mt-8 flex items-center gap-4 text-[10px] text-vineyard-earth/40 justify-center flex-wrap">
                                <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-blue-500" /> Bear</span>
                                <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-brand-burgundy" /> Base</span>
                                <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-green-500" /> Bull</span>
                                <span className="flex items-center gap-1"><span className="w-2.5 h-2.5 rounded-sm bg-amber-500 rotate-45" /> Blended</span>
                              </div>
                            </div>
                          </div>
                        </div>
                      </div>
                    </motion.div>
                  ))}
                </div>

                {/* Actions */}
                <div className="mt-8 flex gap-4 justify-center">
                  <button
                    onClick={reset}
                    className="px-8 py-3 rounded-lg font-semibold text-base border-2 border-vineyard-earth/20
                               text-vineyard-earth hover:bg-vineyard-earth/5 transition-colors"
                    data-testid="button-new-estimation"
                  >
                    New Estimation
                  </button>
                </div>

                {/* Disclaimer */}
                <p className="text-center text-vineyard-earth/30 text-xs mt-8 max-w-lg mx-auto">
                  This is a demo using simulated estimates. Production estimates
                  use our trained ML model targeting 95% accuracy for photo-based cluster weight estimation.
                </p>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </section>

      {/* Footer */}
      <footer className="bg-vineyard-earth py-8">
        <div className="max-w-5xl mx-auto px-6 lg:px-8 text-center">
          <p className="text-cream/40 text-sm">
            &copy; {new Date().getFullYear()} Graft Systems. All rights reserved.
          </p>
        </div>
      </footer>
    </div>
  );
}
