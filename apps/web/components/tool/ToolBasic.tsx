"use client";

import {
  createContext,
  useContext,
  useEffect,
  useRef,
  useState,
  type ReactNode,
} from "react";

type ResultItem = {
  filename: string;
  prediction_weight: number;
  ground_truth_weight?: number;
  absolute_error?: number;
  unit: string;
  model: string;
  latency_ms?: number;
  image_url?: string;
};

type PredictionHistoryBatch = {
  id: number;
  created_at: string;
  summary?: {
    processed?: number;
    model?: string;
    total_prediction_weight?: number;
    total_unit?: string;
  };
  results: ResultItem[];
};

type Stage = "idle" | "uploading" | "results" | "error";
const ACTIVE_BATCH_STORAGE_KEY = "tool.activeBatchId";
/** Browser calls use same-origin paths proxied by Next.js (see next.config.mjs). */
function getEstimateEndpoint() {
  if (typeof window !== "undefined") {
    return "/api/estimate";
  }
  const serverBase =
    process.env.BACKEND_URL?.trim() ??
    process.env.NEXT_PUBLIC_BACKEND_URL?.trim() ??
    "http://127.0.0.1:8080";
  return `${serverBase.replace(/\/+$/, "")}/api/estimate`;
}

function getEstimateHistoryEndpoint() {
  if (typeof window !== "undefined") {
    return "/api/estimate/history";
  }
  const serverBase =
    process.env.BACKEND_URL?.trim() ??
    process.env.NEXT_PUBLIC_BACKEND_URL?.trim() ??
    "http://127.0.0.1:8080";
  return `${serverBase.replace(/\/+$/, "")}/api/estimate/history`;
}

function getBackendBaseUrl() {
  if (typeof window !== "undefined") {
    return "";
  }
  const serverBase =
    process.env.BACKEND_URL?.trim() ??
    process.env.NEXT_PUBLIC_BACKEND_URL?.trim() ??
    "http://127.0.0.1:8080";
  return serverBase.replace(/\/+$/, "");
}

