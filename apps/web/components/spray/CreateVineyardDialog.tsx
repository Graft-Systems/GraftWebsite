/**
 * Modal for creating a new Vineyard (M0-05).
 *
 * Minimal: name + region. Full settings (centroid via map click,
 * address autocomplete, etc.) land in M0-05a.
 */
"use client";

import { useState } from "react";

const REGIONS = [
  { value: "napa", label: "Napa" },
  { value: "sonoma", label: "Sonoma" },
  { value: "burgundy", label: "Burgundy" },
  { value: "bordeaux", label: "Bordeaux" },
  { value: "mendoza", label: "Mendoza" },
  { value: "other", label: "Other" },
];

export function CreateVineyardDialog({
  onClose,
  onSubmit,
}: {
  onClose: () => void;
  onSubmit: (name: string, region: string) => Promise<void>;
}) {
  const [name, setName] = useState("");
  const [region, setRegion] = useState("napa");
  const [submitting, setSubmitting] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!name.trim()) return;
    setSubmitting(true);
    try {
      await onSubmit(name.trim(), region);
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div
      role="dialog"
      aria-modal="true"
      className="fixed inset-0 z-50 flex items-center justify-center bg-background/70 backdrop-blur"
      onClick={onClose}
    >
      <form
        onClick={(e) => e.stopPropagation()}
        onSubmit={handleSubmit}
        className="w-full max-w-md rounded-md border border-border/40 bg-background p-6 shadow-lg"
      >
        <h2 className="font-display text-xl">Create vineyard</h2>

        <label className="mt-6 block">
          <span className="frame text-xs font-semibold uppercase tracking-wider text-foreground/60">
            Name
          </span>
          <input
            type="text"
            required
            autoFocus
            value={name}
            onChange={(e) => setName(e.target.value)}
            className="mt-2 w-full rounded-md border border-border/60 bg-background/40 px-3 py-2"
          />
        </label>

        <label className="mt-4 block">
          <span className="frame text-xs font-semibold uppercase tracking-wider text-foreground/60">
            Region
          </span>
          <select
            value={region}
            onChange={(e) => setRegion(e.target.value)}
            className="mt-2 w-full rounded-md border border-border/60 bg-background/40 px-3 py-2"
          >
            {REGIONS.map((r) => (
              <option key={r.value} value={r.value}>
                {r.label}
              </option>
            ))}
          </select>
        </label>

        <div className="mt-8 flex justify-end gap-3">
          <button
            type="button"
            onClick={onClose}
            className="rounded-md border border-border/60 px-4 py-2 frame text-xs font-semibold text-foreground/70 transition-colors hover:text-foreground"
          >
            Cancel
          </button>
          <button
            type="submit"
            disabled={submitting || !name.trim()}
            className="rounded-md bg-amber px-4 py-2 frame text-xs font-semibold text-background transition-colors hover:bg-amber/90 disabled:opacity-40"
          >
            {submitting ? "Creating..." : "Create"}
          </button>
        </div>
      </form>
    </div>
  );
}
