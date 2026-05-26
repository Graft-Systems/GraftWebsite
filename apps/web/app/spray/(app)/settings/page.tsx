"use client";

import { FormEvent, useCallback, useEffect, useState } from "react";
import { useClerk } from "@clerk/nextjs";
import {
  type ProgramSettings,
  useActiveOrg,
} from "@/lib/sprayApi";

const DEFAULT_SETTINGS: ProgramSettings = {
  program_type: "organic",
  allowed_products: "",
  frac_rotation: "",
  cultivar_sensitivity: "normal",
  canopy_density: "medium",
  max_wind_mph: 10,
  min_temp_f: 45,
  max_temp_f: 85,
  avoid_rain_hours: 12,
  notify_email_spray_urgent: false,
  notify_email_verdict_daily: false,
};

type ConsentRow = {
  category: string;
  granted: boolean;
  granted_at: string | null;
  withdrawn_at: string | null;
};

type MemberRow = {
  id: string;
  role: string;
  user: { id: string; email: string; first_name?: string; last_name?: string };
  created_at: string;
};

const CONSENT_LABELS: Record<string, string> = {
  photo_for_training: "Use my photos and videos for ML training",
  spray_records_for_benchmarks: "Use my spray records for benchmarks",
  anonymized_aggregates: "Share anonymized aggregate insights",
  marketing_email: "Receive marketing email",
};

type TabId =
  | "program"
  | "privacy"
  | "export"
  | "delete"
  | "members"
  | "notifications"
  | "billing";

export default function SettingsPage() {
  const { org, authedFetch } = useActiveOrg();
  const { signOut } = useClerk();
  const [tab, setTab] = useState<TabId>("program");

  return (
    <div className="mx-auto max-w-4xl pb-24 md:pb-0">
      <h1 className="font-display text-3xl">Settings</h1>
      <p className="mt-2 max-w-2xl text-sm text-foreground/60">
        Organization program limits, account privacy, exports, and membership.
      </p>

      <nav className="mt-8 flex flex-wrap gap-2 border-b border-border/40 pb-3">
        {(
          [
            ["program", "Program"],
            ["privacy", "Privacy & consent"],
            ["export", "Export"],
            ["delete", "Delete account"],
            ["members", "Members"],
            ["notifications", "Notifications"],
            ["billing", "Billing"],
          ] as const
        ).map(([id, label]) => (
          <button
            key={id}
            type="button"
            onClick={() => setTab(id)}
            className={`rounded-md px-3 py-2 frame text-xs font-semibold transition-colors ${
              tab === id
                ? "bg-amber text-background"
                : "text-foreground/70 hover:text-foreground"
            }`}
          >
            {label}
          </button>
        ))}
      </nav>

      <div className="mt-8">
        {tab === "program" && (
          <ProgramTab orgId={org?.id ?? null} authedFetch={authedFetch} />
        )}
        {tab === "privacy" && <PrivacyTab authedFetch={authedFetch} />}
        {tab === "export" && <ExportTab authedFetch={authedFetch} />}
        {tab === "delete" && (
          <DeleteTab authedFetch={authedFetch} onSignedOut={() => signOut()} />
        )}
        {tab === "members" && (
          <MembersTab orgId={org?.id ?? null} authedFetch={authedFetch} />
        )}
        {tab === "notifications" && (
          <NotificationsTab orgId={org?.id ?? null} authedFetch={authedFetch} />
        )}
        {tab === "billing" && <BillingStub />}
      </div>
    </div>
  );
}