function resolveImageUrl(imageUrl?: string) {
  if (!imageUrl) return "";
  if (typeof window !== "undefined") {
    try {
      const parsed = new URL(imageUrl, window.location.origin);
      if (parsed.pathname.startsWith("/media/")) {
        return `${parsed.pathname}${parsed.search}`;
      }
    } catch {
      /* keep relative paths as-is */
    }
    if (imageUrl.startsWith("/")) return imageUrl;
  }
  if (/^https?:\/\//i.test(imageUrl)) return imageUrl;
  if (!imageUrl.startsWith("/")) return imageUrl;
  const base = getBackendBaseUrl();
  return base ? `${base}${imageUrl}` : imageUrl;
}

function getBatchTotal(batch: PredictionHistoryBatch) {
  if (typeof batch.summary?.total_prediction_weight === "number") {
    return {
      weight: batch.summary.total_prediction_weight,
      unit: batch.summary.total_unit ?? "kg",
    };
  }
  const fallbackWeight = batch.results.reduce((sum, item) => sum + item.prediction_weight, 0);
  const fallbackUnit = batch.results[0]?.unit ?? "kg";
  return { weight: fallbackWeight, unit: fallbackUnit };
}

type ToolContextValue = {
  stage: Stage;
  results: ResultItem[];
  error: string | null;
  uploadSummary: string;
  showFilters: boolean;
  setShowFilters: React.Dispatch<React.SetStateAction<boolean>>;
  modelEngine: string;
  setModelEngine: React.Dispatch<React.SetStateAction<string>>;
  label: string;
  setLabel: React.Dispatch<React.SetStateAction<string>>;
  species: string;
  setSpecies: React.Dispatch<React.SetStateAction<string>>;
  berryCount: string;
  setBerryCount: React.Dispatch<React.SetStateAction<string>>;
  heightCm: string;
  setHeightCm: React.Dispatch<React.SetStateAction<string>>;
  tempF: string;
  setTempF: React.Dispatch<React.SetStateAction<string>>;
  rainIn: string;
  setRainIn: React.Dispatch<React.SetStateAction<string>>;
  soilPct: string;
  setSoilPct: React.Dispatch<React.SetStateAction<string>>;
  metadataJson: string;
  setMetadataJson: React.Dispatch<React.SetStateAction<string>>;
  historyBatches: PredictionHistoryBatch[];
  historyLoading: boolean;
  historyError: string | null;
  activeBatchId: number | null;
  deletingBatchId: number | null;
  expandedBatch: PredictionHistoryBatch | null;
  setExpandedBatch: React.Dispatch<React.SetStateAction<PredictionHistoryBatch | null>>;
  inputRef: React.RefObject<HTMLInputElement>;
  handleFiles: (files: File[]) => Promise<void>;
  deleteBatch: (batchId: number) => Promise<void>;
  onDrop: (e: React.DragEvent) => void;
  reset: () => void;
  loadHistory: () => Promise<void>;
};

const ToolContext = createContext<ToolContextValue | null>(null);

function useTool() {
  const ctx = useContext(ToolContext);
  if (!ctx) {
    throw new Error("Tool components must be used within ToolPageProvider");
  }
  return ctx;
}

export function ToolPageProvider({ children }: { children: ReactNode }) {
  const [stage, setStage] = useState<Stage>("idle");
  const [results, setResults] = useState<ResultItem[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [uploadSummary, setUploadSummary] = useState<string>("");
  const [showFilters, setShowFilters] = useState(false);
  const [modelEngine, setModelEngine] = useState("GrapesNet Model v5 (active)");
  const [label, setLabel] = useState("Cluster_Analysis_01");
  const [species, setSpecies] = useState("Cabernet Sauvignon");
  const [berryCount, setBerryCount] = useState("0");
  const [heightCm, setHeightCm] = useState("120");
  const [tempF, setTempF] = useState("72");
  const [rainIn, setRainIn] = useState("0.05");
  const [soilPct, setSoilPct] = useState("18");
  const [metadataJson, setMetadataJson] = useState(
    `{"camera_angle": "left-canopy", "lighting": "natural"}`
  );
  const [historyBatches, setHistoryBatches] = useState<PredictionHistoryBatch[]>([]);
  const [historyLoading, setHistoryLoading] = useState(true);
  const [historyError, setHistoryError] = useState<string | null>(null);
  const [activeBatchId, setActiveBatchId] = useState<number | null>(null);
  const [deletingBatchId, setDeletingBatchId] = useState<number | null>(null);
  const [expandedBatch, setExpandedBatch] = useState<PredictionHistoryBatch | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  async function loadHistory() {
    setHistoryLoading(true);
    setHistoryError(null);
    try {
      const response = await fetch(`${getEstimateHistoryEndpoint()}?limit=10`);
      if (!response.ok) {
        throw new Error("Could not load saved prediction history.");
      }
      const body = (await response.json()) as { batches?: PredictionHistoryBatch[] };
      setHistoryBatches(body.batches ?? []);
    } catch (err) {
      const message =
        err instanceof TypeError && /fetch/i.test(err.message)
          ? "Could not reach the API. Check that the backend is running (make dev)."
          : err instanceof Error
            ? err.message
            : "Could not load saved history.";
      setHistoryError(message);
    } finally {
      setHistoryLoading(false);
    }
  }

  useEffect(() => {
    const raw = window.localStorage.getItem(ACTIVE_BATCH_STORAGE_KEY);
    if (!raw) return;
    const parsed = Number(raw);
    if (Number.isInteger(parsed) && parsed > 0) {
      setActiveBatchId(parsed);
    }
  }, []);

  useEffect(() => {
    loadHistory();
  }, []);

  useEffect(() => {
    if (!expandedBatch) return;
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        setExpandedBatch(null);
      }
    };
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    window.addEventListener("keydown", onKeyDown);
    return () => {
      window.removeEventListener("keydown", onKeyDown);
      document.body.style.overflow = previousOverflow;
    };
  }, [expandedBatch]);

  async function handleFiles(files: File[]) {
    if (!files.length) return;
    setStage("uploading");
    setError(null);
    setUploadSummary("");
    try {
      const form = new FormData();
      for (const f of files.slice(0, 10)) form.append("files", f);
      if (activeBatchId) {
        form.append("batch_id", String(activeBatchId));
      }
      const res = await fetch(getEstimateEndpoint(), { method: "POST", body: form });
      if (!res.ok) {
        const text = await res.text();
        let errorMessage = "Upload failed.";
        if (text) {
          try {
            const parsed = JSON.parse(text) as { error?: string; detail?: string };
            errorMessage = parsed.error ?? parsed.detail ?? text;
          } catch {
            errorMessage = text;
          }
        }
        throw new Error(errorMessage);
      }
      const body = (await res.json()) as {
        results: ResultItem[];
        batch_id?: number;
        summary?: {
          processed?: number;
          model?: string;
          total_prediction_weight?: number;
          total_unit?: string;
        };
      };
      const next = body.results ?? [];
      setResults(next);
      const nextBatchId = typeof body.batch_id === "number" ? body.batch_id : null;
      setActiveBatchId(nextBatchId);
      if (nextBatchId) {
        window.localStorage.setItem(ACTIVE_BATCH_STORAGE_KEY, String(nextBatchId));
      } else {
        window.localStorage.removeItem(ACTIVE_BATCH_STORAGE_KEY);
      }
      setUploadSummary(
        `${body.summary?.processed ?? next.length} total predictions in active batch.`
      );
      await loadHistory();
      setStage("results");
    } catch (err) {
      setStage("error");
      setError(err instanceof Error ? err.message : "Upload failed.");
    }
  }

  async function deleteBatch(batchId: number) {
    const confirmed = window.confirm(
      `Delete batch #${batchId}? This will permanently remove all predictions in this batch.`
    );
    if (!confirmed) return;

    setDeletingBatchId(batchId);
    setHistoryError(null);
    try {
      const res = await fetch(`${getEstimateHistoryEndpoint()}/${batchId}`, {
        method: "DELETE",
      });
      if (!res.ok) {
        const text = await res.text();
        throw new Error(text || "Could not delete batch.");
      }

      setHistoryBatches((prev) => prev.filter((batch) => batch.id !== batchId));
      if (activeBatchId === batchId) {
        setActiveBatchId(null);
        setResults([]);
        setUploadSummary("");
        window.localStorage.removeItem(ACTIVE_BATCH_STORAGE_KEY);
      }
    } catch (err) {
      setHistoryError(err instanceof Error ? err.message : "Could not delete batch.");
    } finally {
      setDeletingBatchId(null);
    }
  }

  function onDrop(e: React.DragEvent) {
    e.preventDefault();
    const files = Array.from(e.dataTransfer.files).filter((f) =>
      f.type.startsWith("image/")
    );
    handleFiles(files);
  }

  function reset() {
    setStage("idle");
    setResults([]);
    setError(null);
    setUploadSummary("");
    setShowFilters(false);
    setActiveBatchId(null);
    window.localStorage.removeItem(ACTIVE_BATCH_STORAGE_KEY);
  }

  const value: ToolContextValue = {
    stage,
    results,
    error,
    uploadSummary,
    showFilters,
    setShowFilters,
    modelEngine,
    setModelEngine,
    label,
    setLabel,
    species,
    setSpecies,
    berryCount,
    setBerryCount,
    heightCm,
    setHeightCm,
    tempF,
    setTempF,
    rainIn,
    setRainIn,
    soilPct,
    setSoilPct,
    metadataJson,
    setMetadataJson,
    historyBatches,
    historyLoading,
    historyError,
    activeBatchId,
    deletingBatchId,
    expandedBatch,
    setExpandedBatch,
    inputRef,
    handleFiles,
    deleteBatch,
    onDrop,
    reset,
    loadHistory,
  };

  return <ToolContext.Provider value={value}>{children}</ToolContext.Provider>;
}

