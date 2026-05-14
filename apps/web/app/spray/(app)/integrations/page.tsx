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
import { Suspense, useEffect, useState } from "react";
import { useSearchParams } from "next/navigation";
import { useActiveOrg } from "@/lib/sprayApi";
import { PasteKeyDialog } from "@/components/spray/PasteKeyDialog";
import {
  getConnectionHealth,
  type ConnectionHealth,
} from "@/lib/spraySetupStatus";

type Connection = {
  id: string;
  vendor: "pessl" | "davis" | "meter" | "sencrop";
  vendor_account_id: string;
  status: "active" | "needs_reauth" | "disconnected";
  connected_at: string;
  disconnected_at: string | null;
  last_health_at: string | null;
  last_health_detail: string;
};

const VENDOR_LABEL: Record<Connection["vendor"], string> = {
  pessl: "Pessl FieldClimate",
  davis: "Davis WeatherLink",
  meter: "METER ZENTRA",
  sencrop: "Sencrop",
};

type HealthBadge = {
  label: string;
  className: string;
};

const STATUS_STYLES: Record<ConnectionHealth, string> = {
  active: "bg-emerald-500/15 text-emerald-300",
  needs_reauth: "bg-amber/15 text-amber",
  disconnected: "bg-foreground/10 text-foreground/50",
  health_stale: "bg-amber/15 text-amber",
  unchecked: "bg-foreground/10 text-foreground/50",
};

export default function IntegrationsPage() {
  return (
    <Suspense fallback={<p className="mt-12 text-foreground/50">Loading…</p>}>
      <IntegrationsPageInner />
    </Suspense>
  );
}