function ProgramTab({
  orgId,
  authedFetch,
}: {
  orgId: string | null;
  authedFetch: (path: string, init?: RequestInit) => Promise<Response>;
}) {
  const [settings, setSettings] = useState<ProgramSettings>(DEFAULT_SETTINGS);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!orgId) {
      setLoading(false);
      return;
    }
    let cancelled = false;
    async function load() {
      setLoading(true);
      const res = await authedFetch(`/api/spray/orgs/${orgId}/program-settings`);
      if (!res.ok) {
        setError("Settings are unavailable right now. Try again shortly.");
        setLoading(false);
        return;
      }
      const data = (await res.json()) as ProgramSettings;
      if (!cancelled) {
        setSettings(data);
        setLoading(false);
      }
    }
    load();
    return () => {
      cancelled = true;
    };
  }, [orgId, authedFetch]);

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!orgId) return;
    setSaving(true);
    setMessage(null);
    setError(null);
    try {
      const res = await authedFetch(`/api/spray/orgs/${orgId}/program-settings`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(settings),
      });
      if (!res.ok) throw new Error("Settings are unavailable right now. Try again shortly.");
      setSettings((await res.json()) as ProgramSettings);
      setMessage("Program settings saved.");
    } catch (e) {
      setError(e instanceof Error ? e.message : "Could not save settings.");
    } finally {
      setSaving(false);
    }
  }

  if (!orgId) {
    return <p className="text-sm text-foreground/60">Join an organization to edit program settings.</p>;
  }

  if (loading) {
    return <div className="h-64 animate-pulse rounded-md border border-border/40 bg-foreground/5" />;
  }

  return (
    <form
      onSubmit={submit}
      className="space-y-5 rounded-md border border-border/40 bg-background/40 p-5"
    >
      {message && (
        <p className="rounded-md border border-emerald-500/40 bg-emerald-500/10 p-3 text-sm text-emerald-300">
          {message}
        </p>
      )}
      {error && (
        <p className="rounded-md border border-red-500/50 bg-red-500/10 p-3 text-sm text-red-300">
          {error}
        </p>
      )}

      <div className="grid gap-4 md:grid-cols-2">
        <label className="block text-sm">
          <span className="text-foreground/60">Program type</span>
          <select
            value={settings.program_type}
            onChange={(e) =>
              setSettings((s) => ({ ...s, program_type: e.target.value }))
            }
            className="mt-1 w-full rounded-md border border-border/40 bg-background/60 px-3 py-2"
          >
            <option value="organic">Organic</option>
            <option value="conventional">Conventional</option>
            <option value="mixed">Mixed</option>
          </select>
        </label>
        <label className="block text-sm">
          <span className="text-foreground/60">Cultivar sensitivity</span>
          <select
            value={settings.cultivar_sensitivity}
            onChange={(e) =>
              setSettings((s) => ({
                ...s,
                cultivar_sensitivity: e.target.value,
              }))
            }
            className="mt-1 w-full rounded-md border border-border/40 bg-background/60 px-3 py-2"
          >
            <option value="low">Low</option>
            <option value="normal">Normal</option>
            <option value="high">High</option>
          </select>
        </label>
      </div>

      <label className="block text-sm">
        <span className="text-foreground/60">Allowed products</span>
        <textarea
          value={settings.allowed_products}
          onChange={(e) =>
            setSettings((s) => ({ ...s, allowed_products: e.target.value }))
          }
          placeholder="Example: sulfur, potassium bicarbonate, biological rotation..."
          className="mt-1 min-h-20 w-full rounded-md border border-border/40 bg-background/60 px-3 py-2"
        />
      </label>

      <label className="block text-sm">
        <span className="text-foreground/60">FRAC rotation notes</span>
        <textarea
          value={settings.frac_rotation}
          onChange={(e) =>
            setSettings((s) => ({ ...s, frac_rotation: e.target.value }))
          }
          className="mt-1 min-h-20 w-full rounded-md border border-border/40 bg-background/60 px-3 py-2"
        />
      </label>

      <div className="grid gap-4 md:grid-cols-2">
        <label className="block text-sm">
          <span className="text-foreground/60">Canopy density</span>
          <select
            value={settings.canopy_density}
            onChange={(e) =>
              setSettings((s) => ({ ...s, canopy_density: e.target.value }))
            }
            className="mt-1 w-full rounded-md border border-border/40 bg-background/60 px-3 py-2"
          >
            <option value="light">Light</option>
            <option value="medium">Medium</option>
            <option value="dense">Dense</option>
          </select>
        </label>
        <NumberField
          label="Max wind mph"
          value={settings.max_wind_mph}
          onChange={(max_wind_mph) =>
            setSettings((s) => ({ ...s, max_wind_mph }))
          }
        />
        <NumberField
          label="Min temp F"
          value={settings.min_temp_f}
          onChange={(min_temp_f) =>
            setSettings((s) => ({ ...s, min_temp_f }))
          }
        />
        <NumberField
          label="Max temp F"
          value={settings.max_temp_f}
          onChange={(max_temp_f) =>
            setSettings((s) => ({ ...s, max_temp_f }))
          }
        />
        <NumberField
          label="Avoid rain after spray (hours)"
          value={settings.avoid_rain_hours}
          onChange={(avoid_rain_hours) =>
            setSettings((s) => ({ ...s, avoid_rain_hours }))
          }
        />
      </div>

      <button
        type="submit"
        disabled={saving}
        className="rounded-md bg-amber px-4 py-2 frame text-xs font-semibold text-background hover:bg-amber/90 disabled:opacity-40"
      >
        {saving ? "Saving..." : "Save program"}
      </button>
    </form>
  );
}