export function ToolPredictionsSection() {
  const {
    results,
    activeBatchId,
    reset,
    historyBatches,
    historyLoading,
    historyError,
    loadHistory,
    deletingBatchId,
    deleteBatch,
    setExpandedBatch,
    expandedBatch,
  } = useTool();

  return (
    <div className="mt-12 space-y-12">
      <section className="space-y-4">
        <div className="flex items-center justify-between">
          <h2 className="display text-2xl italic text-foreground">Recent Predictions</h2>
          <div className="flex items-center gap-3">
            {activeBatchId && (
              <p className="frame text-[0.62rem] text-foreground-muted">
                ACTIVE BATCH #{activeBatchId}
              </p>
            )}
            {(results.length > 0 || activeBatchId !== null) && (
            <button
              type="button"
              onClick={reset}
              className="frame text-[0.62rem] text-foreground-muted transition-colors hover:text-foreground"
            >
              NEW BATCH
            </button>
            )}
          </div>
        </div>
        {results.length > 0 ? (
          <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-4">
            {results.slice(0, 4).map((item, idx) => (
              <ResultCard key={`${item.filename}-${idx}`} result={item} />
            ))}
          </div>
        ) : (
          <div className="rounded-sm border border-border/40 bg-surface/40 p-6 text-sm text-foreground-muted">
            No predictions yet. Upload at least one image to begin.
          </div>
        )}
      </section>

      <section className="space-y-4">
        <div className="flex items-center justify-between">
          <h2 className="display text-2xl italic text-foreground">Saved Prediction History</h2>
          <button
            type="button"
            onClick={() => void loadHistory()}
            className="frame text-[0.62rem] text-foreground-muted transition-colors hover:text-foreground"
          >
            REFRESH
          </button>
        </div>
        {historyLoading ? (
          <div className="rounded-sm border border-border/40 bg-surface/40 p-6 text-sm text-foreground-muted">
            Loading saved history...
          </div>
        ) : historyError ? (
          <div className="rounded-sm border border-border/40 bg-surface/40 p-6 text-sm text-burgundy">
            {historyError}
          </div>
        ) : historyBatches.length ? (
          <div className="space-y-4">
            {historyBatches.map((batch) => (
              <article
                key={batch.id}
                className="rounded-sm border border-border/40 bg-surface/30 p-4 sm:p-5"
              >
                {(() => {
                  const batchTotal = getBatchTotal(batch);
                  return (
                <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
                  <p className="frame text-[0.62rem] text-foreground-muted">
                    BATCH #{batch.id} · {new Date(batch.created_at).toLocaleString()}
                  </p>
                  <div className="flex items-center gap-3">
                    <p className="text-sm text-foreground-muted">
                      {(batch.summary?.processed ?? batch.results.length).toString()} items ·{" "}
                      {batch.summary?.model ?? "unknown"} · total{" "}
                      {batchTotal.weight.toFixed(3)} {batchTotal.unit}
                    </p>
                    <button
                      type="button"
                      onClick={() => setExpandedBatch(batch)}
                      className="frame text-[0.62rem] text-foreground-muted transition-colors hover:text-foreground"
                    >
                      VIEW MORE
                    </button>
                    <button
                      type="button"
                      onClick={() => void deleteBatch(batch.id)}
                      disabled={deletingBatchId === batch.id}
                      className="frame text-[0.62rem] text-burgundy transition-colors hover:text-foreground disabled:opacity-50"
                    >
                      {deletingBatchId === batch.id ? "DELETING..." : "DELETE"}
                    </button>
                  </div>
                </div>
                  );
                })()}
                <div className="grid grid-cols-1 gap-3 md:grid-cols-2 xl:grid-cols-4">
                  {batch.results.slice(0, 4).map((item, idx) => (
                    <ResultCard key={`${batch.id}-${item.filename}-${idx}`} result={item} />
                  ))}
                </div>
              </article>
            ))}
          </div>
        ) : (
          <div className="rounded-sm border border-border/40 bg-surface/40 p-6 text-sm text-foreground-muted">
            No saved prediction history yet.
          </div>
        )}
      </section>

      {expandedBatch && (
        (() => {
          const expandedBatchTotal = getBatchTotal(expandedBatch);
          return (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4"
          onClick={() => setExpandedBatch(null)}
          onWheel={(event) => event.stopPropagation()}
          onTouchMove={(event) => event.stopPropagation()}
        >
          <div
            role="dialog"
            aria-modal="true"
            aria-label={`Batch ${expandedBatch.id} predictions`}
            className="flex max-h-[80vh] w-full max-w-5xl flex-col rounded-sm border border-border/50 bg-background"
            onClick={(event) => event.stopPropagation()}
          >
            <div className="flex items-center justify-between border-b border-border/50 px-5 py-4">
              <div>
                <p className="frame text-[0.62rem] text-foreground-muted">
                  BATCH #{expandedBatch.id}
                </p>
                <p className="mt-1 text-sm text-foreground-muted">
                  {(expandedBatch.summary?.processed ?? expandedBatch.results.length).toString()}{" "}
                  items · {expandedBatch.summary?.model ?? "unknown"} · total{" "}
                  {expandedBatchTotal.weight.toFixed(3)} {expandedBatchTotal.unit}
                </p>
              </div>
              <button
                type="button"
                onClick={() => setExpandedBatch(null)}
                className="frame text-[0.62rem] text-foreground-muted transition-colors hover:text-foreground"
              >
                CLOSE (X)
              </button>
            </div>
            <div className="overflow-y-auto p-5">
              <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-4">
                {expandedBatch.results.map((item, idx) => (
                  <ResultCard
                    key={`${expandedBatch.id}-modal-${item.filename}-${idx}`}
                    result={item}
                  />
                ))}
              </div>
            </div>
          </div>
        </div>
          );
        })()
      )}
    </div>
  );
}