function IntegrationsPageInner() {
  const { org, loading: orgLoading, authedFetch } = useActiveOrg();
  const searchParams = useSearchParams();

  const orgId = org?.id ?? null;
  const orgName = org?.name ?? "";
  const [connections, setConnections] = useState<Connection[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [showDavisDialog, setShowDavisDialog] = useState(false);
  const [showMeterDialog, setShowMeterDialog] = useState(false);
  const [meterReveal, setMeterReveal] = useState<
    { secret: string; url: string } | null
  >(null);
  const [providerHealth, setProviderHealth] = useState<Record<
    string,
    unknown
  > | null>(null);
  const showProviderHealth =
    process.env.NEXT_PUBLIC_SHOW_PROVIDER_HEALTH === "true";

  const justConnected = searchParams.get("connected");

  useEffect(() => {
    let cancelled = false;
    async function load() {
      if (!orgId) {
        if (!orgLoading) setConnections([]);
        return;
      }
      try {
        const r = await authedFetch(`/api/spray/orgs/${orgId}/integrations`);
        if (!r.ok) throw new Error("Integration status is unavailable right now. Try again shortly.");
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
  }, [orgId, orgLoading, authedFetch]);

  useEffect(() => {
    let cancelled = false;
    async function loadHealth() {
      if (!showProviderHealth) return;
      try {
        const r = await authedFetch("/api/spray/admin/provider-health");
        if (!r.ok) return;
        const data = (await r.json()) as Record<string, unknown>;
        if (!cancelled) setProviderHealth(data);
      } catch {
        if (!cancelled) setProviderHealth(null);
      }
    }
    loadHealth();
    return () => {
      cancelled = true;
    };
  }, [showProviderHealth, authedFetch]);

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

  async function reloadConnections() {
    if (!orgId) return;
    const r = await authedFetch(`/api/spray/orgs/${orgId}/integrations`);
    if (r.ok) {
      const data = (await r.json()) as { results: Connection[] };
      setConnections(data.results);
    }
  }

  async function connectDavis(values: Record<string, string>) {
    if (!orgId) return;
    const r = await authedFetch(
      `/api/spray/orgs/${orgId}/integrations/davis/connect`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(values),
      },
    );
    if (!r.ok) {
      const detail = (await r.json().catch(() => ({}))) as { detail?: string };
      throw new Error(detail.detail ?? `connect ${r.status}`);
    }
    setShowDavisDialog(false);
    await reloadConnections();
  }

  async function connectMeter(values: Record<string, string>) {
    if (!orgId) return;
    const r = await authedFetch(
      `/api/spray/orgs/${orgId}/integrations/meter/connect`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(values),
      },
    );
    if (!r.ok) {
      const detail = (await r.json().catch(() => ({}))) as { detail?: string };
      throw new Error(detail.detail ?? `connect ${r.status}`);
    }
    const data = (await r.json()) as { webhook_secret: string; webhook_url: string };
    setShowMeterDialog(false);
    setMeterReveal({ secret: data.webhook_secret, url: data.webhook_url });
    await reloadConnections();
  }

  async function disconnect(connId: string) {
    if (!orgId) return;
    if (!confirm("Disconnect this integration? Historical readings are preserved.")) return;
    const r = await authedFetch(
      `/api/spray/orgs/${orgId}/integrations/${connId}`,
      { method: "DELETE" },
    );
    if (!r.ok) {
      setError("Integration status is unavailable right now. Try again shortly.");
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
            sensor data into the spray guidance engine. Davis, Pessl, and METER are
            the MVP providers; Sencrop is tracked for a later phase.
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

        <article className="rounded-md border border-border/40 bg-background/40 p-5">
          <h2 className="frame text-xs font-semibold uppercase tracking-wider text-foreground/60">
            Davis WeatherLink
          </h2>
          <p className="mt-3 text-sm text-foreground/70">
            Two-key paste. 15-min polling. Leaf-wetness 0-15 scale
            normalized to minutes per spec §12A.1.
          </p>
          <button
            type="button"
            onClick={() => setShowDavisDialog(true)}
            disabled={!orgId}
            className="mt-4 rounded-md bg-amber px-4 py-2 frame text-xs font-semibold text-background transition-colors hover:bg-amber/90 disabled:opacity-40"
          >
            Connect Davis
          </button>
        </article>

        <article className="rounded-md border border-border/40 bg-background/40 p-5">
          <h2 className="frame text-xs font-semibold uppercase tracking-wider text-foreground/60">
            METER ZENTRA
          </h2>
          <p className="mt-3 text-sm text-foreground/70">
            Bearer-token paste + native HTTPS Push. Real-time webhook
            ingestion; 60-min poll as gap-fill.
          </p>
          <button
            type="button"
            onClick={() => setShowMeterDialog(true)}
            disabled={!orgId}
            className="mt-4 rounded-md bg-amber px-4 py-2 frame text-xs font-semibold text-background transition-colors hover:bg-amber/90 disabled:opacity-40"
          >
            Connect METER
          </button>
        </article>

        <article className="rounded-md border border-dashed border-border/50 bg-background/25 p-5">
          <p className="mt-3 text-sm text-foreground/70">
            Field weather stations and rain radar aligned with Spray&apos;s advisory
            model inputs. OAuth connector is on the roadmap after Davis, Pessl, and METER
            hardening.
          </p>
          <button
            type="button"
            disabled
            className="mt-4 w-full rounded-md border border-border/50 px-4 py-2 frame text-xs font-semibold text-foreground/40"
          >
            Coming soon
          </button>
        </article>
      </section>

      {showProviderHealth && providerHealth != null ? (
        <section className="mt-10 rounded-md border border-border/40 bg-background/30 p-5">
          <h2 className="frame text-xs font-semibold uppercase tracking-wider text-foreground/60">
            Provider health (internal)
          </h2>
          <p className="mt-2 text-xs text-foreground/50">
            Shown only when NEXT_PUBLIC_SHOW_PROVIDER_HEALTH=true. Read-only probe of
            registered weather providers.
          </p>
          <pre className="mt-4 max-h-64 overflow-auto rounded bg-foreground/5 p-3 font-mono text-[0.65rem] text-foreground/70">
            {JSON.stringify(providerHealth, null, 2)}
          </pre>
        </section>
      ) : null}

      {showDavisDialog && (
        <PasteKeyDialog
          vendorLabel="Davis WeatherLink"
          fields={[
            { name: "api_key", label: "API Key", placeholder: "from weatherlink.com → Account → API" },
            { name: "api_secret", label: "API Secret", placeholder: "(also from API page)" },
          ]}
          helpText="Both values are issued together at weatherlink.com under Account → API. We validate against /v2/stations before saving."
          onSubmit={connectDavis}
          onClose={() => setShowDavisDialog(false)}
        />
      )}

      {showMeterDialog && (
        <PasteKeyDialog
          vendorLabel="METER ZENTRA"
          fields={[
            { name: "token", label: "API Token", placeholder: "from ZENTRA Cloud → Settings → API" },
          ]}
          helpText="On connect we generate a webhook secret you'll paste into METER's Push API setup. The secret is shown once — copy it now."
          onSubmit={connectMeter}
          onClose={() => setShowMeterDialog(false)}
        />
      )}

      {meterReveal && (
        <div
          role="dialog"
          aria-modal="true"
          className="fixed inset-0 z-50 flex items-center justify-center bg-background/80"
        >
          <div className="w-full max-w-lg rounded-md border border-amber/60 bg-background p-6">
            <h2 className="font-display text-xl">METER webhook ready</h2>
            <p className="mt-2 text-sm text-foreground/70">
              Paste these into METER ZENTRA Cloud → Settings → Push API.
              The secret is shown once and cannot be re-displayed.
            </p>
            <div className="mt-5 space-y-3">
              <div>
                <p className="frame text-[0.65rem] font-semibold uppercase tracking-wider text-foreground/60">
                  Webhook URL
                </p>
                <code className="mt-1 block rounded bg-foreground/10 px-3 py-2 font-mono text-xs">
                  {meterReveal.url}
                </code>
              </div>
              <div>
                <p className="frame text-[0.65rem] font-semibold uppercase tracking-wider text-foreground/60">
                  Webhook Secret
                </p>
                <code className="mt-1 block break-all rounded bg-foreground/10 px-3 py-2 font-mono text-xs">
                  {meterReveal.secret}
                </code>
              </div>
            </div>
            <div className="mt-6 flex justify-end gap-3">
              <button
                type="button"
                onClick={() => {
                  navigator.clipboard?.writeText(meterReveal.secret);
                }}
                className="rounded-md border border-border/40 px-3 py-1 frame text-xs font-semibold uppercase tracking-wider text-foreground/80 hover:text-foreground"
              >
                Copy secret
              </button>
              <button
                type="button"
                onClick={() => setMeterReveal(null)}
                className="rounded-md bg-amber px-4 py-2 frame text-xs font-semibold text-background hover:bg-amber/90"
              >
                Done — I've saved it
              </button>
            </div>
          </div>
        </div>
      )}

      <section className="mt-12">
        <h2 className="frame text-xs font-semibold uppercase tracking-wider text-foreground/60">
          Active connections
        </h2>

        {connections === null && !error && (
          <p className="mt-6 text-foreground/50">Loading…</p>
        )}

        {connections && connections.length === 0 && (
          <p className="mt-6 text-sm text-foreground/60">
            No integrations connected yet. Add a weather station or data provider to get started.
          </p>
        )}

        {connections && connections.length > 0 && (
          <ul className="mt-4 space-y-3">
            {connections.map((c) => {
              const health = getConnectionHealthBadge(c);
              return (
                <li
                  key={c.id}
                  className="rounded-md border border-border/40 bg-background/40 p-4"
                >
                  <div className="flex flex-wrap items-start justify-between gap-4">
                    <div>
                      <p className="font-display text-lg">
                        {VENDOR_LABEL[c.vendor]}
                      </p>
                      <p className="mt-1 text-xs text-foreground/60">
                        Account {c.vendor_account_id} · connected{" "}
                        {new Date(c.connected_at).toLocaleDateString()}
                      </p>
                      <p className="mt-1 text-xs text-foreground/50">
                        {c.last_health_at
                          ? `Last health check ${new Date(c.last_health_at).toLocaleString()}`
                          : "No health check recorded yet"}
                        {c.last_health_detail
                          ? ` · ${c.last_health_detail}`
                          : ""}
                      </p>
                    </div>
                    <span
                      className={`rounded px-2 py-1 frame text-[0.65rem] font-semibold uppercase tracking-wider ${health.className}`}
                    >
                      {health.label}
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
              );
            })}
          </ul>
        )}
      </section>
    </div>
  );
}

function getConnectionHealthBadge(connection: Connection): HealthBadge {
  const health = getConnectionHealth(connection);
  const labels: Record<ConnectionHealth, string> = {
    active: "Connected",
    needs_reauth: "Partially connected",
    disconnected: "Disconnected",
    health_stale: "Partially connected",
    unchecked: "Status unknown",
  };
  return {
    label: labels[health],
    className: STATUS_STYLES[health],
  };
}