function PrivacyTab({
  authedFetch,
}: {
  authedFetch: (path: string, init?: RequestInit) => Promise<Response>;
}) {
  const [rows, setRows] = useState<ConsentRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  const reload = useCallback(async () => {
    setLoading(true);
    setError(null);
    const res = await authedFetch("/api/spray/account/consent");
    if (!res.ok) {
      setError(`Could not load consent (${res.status}).`);
      setLoading(false);
      return;
    }
    setRows((await res.json()) as ConsentRow[]);
    setLoading(false);
  }, [authedFetch]);

  useEffect(() => {
    void reload();
  }, [reload]);

  async function toggle(category: string, granted: boolean) {
    setSaving(true);
    setError(null);
    try {
      const res = await authedFetch("/api/spray/account/consent", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify([{ category, granted }]),
      });
      if (!res.ok) throw new Error("Settings are unavailable right now. Try again shortly.");
      await reload();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Could not save consent.");
    } finally {
      setSaving(false);
    }
  }

  const categories = Object.keys(CONSENT_LABELS);

  return (
    <section className="rounded-md border border-border/40 bg-background/40 p-5">
      <h2 className="font-display text-xl">Privacy & consent</h2>
      <p className="mt-2 text-sm text-foreground/60">
        Control how your operational data may be used beyond running Spray for your team.
      </p>
      {loading && <p className="mt-6 text-sm text-foreground/50">Loading…</p>}
      {error && (
        <p className="mt-4 rounded-md border border-red-500/50 bg-red-500/10 p-3 text-sm text-red-300">
          {error}
        </p>
      )}
      <ul className="mt-6 space-y-4">
        {categories.map((cat) => {
          const row = rows.find((r) => r.category === cat);
          const granted = row?.granted ?? false;
          return (
            <li
              key={cat}
              className="flex flex-wrap items-center justify-between gap-3 rounded-md border border-border/30 bg-background/30 px-4 py-3"
            >
              <div>
                <p className="text-sm font-medium text-foreground/90">
                  {CONSENT_LABELS[cat] ?? cat}
                </p>
                <p className="mt-1 font-mono text-[0.65rem] text-foreground/45">{cat}</p>
              </div>
              <button
                type="button"
                disabled={saving}
                onClick={() => toggle(cat, !granted)}
                className={`min-h-[44px] rounded-md px-4 py-2 frame text-xs font-semibold ${
                  granted
                    ? "bg-emerald-500/20 text-emerald-200"
                    : "border border-border/50 text-foreground/70"
                }`}
              >
                {granted ? "On" : "Off"}
              </button>
            </li>
          );
        })}
      </ul>
    </section>
  );
}