export function ToolUploadSection() {
  const {
    stage,
    error,
    uploadSummary,
    showFilters,
    setShowFilters,
    modelEngine,
    setModelEngine,
    label,
    setLabel,
    species,
    setSpecies,
    berryCount,
    setBerryCount,
    heightCm,
    setHeightCm,
    tempF,
    setTempF,
    rainIn,
    setRainIn,
    soilPct,
    setSoilPct,
    metadataJson,
    setMetadataJson,
    inputRef,
    handleFiles,
    onDrop,
  } = useTool();

  return (
    <section
      id="yield-upload"
      className="scroll-mt-24 rounded-sm border border-border/60 bg-surface/40 p-6 sm:p-8"
    >
      <input
        ref={inputRef}
        type="file"
        accept="image/*"
        multiple
        onChange={(e) => handleFiles(Array.from(e.target.files ?? []))}
        className="hidden"
      />

      <div
        onDragOver={(e) => e.preventDefault()}
        onDrop={onDrop}
        className="rounded-sm border-2 border-dashed border-border/70 bg-background/60 p-10 text-center"
      >
        <p className="display text-2xl italic text-foreground">Drop Vineyard Imagery</p>
        <p className="mt-3 text-sm text-foreground-muted">
          Upload RAW or high-resolution image files to run cluster prediction.
        </p>
        <div className="mt-6 flex flex-col items-center gap-3">
          <button
            type="button"
            onClick={() => inputRef.current?.click()}
            className="rounded-sm border border-border bg-surface px-6 py-2 text-sm font-medium text-foreground"
          >
            {stage === "uploading" ? "Analyzing..." : "Browse Files"}
          </button>
          <button
            type="button"
            onClick={() => setShowFilters((s) => !s)}
            className="rounded-sm px-4 py-2 text-xs uppercase tracking-wide text-foreground-muted"
          >
            {showFilters ? "Less Filters" : "More Filters"}
          </button>
        </div>
        {error && <p className="mt-4 text-sm text-burgundy">{error}</p>}
        {uploadSummary && !error && (
          <p className="mt-4 text-sm text-foreground-muted">{uploadSummary}</p>
        )}
      </div>

      {showFilters && (
        <div className="mt-6 border-t border-border/50 pt-6">
          <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
            <SelectField
              label="AI Model Engine"
              value={modelEngine}
              onChange={setModelEngine}
              options={[
                "GrapesNet Model v5 (active)",
                "GrapesNet Model v4",
                "ClusterVision RF v2",
              ]}
            />
            <Field label="Prediction Label" value={label} onChange={setLabel} />
            <Field label="Grape Species" value={species} onChange={setSpecies} />
            <Field label="Berry Count" value={berryCount} onChange={setBerryCount} />
            <Field label="Height (cm)" value={heightCm} onChange={setHeightCm} />
            <Field label="Temp (°F)" value={tempF} onChange={setTempF} />
            <Field label="Rain (in)" value={rainIn} onChange={setRainIn} />
            <Field label="Soil %" value={soilPct} onChange={setSoilPct} />
          </div>
          <TextAreaField
            className="mt-6"
            label="Optional Metadata (JSON)"
            value={metadataJson}
            onChange={setMetadataJson}
          />
        </div>
      )}
    </section>
  );
}


