"use client";

import { FormEvent, useEffect, useState } from "react";
import { type ProgramSettings, useActiveOrg } from "@/lib/sprayApi";

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
};

export default function SettingsPage() {
  const { org, authedFetch } = useActiveOrg();
  const [settings, setSettings] = useState<ProgramSettings>(DEFAULT_SETTINGS);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!org) return;
    const orgId = org.id;
    let cancelled = false;
    async function load() {
      setLoading(true);
      const res = await authedFetch(`/api/spray/orgs/${orgId}/program-settings`);
      if (!res.ok) {
        setError(`settings ${res.status}`);
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
  }, [authedFetch, org]);

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!org) return;
    setSaving(true);
    setMessage(null);
    setError(null);
    try {
      const res = await authedFetch(`/api/spray/orgs/${org.id}/program-settings`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(settings),
      });
      if (!res.ok) throw new Error(`save ${res.status}`);
      setSettings((await res.json()) as ProgramSettings);
      setMessage("Program settings saved.");
    } catch (e) {
      setError(e instanceof Error ? e.message : "Could not save settings.");
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="mx-auto max-w-4xl pb-24 md:pb-0">
      <h1 className="font-display text-3xl">Settings</h1>
      <p className="mt-2 max-w-2xl text-sm text-foreground/60">
        These limits shape directive language and keep spray-window guidance
        aligned with the vineyard program.
      </p>

      {loading ? (
        <div className="mt-8 h-64 animate-pulse rounded-md border border-border/40 bg-foreground/5" />
      ) : (
        <form
          onSubmit={submit}
          className="mt-8 space-y-5 rounded-md border border-border/40 bg-background/40 p-5"
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
      )}
    </div>
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