function ExportTab({
  authedFetch,
}: {
  authedFetch: (path: string, init?: RequestInit) => Promise<Response>;
}) {
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function download() {
    setBusy(true);
    setError(null);
    try {
      const res = await authedFetch("/api/spray/account/export", {
        method: "POST",
      });
      if (!res.ok) throw new Error(`export ${res.status}`);
      const data = await res.json();
      const blob = new Blob([JSON.stringify(data, null, 2)], {
        type: "application/json",
      });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `graft-spray-export-${new Date().toISOString().slice(0, 10)}.json`;
      a.click();
      URL.revokeObjectURL(url);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Export failed.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <section className="rounded-md border border-border/40 bg-background/40 p-5">
      <h2 className="font-display text-xl">Data export</h2>
      <p className="mt-2 text-sm text-foreground/60">
        Download a JSON snapshot of your account, memberships, and consent records (M0-02
        synchronous export). Full photo zip and async jobs ship in a later milestone.
      </p>
      {error && (
        <p className="mt-4 rounded-md border border-red-500/50 bg-red-500/10 p-3 text-sm text-red-300">
          {error}
        </p>
      )}
      <button
        type="button"
        onClick={download}
        disabled={busy}
        className="mt-6 rounded-md bg-amber px-4 py-2 frame text-xs font-semibold text-background hover:bg-amber/90 disabled:opacity-40"
      >
        {busy ? "Preparing…" : "Download JSON export"}
      </button>
    </section>
  );
}

function DeleteTab({
  authedFetch,
  onSignedOut,
}: {
  authedFetch: (path: string, init?: RequestInit) => Promise<Response>;
  onSignedOut: () => void | Promise<void>;
}) {
  const [confirmText, setConfirmText] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function submit(event: FormEvent) {
    event.preventDefault();
    if (confirmText.toLowerCase() !== "delete") {
      setError('Type the word "delete" to confirm.');
      return;
    }
    setBusy(true);
    setError(null);
    try {
      const res = await authedFetch("/api/spray/account/delete", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ confirm: true }),
      });
      if (!res.ok) {
        const body = (await res.json().catch(() => ({}))) as { detail?: string };
        throw new Error(body.detail ?? `delete ${res.status}`);
      }
      await onSignedOut();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Could not delete account.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <section className="rounded-md border border-red-500/30 bg-red-500/5 p-5">
      <h2 className="font-display text-xl text-red-200">Delete account</h2>
      <p className="mt-2 text-sm text-foreground/70">
        Soft-deletes your user and archives solo-owned orgs per server rules. You will be
        signed out after a successful request.
      </p>
      {error && (
        <p className="mt-4 rounded-md border border-red-500/50 bg-red-500/10 p-3 text-sm text-red-300">
          {error}
        </p>
      )}
      <form onSubmit={submit} className="mt-6 space-y-4">
        <label className="block text-sm">
          <span className="text-foreground/60">Type delete to confirm</span>
          <input
            value={confirmText}
            onChange={(e) => setConfirmText(e.target.value)}
            className="mt-1 w-full rounded-md border border-border/40 bg-background/60 px-3 py-2"
            autoComplete="off"
          />
        </label>
        <button
          type="submit"
          disabled={busy}
          className="rounded-md border border-red-500/50 px-4 py-2 frame text-xs font-semibold text-red-200 hover:bg-red-500/10 disabled:opacity-40"
        >
          {busy ? "Deleting…" : "Delete my account"}
        </button>
      </form>
    </section>
  );
}