function ResultCard({ result }: { result: ResultItem }) {
  return (
    <article className="overflow-hidden rounded-sm border border-border/40 bg-surface/40">
      {result.image_url ? (
        // eslint-disable-next-line @next/next/no-img-element -- dynamic estimate API URLs; host varies by env
        <img
          src={resolveImageUrl(result.image_url)}
          alt={result.filename}
          className="h-40 w-full object-cover"
          loading="lazy"
        />
      ) : (
        <div className="h-40 bg-gradient-to-br from-background via-surface to-burgundy/30" />
      )}
      <div className="space-y-2 p-4">
        <p className="truncate text-sm text-foreground">{result.filename}</p>
        <p className="numeric text-lg text-foreground">
          {result.prediction_weight.toFixed(3)} {result.unit}
        </p>
        <p className="frame text-[0.55rem] text-foreground-muted">MODEL · {result.model}</p>
        {typeof result.absolute_error === "number" && (
          <p className="text-xs text-foreground-muted">
            abs error: {result.absolute_error.toFixed(3)} {result.unit}
          </p>
        )}
      </div>
    </article>
  );
}

function Field({
  label,
  value,
  onChange,
}: {
  label: string;
  value: string;
  onChange: (next: string) => void;
}) {
  return (
    <label className="space-y-2">
      <span className="frame text-[0.58rem] text-foreground-muted">{label}</span>
      <input
        className="w-full rounded-sm border border-border bg-background px-3 py-2 text-sm text-foreground outline-none"
        value={value}
        onChange={(e) => onChange(e.target.value)}
      />
    </label>
  );
}

