"use client";

import Link from "next/link";
import { FormEvent, useEffect, useState } from "react";
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

type Membership = { org: { id: string; name: string } };
type Vineyard = { id: string; name: string; archived_at: string | null };

export default function OnboardingPage() {
  const { getToken, isSignedIn } = useAuth();
  const { user } = useUser();
  const [state, setState] = useState<Record<string, boolean>>({});
  const [orgId, setOrgId] = useState<string | null>(null);
  const [orgName, setOrgName] = useState("");
  const [region, setRegion] = useState("napa");
  const [vineyardName, setVineyardName] = useState("Home Ranch");
  const [vineyardCount, setVineyardCount] = useState(0);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState<string | null>(null);
  const [creatingOrg, setCreatingOrg] = useState(false);
  const [creatingVineyard, setCreatingVineyard] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function authedFetch(path: string, init?: RequestInit) {
    const token = await getToken();
    return fetch(path, {
      ...init,
      headers: {
        ...(init?.headers ?? {}),
        Authorization: `Bearer ${token}`,
      },
    });
  }

  useEffect(() => {
    let cancelled = false;
    async function load() {
      if (!isSignedIn) return;
      try {
        const [consentRes, orgRes] = await Promise.all([
          authedFetch("/api/spray/account/consent"),
          authedFetch("/api/spray/orgs/me"),
        ]);

        if (consentRes.ok) {
          const records = (await consentRes.json()) as {
            category: string;
            granted: boolean;
          }[];
          if (!cancelled) {
            const next: Record<string, boolean> = {};
            for (const r of records) next[r.category] = r.granted;
            setState(next);
          }
        }

        if (orgRes.ok) {
          const me = (await orgRes.json()) as { memberships: Membership[] };
          const first = me.memberships?.[0];
          if (first && !cancelled) {
            setOrgId(first.org.id);
            setOrgName(first.org.name);

            const vineyardsRes = await authedFetch(
              `/api/spray/orgs/${first.org.id}/vineyards`,
            );
            if (vineyardsRes.ok && !cancelled) {
              const vineyards = (await vineyardsRes.json()) as Vineyard[];
              setVineyardCount(
                vineyards.filter((v) => v.archived_at === null).length,
              );
            }
          }
        }
      } catch (e) {
        if (!cancelled) setError(e instanceof Error ? e.message : "load failed");
      } finally {
        if (!cancelled) setLoading(false);
      }
    }
    load();
    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isSignedIn]);

  async function toggle(category: string, granted: boolean) {
    setSaving(category);
    setError(null);
    try {
      const res = await authedFetch("/api/spray/account/consent", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify([{ category, granted }]),
      });
      if (!res.ok) throw new Error(`save failed (${res.status})`);
      setState((s) => ({ ...s, [category]: granted }));
    } catch (e) {
      setError(e instanceof Error ? e.message : "save failed");
    } finally {
      setSaving(null);
    }
  }

  async function createOrg(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setCreatingOrg(true);
    setError(null);
    try {
      const res = await authedFetch("/api/spray/orgs", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: orgName, region }),
      });
      if (!res.ok) throw new Error(`create org ${res.status}`);
      const org = (await res.json()) as { id: string; name: string };
      setOrgId(org.id);
      setOrgName(org.name);
    } catch (e) {
      setError(e instanceof Error ? e.message : "could not create org");
    } finally {
      setCreatingOrg(false);
    }
  }

  async function createVineyard(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!orgId) return;
    setCreatingVineyard(true);
    setError(null);
    try {
      const res = await authedFetch(`/api/spray/orgs/${orgId}/vineyards`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: vineyardName, region }),
      });
      if (!res.ok) throw new Error(`create vineyard ${res.status}`);
      setVineyardCount((count) => count + 1);
      setVineyardName("");
    } catch (e) {
      setError(e instanceof Error ? e.message : "could not create vineyard");
    } finally {
      setCreatingVineyard(false);
    }
  }

  const firstName = user?.firstName ? `, ${user.firstName}` : "";

  return (
    <main className="mx-auto max-w-5xl px-6 py-24">
      <header className="max-w-3xl">
        <p className="frame text-xs font-semibold uppercase tracking-wider text-amber">
          15 minutes to first directive
        </p>
        <h1 className="mt-3 font-display text-4xl">Welcome{firstName}.</h1>
        <p className="mt-3 text-foreground/70">
          Set privacy preferences, create the vineyard account, then jump into
          blocks or integrations. Graft Spray uses those pieces to produce the
          first block-level mildew directive.
        </p>
      </header>

      {error && (
        <p className="mt-6 rounded-md border border-red-500/50 bg-red-500/10 p-3 text-sm text-red-300">
          {error}
        </p>
      )}

      <div className="mt-10 grid gap-6 lg:grid-cols-[1fr_0.85fr]">
        <section>
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

        <aside className="space-y-4">
          <section className="rounded-md border border-border/40 bg-background/40 p-5">
            <h2 className="frame text-xs font-semibold uppercase tracking-wider text-foreground/60">
              1. Organization
            </h2>
            {orgId ? (
              <div className="mt-4">
                <p className="font-display text-xl">{orgName}</p>
                <p className="mt-1 text-sm text-foreground/60">
                  Organization ready.
                </p>
              </div>
            ) : (
              <form onSubmit={createOrg} className="mt-4 space-y-3">
                <label className="block text-sm">
                  <span className="text-foreground/60">Organization name</span>
                  <input
                    value={orgName}
                    onChange={(e) => setOrgName(e.target.value)}
                    placeholder="Estate name"
                    className="mt-1 w-full rounded-md border border-border/40 bg-background/60 px-3 py-2"
                    required
                  />
                </label>
                <label className="block text-sm">
                  <span className="text-foreground/60">Region</span>
                  <select
                    value={region}
                    onChange={(e) => setRegion(e.target.value)}
                    className="mt-1 w-full rounded-md border border-border/40 bg-background/60 px-3 py-2"
                  >
                    <option value="napa">Napa</option>
                    <option value="sonoma">Sonoma</option>
                    <option value="central_coast">Central Coast</option>
                    <option value="other">Other</option>
                  </select>
                </label>
                <button
                  type="submit"
                  disabled={creatingOrg}
                  className="rounded-md bg-amber px-4 py-2 frame text-xs font-semibold text-background transition-colors hover:bg-amber/90 disabled:opacity-40"
                >
                  {creatingOrg ? "Creating..." : "Create organization"}
                </button>
              </form>
            )}
          </section>

          <section className="rounded-md border border-border/40 bg-background/40 p-5">
            <h2 className="frame text-xs font-semibold uppercase tracking-wider text-foreground/60">
              2. First vineyard
            </h2>
            {orgId ? (
              <form onSubmit={createVineyard} className="mt-4 space-y-3">
                <p className="text-sm text-foreground/60">
                  {vineyardCount > 0
                    ? `${vineyardCount} vineyard(s) already created.`
                    : "Create one vineyard, then draw its blocks."}
                </p>
                <label className="block text-sm">
                  <span className="text-foreground/60">Vineyard name</span>
                  <input
                    value={vineyardName}
                    onChange={(e) => setVineyardName(e.target.value)}
                    placeholder="Home Ranch"
                    className="mt-1 w-full rounded-md border border-border/40 bg-background/60 px-3 py-2"
                    required
                  />
                </label>
                <button
                  type="submit"
                  disabled={creatingVineyard || !vineyardName.trim()}
                  className="rounded-md bg-amber px-4 py-2 frame text-xs font-semibold text-background transition-colors hover:bg-amber/90 disabled:opacity-40"
                >
                  {creatingVineyard ? "Creating..." : "Create vineyard"}
                </button>
              </form>
            ) : (
              <p className="mt-4 text-sm text-foreground/60">
                Create the organization first.
              </p>
            )}
          </section>

          <section className="rounded-md border border-border/40 bg-background/40 p-5">
            <h2 className="frame text-xs font-semibold uppercase tracking-wider text-foreground/60">
              3. Next steps
            </h2>
            <div className="mt-4 flex flex-wrap gap-3">
              <Link
                href="/spray/vineyards"
                className="rounded-md border border-border/40 px-3 py-2 frame text-xs font-semibold text-foreground/80 hover:text-foreground"
              >
                Draw blocks
              </Link>
              <Link
                href="/spray/integrations"
                className="rounded-md border border-border/40 px-3 py-2 frame text-xs font-semibold text-foreground/80 hover:text-foreground"
              >
                Connect sensors
              </Link>
              <Link
                href="/spray/dashboard"
                className="rounded-md bg-amber px-3 py-2 frame text-xs font-semibold text-background hover:bg-amber/90"
              >
                View directives
              </Link>
            </div>
          </section>
        </aside>
      </div>
    </main>
  );
}
