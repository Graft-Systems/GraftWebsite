"use client";

import { FormEvent, Suspense, useEffect, useMemo, useState } from "react";
import { useSearchParams } from "next/navigation";
import { type SprayRecord, useActiveOrg, useVineyardsAndBlocks } from "@/lib/sprayApi";

type SprayForm = {
  block: string;
  verdict: string;
  applied_at: string;
  product: string;
  rate: string;
  target_disease: string;
  rei_hours: string;
  phi_days: string;
  applicator: string;
  notes: string;
};

const blankForm = (): SprayForm => ({
  block: "",
  verdict: "",
  applied_at: localDateTimeValue(new Date()),
  product: "",
  rate: "",
  target_disease: "both",
  rei_hours: "",
  phi_days: "",
  applicator: "",
  notes: "",
});

export default function SprayRecordsPage() {
  return (
    <Suspense
      fallback={
        <div className="mx-auto max-w-6xl pb-24 md:pb-0">
          <div className="h-48 animate-pulse rounded-md border border-border/40 bg-foreground/5" />
        </div>
      }
    >
      <SprayRecordsContent />
    </Suspense>
  );
}

function SprayRecordsContent() {
  const searchParams = useSearchParams();
  const { org, authedFetch } = useActiveOrg();
  const { blocks, vineyards, loading: blocksLoading } = useVineyardsAndBlocks();
  const [records, setRecords] = useState<SprayRecord[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [form, setForm] = useState<SprayForm>(() => ({
    ...blankForm(),
    block: searchParams.get("block") ?? "",
    verdict: searchParams.get("verdict") ?? "",
    target_disease: searchParams.get("target") ?? "both",
  }));
  const [filters, setFilters] = useState({
    vineyard_id: "",
    block_id: searchParams.get("block") ?? "",
    date_from: "",
    date_to: "",
  });

  useEffect(() => {
    const block = searchParams.get("block") ?? "";
    const verdict = searchParams.get("verdict") ?? "";
    const target = searchParams.get("target") ?? "";
    setForm((f) => ({
      ...f,
      block: block || f.block,
      verdict: verdict || f.verdict,
      target_disease: target || f.target_disease,
    }));
    setFilters((f) => ({ ...f, block_id: block || f.block_id }));
  }, [searchParams]);

  const selectedBlock = useMemo(
    () => blocks.find((block) => block.id === form.block),
    [blocks, form.block],
  );

  const recordRollup = useMemo(() => {
    if (!records?.length) return null;
    const products = new Set(records.map((r) => r.product).filter(Boolean));
    return { count: records.length, products: products.size };
  }, [records]);

  useEffect(() => {
    if (!org) return;
    void loadRecords();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [org, filters.vineyard_id, filters.block_id, filters.date_from, filters.date_to]);

  async function loadRecords() {
    if (!org) return;
    setError(null);
    const params = new URLSearchParams();
    Object.entries(filters).forEach(([key, value]) => {
      if (value) params.set(key, value);
    });
    const suffix = params.toString() ? `?${params.toString()}` : "";
    const res = await authedFetch(`/api/spray/orgs/${org.id}/spray-records${suffix}`);
    if (!res.ok) {
      setError("Spray records are unavailable right now. Try again shortly.");
      return;
    }
    const data = (await res.json()) as { results: SprayRecord[] };
    setRecords(data.results);
  }

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!org) return;
    setSaving(true);
    setError(null);
    try {
      const payload = toPayload(form);
      const path = editingId
        ? `/api/spray/orgs/${org.id}/spray-records/${editingId}`
        : `/api/spray/orgs/${org.id}/spray-records`;
      const res = await authedFetch(path, {
        method: editingId ? "PATCH" : "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      if (!res.ok) throw new Error("Spray records are unavailable right now. Try again shortly.");
      setForm(blankForm());
      setEditingId(null);
      await loadRecords();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Could not save spray record.");
    } finally {
      setSaving(false);
    }
  }

  async function archiveRecord(record: SprayRecord) {
    if (!org) return;
    const ok = window.confirm(`Archive ${record.product} on ${record.block_name}?`);
    if (!ok) return;
    const res = await authedFetch(
      `/api/spray/orgs/${org.id}/spray-records/${record.id}`,
      { method: "DELETE" },
    );
    if (!res.ok) {
      setError("Spray records are unavailable right now. Try again shortly.");
      return;
    }
    await loadRecords();
  }

  function editRecord(record: SprayRecord) {
    setEditingId(record.id);
    setForm({
      block: record.block,
      verdict: record.verdict ?? "",
      applied_at: localDateTimeValue(new Date(record.applied_at)),
      product: record.product,
      rate: record.rate,
      target_disease: record.target_disease,
      rei_hours: record.rei_hours?.toString() ?? "",
      phi_days: record.phi_days?.toString() ?? "",
      applicator: record.applicator,
      notes: record.notes,
    });
  }

  return (
    <div className="mx-auto grid max-w-6xl gap-6 pb-24 lg:grid-cols-[0.85fr_1.15fr] md:pb-0">
      <section>
        <h1 className="font-display text-3xl">Spray records</h1>
        <p className="mt-2 text-sm text-foreground/60">
          Log field applications so each recommendation has a usable operational trail.
        </p>

        {selectedBlock && (
          <p className="mt-4 rounded-md border border-amber/30 bg-amber/10 px-3 py-2 text-xs text-amber">
            Recording for {selectedBlock.vineyard_name} · {selectedBlock.name}.
          </p>
        )}

        <form
          onSubmit={submit}
          className="mt-6 space-y-4 rounded-md border border-border/40 bg-background/40 p-5"
        >
          {error && (
            <p className="rounded-md border border-red-500/50 bg-red-500/10 p-3 text-sm text-red-300">
              {error}
            </p>
          )}
          <label className="block text-sm">
            <span className="text-foreground/60">Block</span>
            <select
              value={form.block}
              onChange={(e) => setForm((f) => ({ ...f, block: e.target.value }))}
              className="mt-1 w-full rounded-md border border-border/40 bg-background/60 px-3 py-2"
              required
            >
              <option value="">{blocksLoading ? "Loading blocks..." : "Select a block"}</option>
              {blocks.map((block) => (
                <option key={block.id} value={block.id}>
                  {block.vineyard_name} · {block.name}
                </option>
              ))}
            </select>
          </label>
          <input type="hidden" value={form.verdict} readOnly />
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
          <div className="flex flex-wrap gap-3">
            <button
              type="submit"
              disabled={saving || !form.block || !form.product}
              className="rounded-md bg-amber px-4 py-2 frame text-xs font-semibold text-background hover:bg-amber/90 disabled:opacity-40"
            >
              {saving ? "Saving..." : editingId ? "Save changes" : "Record spray"}
            </button>
            {editingId && (
              <button
                type="button"
                onClick={() => {
                  setEditingId(null);
                  setForm(blankForm());
                }}
                className="rounded-md border border-border/40 px-4 py-2 frame text-xs font-semibold text-foreground/70 hover:text-foreground"
              >
                Cancel edit
              </button>
            )}
          </div>
        </form>
      </section>

      <section>
        <div className="flex flex-wrap items-end justify-between gap-3">
          <div>
            <h2 className="frame text-xs font-semibold uppercase tracking-wider text-foreground/60">
              Recent applications
            </h2>
            <p className="mt-1 text-xs text-foreground/50">
              Filter records by vineyard, block, or application date.
            </p>
            {recordRollup && (
              <p className="mt-2 text-xs text-foreground/55">
                Showing {recordRollup.count} record
                {recordRollup.count === 1 ? "" : "s"} across {recordRollup.products} product
                {recordRollup.products === 1 ? "" : "s"}.
              </p>
            )}
          </div>
          <button
            type="button"
            onClick={loadRecords}
            className="rounded-md border border-border/40 px-3 py-2 frame text-xs font-semibold text-foreground/70 hover:text-foreground"
          >
            Refresh
          </button>
        </div>

        <div className="mt-4 grid gap-3 rounded-md border border-border/40 bg-background/30 p-4 md:grid-cols-2">
          <SelectField
            label="Vineyard"
            value={filters.vineyard_id}
            onChange={(vineyard_id) =>
              setFilters((f) => ({ ...f, vineyard_id, block_id: "" }))
            }
            options={vineyards.map((vineyard) => ({
              value: vineyard.id,
              label: vineyard.name,
            }))}
            emptyLabel="All vineyards"
          />
          <SelectField
            label="Block"
            value={filters.block_id}
            onChange={(block_id) => setFilters((f) => ({ ...f, block_id }))}
            options={blocks
              .filter((block) => !filters.vineyard_id || block.vineyard_id === filters.vineyard_id)
              .map((block) => ({
                value: block.id,
                label: `${block.vineyard_name} · ${block.name}`,
              }))}
            emptyLabel="All blocks"
          />
          <TextField label="From" value={filters.date_from} onChange={(date_from) => setFilters((f) => ({ ...f, date_from }))} type="date" />
          <TextField label="To" value={filters.date_to} onChange={(date_to) => setFilters((f) => ({ ...f, date_to }))} type="date" />
        </div>

        {records === null && !error && (
          <div className="mt-4 h-40 animate-pulse rounded-md border border-border/40 bg-foreground/5" />
        )}
        {records && records.length === 0 && (
          <p className="mt-6 rounded-md border border-dashed border-border/40 p-8 text-center text-sm text-foreground/60">
            No spray records yet. After you spray, log it here to track your season.
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
                  {record.rate || "No rate entered"} · {targetLabel(record.target_disease)}
                  {record.rei_hours ? ` · REI ${record.rei_hours}h` : ""}
                  {record.phi_days ? ` · PHI ${record.phi_days}d` : ""}
                </p>
                <p className="mt-1 text-xs text-foreground/55">{phiReiLine(record)}</p>
                {record.notes && (
                  <p className="mt-2 text-sm text-foreground/60">{record.notes}</p>
                )}
                <div className="mt-3 flex gap-4 border-t border-border/30 pt-3">
                  <button
                    type="button"
                    onClick={() => editRecord(record)}
                    className="frame text-xs font-semibold text-amber hover:text-amber/80"
                  >
                    Edit
                  </button>
                  <button
                    type="button"
                    onClick={() => archiveRecord(record)}
                    className="frame text-xs font-semibold text-foreground/50 hover:text-foreground"
                  >
                    Archive
                  </button>
                </div>
              </li>
            ))}
          </ul>
        )}
      </section>
    </div>
  );
}

