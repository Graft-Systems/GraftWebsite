/**
 * PasteKeyDialog (M1.5 PR-E).
 *
 * Generic paste-credential dialog for vendors that don't do OAuth
 * (Davis WeatherLink: api_key + api_secret. METER ZENTRA: token).
 * The parent owns the submit handler + post-submit reveal flow
 * (METER's webhook_secret is shown once after the connect succeeds).
 */
"use client";

import { useState } from "react";

export type PasteField = {
  name: string;
  label: string;
  type?: "text" | "password";
  placeholder?: string;
};

export function PasteKeyDialog({
  vendorLabel,
  fields,
  onSubmit,
  onClose,
  helpText,
}: {
  vendorLabel: string;
  fields: PasteField[];
  onSubmit: (values: Record<string, string>) => Promise<void>;
  onClose: () => void;
  helpText?: string;
}) {
  const [values, setValues] = useState<Record<string, string>>(() =>
    Object.fromEntries(fields.map((f) => [f.name, ""])),
  );
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const allFilled = fields.every((f) => (values[f.name] || "").trim().length > 0);

  async function handleSubmit() {
    setBusy(true);
    setError(null);
    try {
      await onSubmit(values);
    } catch (e) {
      setError(e instanceof Error ? e.message : "submit failed");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div
      role="dialog"
      aria-modal="true"
      onClick={onClose}
      className="fixed inset-0 z-50 flex items-center justify-center bg-background/80"
    >
      <div
        onClick={(e) => e.stopPropagation()}
        className="w-full max-w-md rounded-md border border-border/40 bg-background p-6"
      >
        <h2 className="font-display text-xl">Connect {vendorLabel}</h2>
        {helpText && (
          <p className="mt-2 text-sm text-foreground/60">{helpText}</p>
        )}

        <div className="mt-5 space-y-3">
          {fields.map((f) => (
            <div key={f.name}>
              <label
                htmlFor={`pk-${f.name}`}
                className="frame block text-[0.65rem] font-semibold uppercase tracking-wider text-foreground/60"
              >
                {f.label}
              </label>
              <input
                id={`pk-${f.name}`}
                type={f.type ?? "password"}
                placeholder={f.placeholder}
                value={values[f.name] || ""}
                onChange={(e) =>
                  setValues((v) => ({ ...v, [f.name]: e.target.value }))
                }
                className="mt-1 w-full rounded-md border border-border/40 bg-background/60 px-3 py-2 font-mono text-sm"
                autoComplete="off"
                spellCheck={false}
              />
            </div>
          ))}
        </div>

        {error && (
          <p className="mt-4 rounded-md border border-red-500/40 bg-red-500/10 p-2 text-sm text-red-300">
            {error}
          </p>
        )}

        <div className="mt-6 flex justify-end gap-3">
          <button
            type="button"
            onClick={onClose}
            disabled={busy}
            className="frame text-xs font-semibold uppercase tracking-wider text-foreground/60 hover:text-foreground/80"
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={handleSubmit}
            disabled={!allFilled || busy}
            className="rounded-md bg-amber px-4 py-2 frame text-xs font-semibold text-background transition-colors hover:bg-amber/90 disabled:opacity-40"
          >
            {busy ? "Validating…" : "Connect"}
          </button>
        </div>
      </div>
    </div>
  );
}