function SelectField({
  label,
  value,
  options,
  onChange,
}: {
  label: string;
  value: string;
  options: string[];
  onChange: (next: string) => void;
}) {
  return (
    <label className="space-y-2">
      <span className="frame text-[0.58rem] text-foreground-muted">{label}</span>
      <select
        className="w-full rounded-sm border border-border bg-background px-3 py-2 text-sm text-foreground outline-none"
        value={value}
        onChange={(e) => onChange(e.target.value)}
      >
        {options.map((option) => (
          <option key={option} value={option}>
            {option}
          </option>
        ))}
      </select>
    </label>
  );
}

function TextAreaField({
  label,
  value,
  onChange,
  className,
}: {
  label: string;
  value: string;
  onChange: (next: string) => void;
  className?: string;
}) {
  return (
    <label className={`block space-y-2 ${className ?? ""}`}>
      <span className="frame text-[0.58rem] text-foreground-muted">{label}</span>
      <textarea
        className="min-h-[140px] w-full rounded-sm border border-border bg-background px-3 py-2 text-sm text-foreground outline-none"
        value={value}
        onChange={(e) => onChange(e.target.value)}
      />
    </label>
  );
}

function InsightSimpleCard({
  label,
  value,
  rightValue,
}: {
  label: string;
  value: string;
  rightValue: string;
}) {
  return (
    <div className="rounded-sm border border-border/40 bg-background/60 p-4">
      <p className="frame text-[0.55rem] text-foreground-muted">{label}</p>
      <div className="mt-2 flex items-end justify-between gap-4">
        <p className="display text-3xl italic text-foreground">{value}</p>
        <p className="text-sm text-foreground-muted">{rightValue}</p>
      </div>
    </div>
  );
}

function InsightProgressCard({
  label,
  value,
  rightValue,
  progress,
}: {
  label: string;
  value: string;
  rightValue: string;
  progress: number;
}) {
  const pct = Math.max(0, Math.min(100, progress * 100));
  return (
    <div className="rounded-sm border border-border/40 bg-background/60 p-4">
      <p className="frame text-[0.55rem] text-foreground-muted">{label}</p>
      <div className="mt-2 flex items-end justify-between gap-4">
        <p className="display text-3xl italic text-foreground">{value}</p>
        <p className="text-sm text-foreground-muted">{rightValue}</p>
      </div>
      <div className="mt-4 h-2 overflow-hidden rounded-full bg-border/60">
        <div className="h-full bg-foreground/70" style={{ width: `${pct}%` }} />
      </div>
    </div>
  );
}

function InsightBlocksCard({
  label,
  value,
  rightValue,
}: {
  label: string;
  value: string;
  rightValue: string;
}) {
  return (
    <div className="rounded-sm border border-border/40 bg-background/60 p-4">
      <p className="frame text-[0.55rem] text-foreground-muted">{label}</p>
      <div className="mt-2 flex items-end justify-between gap-4">
        <p className="display text-3xl italic text-foreground">{value}</p>
        <p className="text-sm text-foreground-muted">{rightValue}</p>
      </div>
      <div className="mt-4 grid grid-cols-4 gap-2">
        <div className="h-10 rounded-sm bg-foreground/20" />
        <div className="h-10 rounded-sm bg-foreground/25" />
        <div className="h-10 rounded-sm bg-foreground/35" />
        <div className="h-10 rounded-sm bg-foreground/90" />
      </div>
    </div>
  );
}
