"use client";

import { FormEvent, useEffect, useState } from "react";
import { type SprayRecord, useActiveOrg, useVineyardsAndBlocks } from "@/lib/sprayApi";

export default function SprayRecordsPage() {
  const { org, authedFetch } = useActiveOrg();
  const { blocks, loading: blocksLoading } = useVineyardsAndBlocks();
  const [records, setRecords] = useState<SprayRecord[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState({
    block: "",
    applied_at: new Date().toISOString().slice(0, 16),
    product: "",
    rate: "",
    target_disease: "both",
    rei_hours: "",
    phi_days: "",
    applicator: "",
    notes: "",
  });

  useEffect(() => {
    if (!org) return;
    const orgId = org.id;
    let cancelled = false;
    async function load() {
      const res = await authedFetch(`/api/spray/orgs/${orgId}/spray-records`);
      if (!res.ok) {
        setError(`spray records ${res.status}`);
        return;
      }
      const data = (await res.json()) as { results: SprayRecord[] };
      if (!cancelled) setRecords(data.results);
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
    setError(null);
    try {
      const payload = {
        ...form,
        applied_at: new Date(form.applied_at).toISOString(),
        rei_hours: form.rei_hours ? Number(form.rei_hours) : null,
        phi_days: form.phi_days ? Number(form.phi_days) : null,
      };
      const res = await authedFetch(`/api/spray/orgs/${org.id}/spray-records`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      if (!res.ok) throw new Error(`save ${res.status}`);
      const created = (await res.json()) as SprayRecord;
      setRecords((prev) => [created, ...(prev ?? [])]);
      setForm((prev) => ({
        ...prev,
        product: "",
        rate: "",
        rei_hours: "",
        phi_days: "",
        notes: "",
      }));
    } catch (e) {
      setError(e instanceof Error ? e.message : "Could not save spray record.");
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="mx-auto grid max-w-6xl gap-6 pb-24 lg:grid-cols-[0.85fr_1.15fr] md:pb-0">
      <section>
        <h1 className="font-display text-3xl">Spray records</h1>
        <p className="mt-2 text-sm text-foreground/60">
          Log field applications so each directive has a usable operational
          trail.
        </p>

        <form
          onSubmit={submit}
          className="mt-6 space-y-4 rounded-md border border-border/40 bg-background/40 p-5"
        >
          <label className="block text-sm">
            <span className="text-foreground/60">Block</span>
            <select
              value={form.block}
              onChange={(e) => setForm((f) => ({ ...f, block: e.target.value }))}
              className="mt-1 w-full rounded-md border border-border/40 bg-background/60 px-3 py-2"
              required
            >
              <option value="">
                {blocksLoading ? "Loading blocks..." : "Select a block"}
              </option>
              {blocks.map((block) => (
                <option key={block.id} value={block.id}>
                  {block.vineyard_name} · {block.name}
                </option>
              ))}
            </select>
          </label>
          <label className="block text-sm">
            <span className="text-foreground/60">Applied at</span>
            <input
              type="datetime-local"
              value={form.applied_at}
              onChange={(e) => setForm((f) => ({ ...f, applied_at: e.target.value }))}
              className="mt-1 w-full rounded-md border border-border/40 bg-background/60 px-3 py-2"
              required
            />
          </label>
          <div className="grid gap-3 md:grid-cols-2">
            <TextField label="Product" value={form.product} onChange={(product) => setForm((f) => ({ ...f, product }))} required />
            <TextField label="Rate" value={form.rate} onChange={(rate) => setForm((f) => ({ ...f, rate }))} />
          </div>
          <label className="block text-sm">
            <span className="text-foreground/60">Target</span>
            <select
              value={form.target_disease}
              onChange={(e) => setForm((f) => ({ ...f, target_disease: e.target.value }))}
              className="mt-1 w-full rounded-md border border-border/40 bg-background/60 px-3 py-2"
            >
              <option value="both">Powdery + downy mildew</option>
              <option value="powdery">Powdery mildew</option>
              <option value="downy">Downy mildew</option>
              <option value="other">Other</option>
            </select>
          </label>
          <div className="grid gap-3 md:grid-cols-2">
            <TextField label="REI hours" value={form.rei_hours} onChange={(rei_hours) => setForm((f) => ({ ...f, rei_hours }))} type="number" />
            <TextField label="PHI days" value={form.phi_days} onChange={(phi_days) => setForm((f) => ({ ...f, phi_days }))} type="number" />
          </div>
          <TextField label="Applicator" value={form.applicator} onChange={(applicator) => setForm((f) => ({ ...f, applicator }))} />
          <label className="block text-sm">
            <span className="text-foreground/60">Notes</span>
            <textarea
              value={form.notes}
              onChange={(e) => setForm((f) => ({ ...f, notes: e.target.value }))}
              className="mt-1 min-h-24 w-full rounded-md border border-border/40 bg-background/60 px-3 py-2"
            />
          </label>
          <button
            type="submit"
            disabled={saving || !form.block || !form.product}
            className="rounded-md bg-amber px-4 py-2 frame text-xs font-semibold text-background hover:bg-amber/90 disabled:opacity-40"
          >
            {saving ? "Saving..." : "Record spray"}
          </button>
        </form>
      </section>

      <section>
        <h2 className="frame text-xs font-semibold uppercase tracking-wider text-foreground/60">
          Recent applications
        </h2>
        {error && (
          <p className="mt-4 rounded-md border border-red-500/50 bg-red-500/10 p-3 text-sm text-red-300">
            {error}
          </p>
        )}
        {records === null && !error && (
          <div className="mt-4 h-40 animate-pulse rounded-md border border-border/40 bg-foreground/5" />
        )}
        {records && records.length === 0 && (
          <p className="mt-6 rounded-md border border-dashed border-border/40 p-8 text-center text-sm text-foreground/60">
            No spray records yet. Log the next application here after the field
            team completes it.
          </p>
        )}
        {records && records.length > 0 && (
          <ul className="mt-4 space-y-3">
            {records.map((record) => (
              <li
                key={record.id}
                className="rounded-md border border-border/40 bg-background/40 p-4"
              >
                <div className="flex flex-wrap justify-between gap-3">
                  <div>
                    <p className="font-display text-lg">{record.product}</p>
                    <p className="text-sm text-foreground/60">
                      {record.vineyard_name} · {record.block_name}
                    </p>
                  </div>
                  <p className="text-xs text-foreground/50">
                    {new Date(record.applied_at).toLocaleString()}
                  </p>
                </div>
                <p className="mt-2 text-sm text-foreground/70">
                  {record.rate || "No rate entered"} · {record.target_disease}
                  {record.rei_hours ? ` · REI ${record.rei_hours}h` : ""}
                  {record.phi_days ? ` · PHI ${record.phi_days}d` : ""}
                </p>
                {record.notes && (
                  <p className="mt-2 text-sm text-foreground/60">{record.notes}</p>
                )}
              </li>
            ))}
          </ul>
        )}
      </section>
    </div>
  );
}

function TextField({
  label,
  value,
  onChange,
  type = "text",
  required = false,
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
  type?: string;
  required?: boolean;
}) {
  return (
    <label className="block text-sm">
      <span className="text-foreground/60">{label}</span>
      <input
        type={type}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="mt-1 w-full rounded-md border border-border/40 bg-background/60 px-3 py-2"
        required={required}
      />
    </label>
  );
}
