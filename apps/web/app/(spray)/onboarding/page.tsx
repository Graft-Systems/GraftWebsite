/**
 * Onboarding stub (M0-02 step 9 frontend).
 *
 * Minimal page to land freshly-signed-in users so they can:
 *   - toggle the four consent categories (POST /api/spray/account/consent)
 *   - see a "Create Org" placeholder (the full wizard lands in M0-02a)
 *
 * Protected by `apps/web/middleware.ts`; unauthenticated visits redirect
 * to /sign-in.
 */
"use client";

import { useEffect, useState } from "react";
import { useAuth, useUser } from "@clerk/nextjs";

const CATEGORIES: { key: string; label: string; help: string }[] = [
  {
    key: "photo_for_training",
    label: "Use my photos and videos for ML training",
    help: "Helps the grape-weight model improve. You can withdraw any time.",
  },
  {
    key: "spray_records_for_benchmarks",
    label: "Use my spray records for benchmarks",
    help: "Aggregated benchmarks across vineyards; your records are not shown individually.",
  },
  {
    key: "anonymized_aggregates",
    label: "Share anonymized aggregate insights",
    help: "Region-level averages; no row-level data leaves your account.",
  },
  {
    key: "marketing_email",
    label: "Receive marketing email",
    help: "Product updates and harvest-season notes. Off by default.",
  },
];

export default function OnboardingPage() {
  const { getToken, isSignedIn } = useAuth();
  const { user } = useUser();
  const [state, setState] = useState<Record<string, boolean>>({});
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    async function load() {
      if (!isSignedIn) return;
      try {
        const token = await getToken();
        const res = await fetch("/api/spray/account/consent", {
          headers: { Authorization: `Bearer ${token}` },
        });
        if (!res.ok) return;
        const records: { category: string; granted: boolean }[] = await res.json();
        if (cancelled) return;
        const next: Record<string, boolean> = {};
        for (const r of records) next[r.category] = r.granted;
        setState(next);
      } finally {
        if (!cancelled) setLoading(false);
      }
    }
    load();
    return () => {
      cancelled = true;
    };
  }, [isSignedIn, getToken]);

  async function toggle(category: string, granted: boolean) {
    setSaving(category);
    try {
      const token = await getToken();
      await fetch("/api/spray/account/consent", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify([{ category, granted }]),
      });
      setState((s) => ({ ...s, [category]: granted }));
    } finally {
      setSaving(null);
    }
  }

  return (
    <main className="mx-auto max-w-2xl px-6 py-32">
      <h1 className="font-display text-4xl">
        Welcome{user?.firstName ? `, ${user.firstName}` : ""}.
      </h1>
      <p className="mt-3 text-foreground/70">
        A couple of preferences before you head into Graft Spray. You can change
        any of these later from Account Settings.
      </p>

      <section className="mt-12">
        <h2 className="frame text-xs font-semibold uppercase tracking-wider text-foreground/60">
          Privacy preferences
        </h2>
        <ul className="mt-4 space-y-3">
          {CATEGORIES.map((c) => {
            const checked = state[c.key] ?? false;
            return (
              <li
                key={c.key}
                className="flex items-start justify-between gap-6 rounded-md border border-border/40 bg-background/40 p-4"
              >
                <div>
                  <p className="font-medium">{c.label}</p>
                  <p className="mt-1 text-sm text-foreground/60">{c.help}</p>
                </div>
                <label className="inline-flex shrink-0 items-center gap-2">
                  <input
                    type="checkbox"
                    checked={checked}
                    disabled={loading || saving === c.key}
                    onChange={(e) => toggle(c.key, e.target.checked)}
                  />
                  <span className="text-xs text-foreground/60">
                    {saving === c.key ? "saving..." : checked ? "on" : "off"}
                  </span>
                </label>
              </li>
            );
          })}
        </ul>
      </section>

      <section className="mt-16">
        <h2 className="frame text-xs font-semibold uppercase tracking-wider text-foreground/60">
          Your vineyard
        </h2>
        <p className="mt-3 text-foreground/70">
          The full vineyard setup wizard lands in M0-02a. For now, an empty Org
          will be created automatically when you reach the Spray app.
        </p>
      </section>
    </main>
  );
}