function toPayload(form: SprayForm) {
  return {
    ...form,
    verdict: form.verdict || null,
    applied_at: new Date(form.applied_at).toISOString(),
    rei_hours: form.rei_hours ? Number(form.rei_hours) : null,
    phi_days: form.phi_days ? Number(form.phi_days) : null,
  };
}

function localDateTimeValue(date: Date) {
  const offsetMs = date.getTimezoneOffset() * 60_000;
  return new Date(date.getTime() - offsetMs).toISOString().slice(0, 16);
}

function targetLabel(value: string) {
  if (value === "powdery") return "Powdery mildew";
  if (value === "downy") return "Downy mildew";
  if (value === "both") return "Powdery + downy mildew";
  return "Other";
}

function phiReiLine(record: SprayRecord): string {
  const applied = new Date(record.applied_at);
  const now = Date.now();
  if (record.rei_hours) {
    const end = applied.getTime() + record.rei_hours * 3600000;
    if (now < end) {
      return `REI active until ${new Date(end).toLocaleString()}`;
    }
  }
  if (record.phi_days) {
    const end = new Date(applied);
    end.setDate(end.getDate() + record.phi_days);
    if (now < end.getTime()) {
      return `PHI active through ${end.toLocaleDateString()}`;
    }
  }
  if (record.rei_hours || record.phi_days) {
    return "REI / PHI window clear — always verify against the product label.";
  }
  return "Add REI and PHI from the label to see live countdowns.";
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

function SelectField({
  label,
  value,
  onChange,
  options,
  emptyLabel,
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
  options: { value: string; label: string }[];
  emptyLabel: string;
}) {
  return (
    <label className="block text-sm">
      <span className="text-foreground/60">{label}</span>
      <select
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="mt-1 w-full rounded-md border border-border/40 bg-background/60 px-3 py-2"
      >
        <option value="">{emptyLabel}</option>
        {options.map((option) => (
          <option key={option.value} value={option.value}>
            {option.label}
          </option>
        ))}
      </select>
    </label>
  );
}