function MembersTab({
  orgId,
  authedFetch,
}: {
  orgId: string | null;
  authedFetch: (path: string, init?: RequestInit) => Promise<Response>;
}) {
  const [members, setMembers] = useState<MemberRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [inviteEmail, setInviteEmail] = useState("");
  const [inviteRole, setInviteRole] = useState("MEMBER");
  const [inviteMsg, setInviteMsg] = useState<string | null>(null);

  const reload = useCallback(async () => {
    if (!orgId) return;
    setLoading(true);
    const res = await authedFetch(`/api/spray/orgs/${orgId}/memberships`);
    if (!res.ok) {
      setError("Settings are unavailable right now. Try again shortly.");
      setLoading(false);
      return;
    }
    setMembers((await res.json()) as MemberRow[]);
    setLoading(false);
  }, [orgId, authedFetch]);

  useEffect(() => {
    if (!orgId) {
      setLoading(false);
      return;
    }
    void reload();
  }, [orgId, reload]);

  async function invite(e: FormEvent) {
    e.preventDefault();
    if (!orgId || !inviteEmail.trim()) return;
    setInviteMsg(null);
    setError(null);
    const res = await authedFetch(`/api/spray/orgs/${orgId}/invite`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email: inviteEmail.trim(), role: inviteRole }),
    });
    if (!res.ok) {
      const body = (await res.json().catch(() => ({}))) as { detail?: string };
      setError(body.detail ?? "Settings are unavailable right now. Try again shortly.");
      return;
    }
    setInviteEmail("");
    setInviteMsg("Member added. (Invite flow requires the user to exist in Spray already.)");
    await reload();
  }

  if (!orgId) {
    return <p className="text-sm text-foreground/60">No organization selected.</p>;
  }

  return (
    <section className="space-y-6">
      <div className="rounded-md border border-border/40 bg-background/40 p-5">
        <h2 className="font-display text-xl">Members</h2>
        <p className="mt-2 text-sm text-foreground/60">
          Owners and admins can add existing Spray users by email (account must already exist).
        </p>
        {loading && <p className="mt-4 text-sm text-foreground/50">Loading…</p>}
        {error && (
          <p className="mt-4 rounded-md border border-red-500/50 bg-red-500/10 p-3 text-sm text-red-300">
            {error}
          </p>
        )}
        {inviteMsg && (
          <p className="mt-4 rounded-md border border-emerald-500/40 bg-emerald-500/10 p-3 text-sm text-emerald-300">
            {inviteMsg}
          </p>
        )}
        <ul className="mt-4 space-y-2">
          {members.map((m) => (
            <li
              key={m.id}
              className="rounded-md border border-border/30 bg-background/30 px-3 py-2 text-sm"
            >
              <span className="font-medium">{m.user.email}</span>
              <span className="ml-2 text-xs uppercase tracking-wider text-foreground/50">
                {m.role}
              </span>
            </li>
          ))}
        </ul>
      </div>
      <form
        onSubmit={invite}
        className="rounded-md border border-border/40 bg-background/40 p-5"
      >
        <h3 className="frame text-xs font-semibold uppercase tracking-wider text-foreground/50">
          Add member
        </h3>
        <div className="mt-3 grid gap-3 md:grid-cols-2">
          <label className="block text-sm">
            <span className="text-foreground/60">Email</span>
            <input
              type="email"
              value={inviteEmail}
              onChange={(e) => setInviteEmail(e.target.value)}
              className="mt-1 w-full rounded-md border border-border/40 bg-background/60 px-3 py-2"
              required
            />
          </label>
          <label className="block text-sm">
            <span className="text-foreground/60">Role</span>
            <select
              value={inviteRole}
              onChange={(e) => setInviteRole(e.target.value)}
              className="mt-1 w-full rounded-md border border-border/40 bg-background/60 px-3 py-2"
            >
              <option value="MEMBER">Member</option>
              <option value="ADMIN">Admin</option>
              <option value="VIEWER">Viewer</option>
            </select>
          </label>
        </div>
        <button
          type="submit"
          className="mt-4 rounded-md bg-amber px-4 py-2 frame text-xs font-semibold text-background hover:bg-amber/90"
        >
          Add to organization
        </button>
      </form>
    </section>
  );
}

