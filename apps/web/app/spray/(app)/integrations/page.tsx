/**
 * /spray/integrations (M1.5 PR-D).
 *
 * Active connections are listed first. "Add connection" opens a modal menu
 * to start Pessl OAuth, Davis/METER paste-key flows, or see Sencrop (soon).
 *
 * If the Pessl partner-app credentials aren't configured server-side
 * yet, the start endpoint 503s with a readable error — the frontend surfaces that as a banner.
 */
"use client";

import Link from "next/link";
import { Suspense, useEffect, useState } from "react";
import { useSearchParams } from "next/navigation";
import { Plus, X } from "lucide-react";
import {
  formatSprayHttpError,
  useActiveOrg,
  type WeatherFeedCurrent,
  type WeatherFeedMeta,
  type WeatherStation,
} from "@/lib/sprayApi";
import { PasteKeyDialog } from "@/components/spray/PasteKeyDialog";
import { WeatherLocationDialog } from "@/components/spray/WeatherLocationDialog";
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
  const [weatherStation, setWeatherStation] = useState<WeatherStation | null>(null);
  const [weatherFeed, setWeatherFeed] = useState<WeatherFeedMeta | null>(null);
  const [weatherCurrent, setWeatherCurrent] = useState<WeatherFeedCurrent | null>(
    null,
  );
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [showDavisDialog, setShowDavisDialog] = useState(false);
  const [showMeterDialog, setShowMeterDialog] = useState(false);
  const [showWeatherDialog, setShowWeatherDialog] = useState(false);
  const [showAddConnectionMenu, setShowAddConnectionMenu] = useState(false);
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

        const wr = await authedFetch(`/api/spray/orgs/${orgId}/weather-station`);
        if (wr.ok) {
          const wdata = (await wr.json()) as {
            results: WeatherStation[];
            feed: WeatherFeedMeta | null;
            current: WeatherFeedCurrent;
          };
          if (!cancelled) {
            setWeatherStation(wdata.results[0] ?? null);
            setWeatherFeed(wdata.feed ?? null);
            setWeatherCurrent(wdata.current ?? null);
          }
        }
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
    setShowAddConnectionMenu(false);
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

  async function updateWeatherStation(values: { name: string; lat: number; lon: number }) {
    if (!orgId) return;
    const r = await authedFetch(
      `/api/spray/orgs/${orgId}/weather-station`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          provider: "visual_crossing",
          station_id: `vc-virtual-${orgId}`,
          name: values.name,
          location: { type: "Point", coordinates: [values.lon, values.lat] },
        }),
      },
    );
    if (!r.ok) {
      throw new Error(await formatSprayHttpError(r));
    }
    const data = (await r.json()) as WeatherStation;
    setWeatherStation(data);
    setShowWeatherDialog(false);
    const refresh = await authedFetch(`/api/spray/orgs/${orgId}/weather-station`);
    if (refresh.ok) {
      const wdata = (await refresh.json()) as {
        results: WeatherStation[];
        feed: WeatherFeedMeta | null;
        current: WeatherFeedCurrent;
      };
      setWeatherStation(wdata.results[0] ?? data);
      setWeatherFeed(wdata.feed ?? null);
      setWeatherCurrent(wdata.current ?? null);
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

  async function purgeDisconnected(connId: string) {
    if (!orgId) return;
    if (
      !confirm(
        "Permanently remove this disconnected integration? All stations and stored readings tied to it will be deleted. This cannot be undone.",
      )
    ) {
      return;
    }
    setError(null);
    const r = await authedFetch(
      `/api/spray/orgs/${orgId}/integrations/${connId}/purge`,
      { method: "DELETE" },
    );
    if (!r.ok) {
      const data = (await r.json().catch(() => ({}))) as { detail?: string };
      setError(data.detail ?? `remove failed (${r.status})`);
      return;
    }
    setConnections((prev) => (prev ?? []).filter((c) => c.id !== connId));
  }

  return (
    <div className="w-full max-w-5xl">
      <header className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <h1 className="font-display text-3xl">Integrations</h1>
          {orgName && (
            <p className="mt-1 text-sm text-foreground/60">in {orgName}</p>
          )}
          <p className="mt-3 max-w-2xl text-sm text-foreground/70">
            Weather accounts linked to Spray. Manage stations from each
            connection, or add a new provider below.
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

      <section className="mt-8">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <h2 className="frame text-xs font-semibold uppercase tracking-wider text-foreground/60">
            Active connections
          </h2>
          <button
            type="button"
            onClick={() => setShowAddConnectionMenu(true)}
            disabled={!orgId}
            className="inline-flex items-center gap-2 rounded-md border border-amber/50 bg-amber/10 px-4 py-2 frame text-xs font-semibold text-amber transition-colors hover:bg-amber/20 disabled:opacity-40"
          >
            <Plus className="h-4 w-4" aria-hidden />
            Add connection
          </button>
        </div>

        {connections === null && !error && (
          <p className="mt-6 text-foreground/50">Loading…</p>
        )}

        {connections && connections.length === 0 && (
          <p className="mt-6 rounded-md border border-dashed border-border/40 bg-background/30 p-6 text-sm text-foreground/65">
            No integrations yet. Use{" "}
            <span className="font-semibold text-foreground/85">Add connection</span>{" "}
            to link Pessl, Davis, or METER.
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
                  <div className="mt-3 flex flex-wrap gap-3">
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
                    {c.status === "disconnected" && (
                      <button
                        type="button"
                        onClick={() => purgeDisconnected(c.id)}
                        className="frame text-xs font-semibold text-red-300/90 transition-colors hover:text-red-200"
                      >
                        Delete
                      </button>
                    )}
                  </div>
                </li>
              );
            })}
          </ul>
        )}
      </section>

      <section className="mt-12">
        <h2 className="frame text-xs font-semibold uppercase tracking-wider text-foreground/60">
          Weather Feed
        </h2>
        <p className="mt-1 text-xs text-foreground/50">
          Virtual station using gridded Visual Crossing data. Used as a fallback
          when on-site sensors are unavailable.
        </p>

        <div className="mt-4 rounded-md border border-border/40 bg-background/40 p-4">
          <div className="flex flex-wrap items-start justify-between gap-4">
            <div>
              <p className="font-display text-lg">
                {weatherStation?.name ||
                  weatherFeed?.name ||
                  "Regional default"}
              </p>
              {weatherStation || weatherFeed ? (
                <p className="mt-1 text-xs text-foreground/60">
                  {(weatherStation?.location.coordinates[1] ??
                    weatherFeed?.coordinates[1] ??
                    0
                  ).toFixed(4)}
                  ,{" "}
                  {(weatherStation?.location.coordinates[0] ??
                    weatherFeed?.coordinates[0] ??
                    0
                  ).toFixed(4)}{" "}
                  · Visual Crossing
                </p>
              ) : (
                <p className="mt-1 text-xs text-foreground/60">
                  Using default location for your region.
                </p>
              )}
              {weatherCurrent?.available && weatherCurrent.temp_f != null ? (
                <p className="mt-3 font-display text-2xl text-foreground">
                  {Math.round(weatherCurrent.temp_f)}°F
                  {weatherCurrent.rh_pct != null ? (
                    <span className="ml-2 text-base font-normal text-foreground/55">
                      {Math.round(weatherCurrent.rh_pct)}% RH
                    </span>
                  ) : null}
                </p>
              ) : weatherCurrent && !weatherCurrent.available ? (
                <p className="mt-3 text-xs text-amber/90">
                  {weatherCurrent.detail ?? "Could not load current conditions."}
                </p>
              ) : weatherCurrent === null ? (
                <p className="mt-3 text-xs text-foreground/50">
                  Loading current conditions…
                </p>
              ) : null}
              {weatherCurrent?.available && weatherCurrent.observed_at ? (
                <p className="mt-1 text-[0.65rem] text-foreground/45">
                  As of{" "}
                  {new Date(weatherCurrent.observed_at).toLocaleString(undefined, {
                    month: "short",
                    day: "numeric",
                    hour: "numeric",
                    minute: "2-digit",
                    timeZoneName: "short",
                  })}
                  {weatherCurrent.source === "cached" ? " (cached)" : ""}
                </p>
              ) : null}
            </div>
            <button
              type="button"
              onClick={() => setShowWeatherDialog(true)}
              className="rounded-md border border-amber/50 bg-amber/10 px-3 py-1 frame text-xs font-semibold text-amber transition-colors hover:bg-amber/20"
            >
              {weatherStation ? "Update location" : "Set custom location"}
            </button>
          </div>
        </div>
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

      {showAddConnectionMenu && (
        <div
          role="dialog"
          aria-modal="true"
          aria-labelledby="add-connection-title"
          className="fixed inset-0 z-[60] flex items-center justify-center bg-background/80 p-4 backdrop-blur-sm"
          onClick={() => setShowAddConnectionMenu(false)}
        >
          <div
            className="w-full max-w-md rounded-md border border-border/40 bg-background p-0 shadow-lg"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between border-b border-border/40 px-5 py-4">
              <h2
                id="add-connection-title"
                className="font-display text-xl text-foreground"
              >
                Add connection
              </h2>
              <button
                type="button"
                onClick={() => setShowAddConnectionMenu(false)}
                className="rounded-md p-2 text-foreground/60 transition-colors hover:bg-foreground/10 hover:text-foreground"
                aria-label="Close"
              >
                <X className="h-5 w-5" />
              </button>
            </div>
            <div className="max-h-[min(70vh,28rem)] overflow-y-auto p-2">
              <button
                type="button"
                onClick={() => {
                  setShowAddConnectionMenu(false);
                  void connectPessl();
                }}
                disabled={!orgId || busy}
                className="flex w-full flex-col items-start gap-1 rounded-md px-4 py-3 text-left transition-colors hover:bg-foreground/5 disabled:opacity-40"
              >
                <span className="font-semibold text-foreground">
                  Pessl FieldClimate
                </span>
                <span className="text-xs text-foreground/55">
                  OAuth — you&apos;ll sign in at FieldClimate, then return here.
                </span>
              </button>
              <button
                type="button"
                onClick={() => {
                  setShowAddConnectionMenu(false);
                  setShowDavisDialog(true);
                }}
                disabled={!orgId}
                className="flex w-full flex-col items-start gap-1 rounded-md px-4 py-3 text-left transition-colors hover:bg-foreground/5 disabled:opacity-40"
              >
                <span className="font-semibold text-foreground">
                  Davis WeatherLink
                </span>
                <span className="text-xs text-foreground/55">
                  Paste API key and secret from WeatherLink.
                </span>
              </button>
              <button
                type="button"
                onClick={() => {
                  setShowAddConnectionMenu(false);
                  setShowMeterDialog(true);
                }}
                disabled={!orgId}
                className="flex w-full flex-col items-start gap-1 rounded-md px-4 py-3 text-left transition-colors hover:bg-foreground/5 disabled:opacity-40"
              >
                <span className="font-semibold text-foreground">
                  METER ZENTRA
                </span>
                <span className="text-xs text-foreground/55">
                  Paste API token; we set up a push webhook for live data.
                </span>
              </button>
              <div className="rounded-md px-4 py-3 opacity-50">
                <p className="font-semibold text-foreground">Sencrop</p>
                <p className="text-xs text-foreground/55">Coming soon.</p>
              </div>
            </div>
          </div>
        </div>
      )}

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

      {showWeatherDialog && (
        <WeatherLocationDialog
          initialValues={
            weatherStation
              ? {
                  name: weatherStation.name,
                  lat: weatherStation.location.coordinates[1],
                  lon: weatherStation.location.coordinates[0],
                }
              : undefined
          }
          onSubmit={updateWeatherStation}
          onClose={() => setShowWeatherDialog(false)}
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
