/**
 * /spray/integrations (M1.5 PR-D).
 *
 * Lists the active org's sensor connections + lets the user kick off
 * the Pessl OAuth round-trip. Each connection links to a detail page
 * for vendor-station → block linking.
 *
 * If the Pessl partner-app credentials aren't configured server-side
 * yet, the "Connect Pessl" button still renders but the start endpoint
 * 503s with a readable error — the frontend surfaces that as a banner.
 */
"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { useAuth } from "@clerk/nextjs";

type Membership = { org: { id: string; name: string } };
type Connection = {
  id: string;
  vendor: "pessl" | "davis" | "meter" | "sencrop";
  vendor_account_id: string;
  status: "active" | "needs_reauth" | "disconnected";
  connected_at: string;
  disconnected_at: string | null;
};

const VENDOR_LABEL: Record<Connection["vendor"], string> = {
  pessl: "Pessl FieldClimate",
  davis: "Davis WeatherLink",
  meter: "METER ZENTRA",
  sencrop: "Sencrop",
};

const STATUS_STYLES: Record<Connection["status"], string> = {
  active: "bg-emerald-500/15 text-emerald-300",
  needs_reauth: "bg-amber/15 text-amber",
  disconnected: "bg-foreground/10 text-foreground/50",
};

export default function IntegrationsPage() {
  const { getToken, isSignedIn } = useAuth();
  const router = useRouter();
  const searchParams = useSearchParams();

  const [orgId, setOrgId] = useState<string | null>(null);
  const [orgName, setOrgName] = useState<string>("");
  const [connections, setConnections] = useState<Connection[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  const justConnected = searchParams.get("connected");

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
        const meRes = await authedFetch("/api/spray/orgs/me");
        if (!meRes.ok) throw new Error(`orgs/me ${meRes.status}`);
        const me = (await meRes.json()) as { memberships: Membership[] };
        const first = me.memberships?.[0];
        if (!first) {
          if (!cancelled) setConnections([]);
          return;
        }
        if (cancelled) return;
        setOrgId(first.org.id);
        setOrgName(first.org.name);

        const r = await authedFetch(
          `/api/spray/orgs/${first.org.id}/integrations`,
        );
        if (!r.ok) throw new Error(`integrations ${r.status}`);
        const data = (await r.json()) as { results: Connection[] };
        if (!cancelled) setConnections(data.results);
      } catch (e) {
        if (!cancelled) setError(e instanceof Error ? e.message : "load failed");
      }
    }
    load();
    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isSignedIn]);

  async function connectPessl() {
    if (!orgId) return;
    setBusy(true);
    setError(null);
    try {
      const r = await authedFetch(
        `/api/spray/orgs/${orgId}/integrations/pessl/oauth/start`,
        { method: "POST" },
      );
      if (!r.ok) {
        const detail = (await r.json().catch(() => ({}))) as { detail?: string };
        throw new Error(detail.detail ?? `oauth start ${r.status}`);
      }
      const data = (await r.json()) as { authorize_url: string };
      window.location.href = data.authorize_url;
    } catch (e) {
      setBusy(false);
      setError(e instanceof Error ? e.message : "could not start OAuth");
    }
  }

  async function disconnect(connId: string) {
    if (!orgId) return;
    if (!confirm("Disconnect this integration? Historical readings are preserved.")) return;
    const r = await authedFetch(
      `/api/spray/orgs/${orgId}/integrations/${connId}`,
      { method: "DELETE" },
    );
    if (!r.ok) {
      setError(`disconnect ${r.status}`);
      return;
    }
    setConnections((prev) =>
      (prev ?? []).map((c) =>
        c.id === connId
          ? { ...c, status: "disconnected", disconnected_at: new Date().toISOString() }
          : c,
      ),
    );
  }

  return (
    <div className="mx-auto max-w-5xl">
      <header className="flex items-baseline justify-between">
        <div>
          <h1 className="font-display text-3xl">Integrations</h1>
          {orgName && (
            <p className="mt-1 text-sm text-foreground/60">in {orgName}</p>
          )}
          <p className="mt-3 max-w-2xl text-sm text-foreground/70">
            Connect your weather-station accounts so Spray can pull live
            sensor data into the verdict engine. Pessl FieldClimate is
            available now; Davis, METER, and Sencrop ship next.
          </p>
        </div>
      </header>

      {justConnected === "pessl" && (
        <p className="mt-6 rounded-md border border-emerald-500/40 bg-emerald-500/10 p-3 text-sm text-emerald-300">
          Pessl connected. Pick a station and link it to a block to start
          ingesting readings.
        </p>
      )}

      {error && (
        <p className="mt-6 rounded-md border border-red-500/50 bg-red-500/10 p-3 text-sm text-red-300">
          {error}
        </p>
      )}

      <section className="mt-8 grid gap-4 md:grid-cols-2">
        <article className="rounded-md border border-border/40 bg-background/40 p-5">
          <h2 className="frame text-xs font-semibold uppercase tracking-wider text-foreground/60">
            Pessl FieldClimate
          </h2>
          <p className="mt-3 text-sm text-foreground/70">
            OAuth 2.0 partner app. 15-min polling. Leaf-wetness reported in
            minutes, model-ready.
          </p>
          <button
            type="button"
            onClick={connectPessl}
            disabled={!orgId || busy}
            className="mt-4 rounded-md bg-amber px-4 py-2 frame text-xs font-semibold text-background transition-colors hover:bg-amber/90 disabled:opacity-40"
          >
            {busy ? "Redirecting…" : "Connect Pessl"}
          </button>
        </article>

        <article className="rounded-md border border-dashed border-border/40 bg-background/30 p-5">
          <h2 className="frame text-xs font-semibold uppercase tracking-wider text-foreground/50">
            Davis · METER · Sencrop
          </h2>
          <p className="mt-3 text-sm text-foreground/60">
            Coming next milestone. The same "Connect" flow will live here.
          </p>
        </article>
      </section>

      <section className="mt-12">
        <h2 className="frame text-xs font-semibold uppercase tracking-wider text-foreground/60">
          Active connections
        </h2>

        {connections === null && !error && (
          <p className="mt-6 text-foreground/50">Loading…</p>
        )}

        {connections && connections.length === 0 && (
          <p className="mt-6 text-sm text-foreground/60">
            No integrations yet. Connect your first one above.
          </p>
        )}

        {connections && connections.length > 0 && (
          <ul className="mt-4 space-y-3">
            {connections.map((c) => (
              <li
                key={c.id}
                className="rounded-md border border-border/40 bg-background/40 p-4"
              >
                <div className="flex items-center justify-between gap-4">
                  <div>
                    <p className="font-display text-lg">{VENDOR_LABEL[c.vendor]}</p>
                    <p className="mt-1 text-xs text-foreground/60">
                      Account {c.vendor_account_id} · connected{" "}
                      {new Date(c.connected_at).toLocaleDateString()}
                    </p>
                  </div>
                  <span
                    className={`rounded px-2 py-1 frame text-[0.65rem] font-semibold uppercase tracking-wider ${STATUS_STYLES[c.status]}`}
                  >
                    {c.status.replace("_", " ")}
                  </span>
                </div>
                <div className="mt-3 flex gap-3">
                  {c.status === "active" && orgId && (
                    <Link
                      href={`/spray/integrations/${c.id}`}
                      className="frame text-xs font-semibold text-amber transition-colors hover:text-amber/80"
                    >
                      Manage stations →
                    </Link>
                  )}
                  {c.status !== "disconnected" && (
                    <button
                      type="button"
                      onClick={() => disconnect(c.id)}
                      className="frame text-xs font-semibold text-foreground/60 transition-colors hover:text-red-300"
                    >
                      Disconnect
                    </button>
                  )}
                </div>
              </li>
            ))}
          </ul>
        )}
      </section>
    </div>
  );
}