function NotificationsTab({
  orgId,
  authedFetch,
}: {
  orgId: string | null;
  authedFetch: (path: string, init?: RequestInit) => Promise<Response>;
}) {
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);
  const [prefs, setPrefs] = useState({
    notify_email_spray_urgent: false,
    notify_email_verdict_daily: false,
  });

  useEffect(() => {
    if (!orgId) {
      setLoading(false);
      return;
    }
    let cancelled = false;
    async function load() {
      setLoading(true);
      const res = await authedFetch(`/api/spray/orgs/${orgId}/program-settings`);
      if (!res.ok) {
        setError("Notification preferences unavailable right now.");
        setLoading(false);
        return;
      }
      const data = (await res.json()) as {
        notify_email_spray_urgent?: boolean;
        notify_email_verdict_daily?: boolean;
      };
      if (!cancelled) {
        setPrefs({
          notify_email_spray_urgent: data.notify_email_spray_urgent ?? false,
          notify_email_verdict_daily: data.notify_email_verdict_daily ?? false,
        });
        setLoading(false);
      }
    }
    void load();
    return () => {
      cancelled = true;
    };
  }, [orgId, authedFetch]);

  async function toggle(key: keyof typeof prefs) {
    if (!orgId) return;
    const next = { ...prefs, [key]: !prefs[key] };
    setSaving(key);
    setError(null);
    setMessage(null);
    try {
      const res = await authedFetch(`/api/spray/orgs/${orgId}/program-settings`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ [key]: next[key] }),
      });
      if (!res.ok) throw new Error("Could not save notification preferences.");
      setPrefs(next);
      setMessage("Saved.");
    } catch (e) {
      setError(e instanceof Error ? e.message : "Could not save.");
    } finally {
      setSaving(null);
    }
  }

  if (!orgId) {
    return (
      <p className="text-sm text-foreground/60">
        Join an organization to manage notification preferences.
      </p>
    );
  }

  if (loading) {
    return (
      <div className="h-48 animate-pulse rounded-md border border-border/40 bg-foreground/5" />
    );
  }

  const PREFS: {
    key: keyof typeof prefs;
    label: string;
    help: string;
  }[] = [
    {
      key: "notify_email_spray_urgent",
      label: "Email me when a block is urgent to spray",
      help: "Sends an email when any block verdict changes to Spray with 24h or Now urgency.",
    },
    {
      key: "notify_email_verdict_daily",
      label: "Daily email digest of all block recommendations",
      help: "One email per day summarizing the action (spray / scout / hold) for every active block.",
    },
  ];

  return (
    <section className="rounded-md border border-border/40 bg-background/40 p-5">
      <h2 className="font-display text-xl">Notifications</h2>
      <p className="mt-2 text-sm text-foreground/60">
        Email alerts for your organization&apos;s blocks. Sent to the address on your account.
      </p>
      {error && (
        <p className="mt-4 rounded-md border border-red-500/50 bg-red-500/10 p-3 text-sm text-red-300">
          {error}
        </p>
      )}
      {message && (
        <p className="mt-4 rounded-md border border-emerald-500/40 bg-emerald-500/10 p-3 text-sm text-emerald-300">
          {message}
        </p>
      )}
      <ul className="mt-6 space-y-3">
        {PREFS.map(({ key, label, help }) => (
          <li
            key={key}
            className="flex items-start justify-between gap-6 rounded-md border border-border/30 bg-background/30 px-4 py-3"
          >
            <div>
              <p className="text-sm font-medium text-foreground/90">{label}</p>
              <p className="mt-1 text-xs text-foreground/55">{help}</p>
            </div>
            <button
              type="button"
              disabled={saving === key}
              onClick={() => void toggle(key)}
              className={`shrink-0 min-h-[44px] rounded-md px-4 py-2 frame text-xs font-semibold transition-colors ${
                prefs[key]
                  ? "bg-emerald-500/20 text-emerald-200"
                  : "border border-border/50 text-foreground/70"
              } disabled:opacity-40`}
            >
              {saving === key ? "Saving…" : prefs[key] ? "On" : "Off"}
            </button>
          </li>
        ))}
      </ul>
    </section>
  );
}

function BillingStub() {
  return (
    <section className="rounded-md border border-border/40 bg-background/40 p-5">
      <h2 className="font-display text-xl">Billing</h2>
      <p className="mt-3 text-sm text-foreground/60">
        Stripe or managed billing is a product decision and is not wired in this pilot build.
        Enterprise pilots are coordinated offline with Graft.
      </p>
    </section>
  );
}

function NumberField({
  label,
  value,
  onChange,
}: {
  label: string;
  value: number;
  onChange: (value: number) => void;
}) {
  return (
    <label className="block text-sm">
      <span className="text-foreground/60">{label}</span>
      <input
        type="number"
        value={value}
        onChange={(e) => onChange(Number(e.target.value))}
        className="mt-1 w-full rounded-md border border-border/40 bg-background/60 px-3 py-2"
      />
    </label>
  );
}
