"use client";

import Link from "next/link";
import { FormEvent, useState } from "react";
import { formatSprayHttpError } from "@/lib/sprayApi";
import { SPRAY_REGION_OPTIONS } from "@/lib/sprayRegions";

type AuthedFetch = (path: string, init?: RequestInit) => Promise<Response>;

export function CreateSprayOrgForm({
  authedFetch,
  onCreated,
  submitLabel = "Create organization",
}: {
  authedFetch: AuthedFetch;
  onCreated: (org: { id: string; name: string }) => void;
  submitLabel?: string;
}) {
  const [name, setName] = useState("");
  const [region, setRegion] = useState(SPRAY_REGION_OPTIONS[0]?.value ?? "napa");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function submit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const trimmed = name.trim();
    if (!trimmed) return;
    setBusy(true);
    setError(null);
    try {
      const res = await authedFetch("/api/spray/orgs", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: trimmed, region }),
      });
      if (!res.ok) {
        setError(await formatSprayHttpError(res));
        return;
      }
      const org = (await res.json()) as { id: string; name: string };
      onCreated(org);
    } catch (err) {
      setError(
        err instanceof Error ? err.message : "Network error while creating org.",
      );
    } finally {
      setBusy(false);
    }
  }

  return (
    <form onSubmit={submit} className="space-y-4">
      {error && (
        <p className="rounded-md border border-red-500/50 bg-red-500/10 p-3 text-sm text-red-300 whitespace-pre-wrap">
          {error}
        </p>
      )}
      <label className="block text-sm">
        <span className="text-foreground/60">Winery / organization name</span>
        <input
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder="Estate or company name"
          className="mt-1 w-full min-h-[44px] rounded-md border border-border/40 bg-background/60 px-3 py-2"
          required
          autoComplete="organization"
        />
      </label>
      <label className="block text-sm">
        <span className="text-foreground/60">Primary region</span>
        <select
          value={region}
          onChange={(e) => setRegion(e.target.value)}
          className="mt-1 w-full min-h-[44px] rounded-md border border-border/40 bg-background/60 px-3 py-2"
        >
          {SPRAY_REGION_OPTIONS.map((o) => (
            <option key={o.value} value={o.value}>
              {o.label}
            </option>
          ))}
        </select>
      </label>
      <button
        type="submit"
        disabled={busy || !name.trim()}
        className="w-full rounded-md bg-amber px-4 py-3 frame text-xs font-semibold text-background transition-colors hover:bg-amber/90 disabled:opacity-40"
      >
        {busy ? "Creating…" : submitLabel}
      </button>
      <p className="text-center text-xs text-foreground/50">
        Prefer the guided flow?{" "}
        <Link href="/spray/onboarding" className="text-amber hover:underline">
          Open full onboarding
        </Link>
      </p>
    </form>
  );
}
