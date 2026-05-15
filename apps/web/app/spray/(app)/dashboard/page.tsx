"use client";

import Link from "next/link";
import { useCallback, useEffect, useMemo, useState } from "react";
import { Check, Circle } from "lucide-react";
import { useUser } from "@clerk/nextjs";
import { BlockInsightPanel } from "@/components/spray/BlockInsightPanel";
import { SprayMap, type BlockFeature } from "@/components/spray/SprayMap";
import {
  type DashboardBlock,
  type DashboardCapture,
  type DashboardSummary,
  type DashboardVineyard,
  type SetupSummary,
  useSprayDashboard,
} from "@/lib/sprayApi";
import { RISK_FILL_HEX, blockRiskBand } from "@/lib/spray/blockRiskColor";

const DASHBOARD_VINEYARD_STORAGE_KEY = "spray.dashboard.selectedVineyardId";

function pickDefaultVineyardId(
  vineyards: DashboardVineyard[],
  storedId: string | null,
): string | null {
  if (!vineyards.length) return null;
  if (storedId && vineyards.some((v) => v.id === storedId)) return storedId;
  return vineyards[0]?.id ?? null;
}

type GeoBlock = {
  id: string;
  name: string;
  geom: GeoJSON.Polygon | GeoJSON.MultiPolygon;
  archived_at: string | null;
};

type VineyardGeo = {
  id: string;
  name: string;
  centroid: GeoJSON.Point | null;
};

export default function SprayDashboardPage() {
  const { user } = useUser();
  const { summary, loading, error, reload, authedFetch } = useSprayDashboard();
  const [refreshingBlock, setRefreshingBlock] = useState<string | null>(null);
  const [selectedVineyardId, setSelectedVineyardId] = useState<string | null>(null);
  const [vineyardGeo, setVineyardGeo] = useState<VineyardGeo | null>(null);
  const [geoBlocks, setGeoBlocks] = useState<GeoBlock[]>([]);
  const [geoError, setGeoError] = useState<string | null>(null);
  const [geoLoading, setGeoLoading] = useState(false);
  const [selectedBlockId, setSelectedBlockId] = useState<string | null>(null);

  const greeting = user?.firstName
    ? `Welcome back, ${user.firstName}.`
    : "Welcome back.";
  const today = useMemo(() => classifyToday(summary?.blocks ?? []), [summary]);
  const setupIssueCount = useMemo(
    () =>
      summary
        ? buildSprayDashboardIssueLines(summary.setup, summary.blocks).length
        : 0,
    [summary],
  );

  useEffect(() => {
    if (!summary?.vineyards?.length) {
      setSelectedVineyardId(null);
      return;
    }
    const stored =
      typeof window !== "undefined"
        ? window.localStorage.getItem(DASHBOARD_VINEYARD_STORAGE_KEY)
        : null;
    setSelectedVineyardId((prev) => {
      if (prev && summary.vineyards.some((v) => v.id === prev)) return prev;
      return pickDefaultVineyardId(summary.vineyards, stored);
    });
  }, [summary?.vineyards]);

  useEffect(() => {
    if (!summary?.org?.id || !selectedVineyardId) {
      setVineyardGeo(null);
      setGeoBlocks([]);
      setGeoError(null);
      return;
    }
    const orgId = summary.org.id;
    let cancelled = false;
    setGeoLoading(true);
    setGeoError(null);
    void (async () => {
      try {
        const [vRes, bRes] = await Promise.all([
          authedFetch(`/api/spray/orgs/${orgId}/vineyards/${selectedVineyardId}`),
          authedFetch(`/api/spray/orgs/${orgId}/vineyards/${selectedVineyardId}/blocks`),
        ]);
        if (!vRes.ok || !bRes.ok) {
          if (!cancelled) setGeoError("Could not load vineyard map data.");
          return;
        }
        const vJson = (await vRes.json()) as VineyardGeo;
        const bJson = (await bRes.json()) as GeoBlock[];
        if (!cancelled) {
          setVineyardGeo(vJson);
          setGeoBlocks(bJson);
        }
      } catch {
        if (!cancelled) setGeoError("Could not load vineyard map data.");
      } finally {
        if (!cancelled) setGeoLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [summary?.org?.id, selectedVineyardId, authedFetch]);

  useEffect(() => {
    setSelectedBlockId(null);
  }, [selectedVineyardId]);

  const dashboardByBlockId = useMemo(() => {
    const m = new Map<string, DashboardBlock>();
    for (const b of summary?.blocks ?? []) m.set(b.id, b);
    return m;
  }, [summary?.blocks]);

  const blockFeatures: BlockFeature[] = useMemo(() => {
    return geoBlocks
      .filter((b) => b.archived_at === null)
      .map((b) => {
        const dash = dashboardByBlockId.get(b.id);
        const fillColor = dash ? RISK_FILL_HEX[blockRiskBand(dash)] : RISK_FILL_HEX.ok;
        return {
          id: b.id,
          name: b.name,
          geom: b.geom,
          archived: false,
          fillColor,
        };
      });
  }, [geoBlocks, dashboardByBlockId]);

  const mapCentroid: [number, number] | null = useMemo(() => {
    if (vineyardGeo?.centroid?.coordinates) {
      const [lng, lat] = vineyardGeo.centroid.coordinates;
      return [lng, lat];
    }
    const vmeta = summary?.vineyards?.find((v) => v.id === selectedVineyardId);
    if (vmeta?.centroid?.coordinates) {
      const [lng, lat] = vmeta.centroid.coordinates;
      return [lng, lat];
    }
    return null;
  }, [vineyardGeo, summary?.vineyards, selectedVineyardId]);

  const selectedDashboardBlock = useMemo(() => {
    if (!selectedBlockId || !summary) return null;
    return summary.blocks.find((b) => b.id === selectedBlockId) ?? null;
  }, [selectedBlockId, summary]);

  const noopPolygon = useCallback((_g: GeoJSON.Polygon) => {}, []);

  async function refreshDirective(blockId: string) {
    if (!summary) return;
    setRefreshingBlock(blockId);
    try {
      const res = await authedFetch(
        `/api/spray/orgs/${summary.org.id}/blocks/${blockId}/verdicts/recompute`,
        { method: "POST" },
      );
      const data = (await res.json().catch(() => ({}))) as {
        detail?: string;
        message?: string;
      };
      if (!res.ok) {
        window.alert(
          data.detail ??
            `This recommendation took too long to compute. Try again in a moment.`,
        );
        return;
      }
      await reload();
    } catch (e) {
      window.alert(
        e instanceof Error ? e.message : "Recommendation refresh failed",
      );
    } finally {
      setRefreshingBlock(null);
    }
  }

  function onVineyardChange(nextId: string) {
    setSelectedVineyardId(nextId);
    try {
      window.localStorage.setItem(DASHBOARD_VINEYARD_STORAGE_KEY, nextId);
    } catch {
      /* ignore */
    }
  }

  return (
    <div className="mx-auto max-w-6xl pb-24 md:pb-0">
      <header>
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div>
            <h1 className="font-display text-3xl">{greeting}</h1>
            <p className="mt-2 text-foreground/60">
              {summary?.org.name
                ? `Today’s mildew work for ${summary.org.name}.`
                : "Today’s mildew work for your blocks."}
            </p>
          </div>
          {summary?.org.is_demo && (
            <span className="rounded border border-amber/40 bg-amber/10 px-3 py-1 frame text-[0.65rem] font-semibold uppercase tracking-wider text-amber">
              Demo vineyard
            </span>
          )}
        </div>
      </header>

      {error && <ErrorState message={error} onRetry={reload} />}
      {loading && !error && <DashboardSkeleton />}

      {summary && (
        <>
          <section className="sticky top-16 z-20 mt-8 rounded-md border border-border/40 bg-background/95 p-4 shadow-sm backdrop-blur">
            <div className="grid gap-3 md:grid-cols-5">
              <Metric label="Spray" value={today.spray} tone="text-red-300" />
              <Metric label="Scout" value={today.scout} tone="text-amber" />
              <Metric label="Hold" value={today.hold} tone="text-emerald-300" />
              <Metric
                label="Setup & data notes"
                value={setupIssueCount}
                tone="text-foreground/70"
              />
              <PmiOrgMetric orgPmi={summary.org_pmi} />
            </div>
            {summary.latest_generated_at && (
              <p className="mt-3 text-xs text-foreground/50">
                Last recommendation generated{" "}
                {new Date(summary.latest_generated_at).toLocaleString()}.
              </p>
            )}
          </section>

          <SprayDataStatusPanel setup={summary.setup} blocks={summary.blocks} />

          {summary.blocks.length === 0 ? (
            <EmptyState
              title="No blocks yet"
              body="Create a vineyard and draw blocks before Graft Spray can make block-level directives."
              href="/spray/vineyards"
              cta="Create blocks"
            />
          ) : (
            <section className="mt-6 space-y-4">
              <div className="flex flex-wrap items-end justify-between gap-3">
                <div>
                  <p className="frame text-[0.65rem] font-semibold uppercase tracking-wider text-foreground/50">
                    Block risk map
                  </p>
                  <h2 className="mt-1 font-display text-xl text-foreground/90">
                    Hold · scout · spray by block
                  </h2>
                </div>
                {summary.vineyards.length > 0 && (
                  <label className="flex flex-col gap-1 text-xs text-foreground/60">
                    <span className="frame font-semibold uppercase tracking-wider text-foreground/45">
                      Vineyard
                    </span>
                    <select
                      value={selectedVineyardId ?? ""}
                      onChange={(e) => onVineyardChange(e.target.value)}
                      className="min-w-[12rem] rounded-md border border-border/40 bg-background/60 px-3 py-2 text-sm text-foreground/90"
                    >
                      {summary.vineyards.map((v) => (
                        <option key={v.id} value={v.id}>
                          {v.name}
                        </option>
                      ))}
                    </select>
                  </label>
                )}
              </div>

              <div className="flex flex-wrap gap-3 text-[0.65rem] text-foreground/55">
                <span className="inline-flex items-center gap-1.5">
                  <span className="h-2.5 w-2.5 rounded-sm" style={{ background: RISK_FILL_HEX.spray }} />
                  Spray
                </span>
                <span className="inline-flex items-center gap-1.5">
                  <span className="h-2.5 w-2.5 rounded-sm" style={{ background: RISK_FILL_HEX.scout }} />
                  Scout / check
                </span>
                <span className="inline-flex items-center gap-1.5">
                  <span className="h-2.5 w-2.5 rounded-sm" style={{ background: RISK_FILL_HEX.danger }} />
                  Hold + elevated risk
                </span>
                <span className="inline-flex items-center gap-1.5">
                  <span className="h-2.5 w-2.5 rounded-sm" style={{ background: RISK_FILL_HEX.ok }} />
                  All clear
                </span>
              </div>

              {geoError && (
                <p className="rounded-md border border-amber/40 bg-amber/10 px-3 py-2 text-sm text-amber">
                  {geoError}
                </p>
              )}
              {geoLoading && !geoError && (
                <div className="h-64 animate-pulse rounded-md border border-border/40 bg-foreground/5" />
              )}

              {!geoLoading && !geoError && selectedVineyardId && (
                <div className="grid min-h-0 gap-4 lg:grid-cols-[minmax(0,1.1fr)_minmax(0,0.9fr)] lg:items-stretch">
                  <SprayMap
                    className="min-h-[320px] lg:min-h-[420px]"
                    centroid={mapCentroid}
                    vineyardName={vineyardGeo?.name ?? null}
                    blocks={blockFeatures}
                    selectedBlockId={selectedBlockId}
                    editable={false}
                    showAddressSearch={false}
                    onBlockSelect={setSelectedBlockId}
                    onBlockCreate={noopPolygon}
                    onBlockUpdate={noopPolygon}
                  />
                  <BlockInsightPanel
                    orgId={summary.org.id}
                    block={selectedDashboardBlock}
                    refreshing={refreshingBlock === selectedBlockId}
                    onRefreshDirective={() =>
                      selectedBlockId && void refreshDirective(selectedBlockId)
                    }
                    authedFetch={authedFetch}
                    onDashboardReload={reload}
                  />
                </div>
              )}
            </section>
          )}

          <RecentCapturesStrip
            captures={summary.recent_captures ?? []}
            blocks={summary.blocks}
          />

          <details className="mt-6 rounded-md border border-border/40 bg-background/20 p-4">
            <summary className="cursor-pointer font-display text-lg text-foreground/80">
              Program, FRAC, and savings (pilot — not in active use)
            </summary>
            <div className="mt-4">
              <ProgramAndSavingsRow
                org={summary.org}
                fracProgram={summary.frac_program}
                pilotSavings={summary.pilot_savings}
              />
            </div>
          </details>
        </>
      )}
    </div>
  );
}

function classifyToday(blocks: DashboardBlock[]) {
  return blocks.reduce(
    (acc, block) => {
      const action = block.latest_verdict?.action;
      if (action === "spray") acc.spray += 1;
      else if (action === "scout") acc.scout += 1;
      else if (action === "hold") acc.hold += 1;
      return acc;
    },
    { spray: 0, scout: 0, hold: 0 },
  );
}

function blockLabelForCapture(
  blockId: string,
  blocks: DashboardBlock[],
): string {
  const b = blocks.find((row) => row.id === blockId);
  return b ? `${b.vineyard_name} · ${b.name}` : blockId.slice(0, 8);
}

function RecentCapturesStrip({
  captures,
  blocks,
}: {
  captures: DashboardCapture[];
  blocks: DashboardBlock[];
}) {
  if (!captures.length) return null;
  return (
    <section className="mt-8 rounded-md border border-border/40 bg-background/40 p-5">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <p className="frame text-[0.65rem] font-semibold uppercase tracking-wider text-foreground/50">
            Recent captures
          </p>
          <h2 className="mt-1 font-display text-xl">Latest field photos</h2>
        </div>
        <Link
          href="/spray/captures"
          className="frame text-xs font-semibold text-amber transition-colors hover:text-amber/80"
        >
          View all →
        </Link>
      </div>
      <ul className="mt-4 flex gap-3 overflow-x-auto pb-1" data-lenis-prevent>
        {captures.map((c) => (
          <li key={c.id} className="w-28 shrink-0">
            <Link
              href={`/spray/captures/${c.id}`}
              className="block overflow-hidden rounded-md border border-border/40 bg-background/60 transition-colors hover:border-amber/50"
            >
              {c.download_url ? (
                /* eslint-disable-next-line @next/next/no-img-element */
                <img
                  src={c.download_url}
                  alt=""
                  className="aspect-square w-full object-cover"
                />
              ) : (
                <div className="flex aspect-square items-center justify-center text-[0.65rem] text-foreground/40">
                  {c.status}
                </div>
              )}
              <p className="frame truncate px-1 py-1 text-[0.6rem] text-foreground/50">
                {c.vineyard_name && c.block_name
                  ? `${c.vineyard_name} · ${c.block_name}`
                  : blockLabelForCapture(c.block_id, blocks)}
              </p>
            </Link>
          </li>
        ))}
      </ul>
    </section>
  );
}

function ProgramAndSavingsRow({
  org,
  fracProgram,
  pilotSavings,
}: {
  org: {
    id: string;
    name: string;
    region: string;
    settings: Record<string, unknown>;
    is_demo: boolean;
  };
  fracProgram?: { frac_rotation: string; allowed_products: string };
  pilotSavings?: {
    headline?: string;
    amount_usd?: number | null;
    footnote?: string;
  };
}) {
  const program = (org.settings?.spray_program ?? {}) as Record<string, unknown>;
  const frac =
    fracProgram?.frac_rotation ||
    (typeof program.frac_rotation === "string" ? program.frac_rotation : "");
  const products =
    fracProgram?.allowed_products ||
    (typeof program.allowed_products === "string" ? program.allowed_products : "");
  const pct = org.settings?.pilot_savings_estimate_pct;
  const note = org.settings?.pilot_savings_estimate_note;
  const apiSavings = pilotSavings;

  return (
    <div className="grid gap-4 md:grid-cols-2">
      <section className="rounded-md border border-border/40 bg-background/40 p-5">
        <p className="frame text-[0.65rem] font-semibold uppercase tracking-wider text-foreground/50">
          Program & FRAC
        </p>
        <h2 className="mt-1 font-display text-lg">Spray program summary</h2>
        <p className="mt-2 text-sm text-foreground/60">
          {products ? (
            <>
              <span className="font-semibold text-foreground/75">Allowed products:</span>{" "}
              {products}
            </>
          ) : (
            "No allowed-products list yet — add materials in Settings."
          )}
        </p>
        {frac ? (
          <p className="mt-2 text-sm text-foreground/60">
            <span className="font-semibold text-foreground/75">FRAC / rotation:</span> {frac}
          </p>
        ) : (
          <p className="mt-2 text-sm text-foreground/50">No FRAC rotation notes on file.</p>
        )}
        <Link
          href="/spray/settings"
          className="mt-4 inline-flex frame text-xs font-semibold text-amber transition-colors hover:text-amber/80"
        >
          Edit in Settings →
        </Link>
      </section>
      <section className="rounded-md border border-border/40 bg-background/40 p-5">
        <p className="frame text-[0.65rem] font-semibold uppercase tracking-wider text-foreground/50">
          Savings (pilot)
        </p>
        <h2 className="mt-1 font-display text-lg">
          {apiSavings?.headline ?? "Estimated vs baseline"}
        </h2>
        {typeof apiSavings?.amount_usd === "number" ? (
          <p className="mt-3 font-display text-3xl text-amber">
            ${apiSavings.amount_usd.toLocaleString()}
          </p>
        ) : typeof pct === "number" ? (
          <p className="mt-3 font-display text-3xl text-amber">{pct}%</p>
        ) : (
          <p className="mt-3 text-sm text-foreground/50">No estimate configured for this org.</p>
        )}
        <p className="mt-2 text-xs text-foreground/55">
          {apiSavings?.footnote ||
            (typeof note === "string" && note.length > 0
              ? note
              : "Savings estimates are in beta.")}
        </p>
      </section>
    </div>
  );
}

function buildSprayDashboardIssueLines(
  setup: SetupSummary,
  blocks: DashboardBlock[],
): string[] {
  const lines: string[] = [];
  const c = setup.counts;
  if (c.unmapped_stations > 0) {
    lines.push(
      `${c.unmapped_stations} station${c.unmapped_stations === 1 ? "" : "s"} not linked to a block.`,
    );
  }
  if (c.stale_stations > 0) {
    lines.push(
      `${c.stale_stations} station${c.stale_stations === 1 ? "" : "s"} have stale readings.`,
    );
  }
  if (c.never_seen_stations > 0) {
    lines.push(
      `${c.never_seen_stations} station${c.never_seen_stations === 1 ? "" : "s"} have not reported readings yet.`,
    );
  }
  if (c.stale_integrations > 0) {
    lines.push(
      `${c.stale_integrations} active connection${c.stale_integrations === 1 ? "" : "s"} need a fresh health check.`,
    );
  }
  if (c.never_checked_integrations > 0) {
    lines.push(
      `${c.never_checked_integrations} active connection${c.never_checked_integrations === 1 ? "" : "s"} have not completed a health check yet.`,
    );
  }
  const staleVerdictBlocks = blocks.filter((b) => b.verdict_stale).length;
  if (staleVerdictBlocks > 0) {
    lines.push(
      `${staleVerdictBlocks} block${staleVerdictBlocks === 1 ? "" : "s"} have stale directives — refresh before trusting spray timing.`,
    );
  }
  const sprayWindowBlocked = blocks.filter((b) => {
    const w = b.latest_verdict?.directive?.spray_window;
    return b.latest_verdict?.action === "spray" && w?.status === "blocked";
  }).length;
  if (sprayWindowBlocked > 0) {
    lines.push(
      `${sprayWindowBlocked} block${sprayWindowBlocked === 1 ? "" : "s"} call for spray but the next window looks blocked — select the block on the map or check Forecasts for details.`,
    );
  }
  return lines;
}

function SprayDataStatusPanel({
  setup,
  blocks,
}: {
  setup: SetupSummary;
  blocks: DashboardBlock[];
}) {
  const c = setup.counts;
  const issueLines = buildSprayDashboardIssueLines(setup, blocks);
  const rows = [
    {
      label: "Vineyards",
      ok: c.vineyards > 0,
      detail: c.vineyards ? `${c.vineyards} created` : "None yet",
      href: "/spray/vineyards",
    },
    {
      label: "Blocks",
      ok: c.blocks > 0,
      detail: c.blocks ? `${c.blocks} drawn` : "None yet",
      href: "/spray/vineyards",
    },
    {
      label: "Sensor links",
      ok: c.active_integrations > 0,
      detail:
        c.active_integrations > 0
          ? `${c.active_integrations} active`
          : "None connected",
      href: "/spray/integrations",
    },
    {
      label: "Mapped stations",
      ok: c.mapped_stations > 0,
      detail:
        c.mapped_stations > 0
          ? `${c.mapped_stations} linked to blocks`
          : "None mapped",
      href: "/spray/integrations",
    },
  ] as const;

  return (
    <section className="mt-6 rounded-md border border-border/40 bg-background/40 p-4">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <p className="frame text-[0.65rem] font-semibold uppercase tracking-wider text-foreground/50">
          Setup & inputs
        </p>
        <Link
          href="/spray/integrations"
          className="frame text-[0.65rem] font-semibold text-amber hover:text-amber/80"
        >
          Integrations →
        </Link>
      </div>
      <div className="mt-3 flex flex-wrap gap-2">
        {rows.map((row) => (
          <Link
            key={row.label}
            href={row.href}
            className={`inline-flex min-w-[8.5rem] flex-1 items-start gap-2 rounded-md border px-3 py-2 text-left text-xs transition-colors ${
              row.ok
                ? "border-emerald-500/35 bg-emerald-500/10 text-foreground/80 hover:border-emerald-500/50"
                : "border-border/50 bg-background/30 text-foreground/65 hover:border-amber/40"
            }`}
          >
            <span className="mt-0.5 shrink-0 text-emerald-300" aria-hidden>
              {row.ok ? (
                <Check className="h-3.5 w-3.5" strokeWidth={2.5} />
              ) : (
                <Circle className="h-3.5 w-3.5 text-foreground/35" strokeWidth={2} />
              )}
            </span>
            <span className="min-w-0">
              <span className="frame block text-[0.6rem] font-semibold uppercase tracking-wider text-foreground/45">
                {row.label}
              </span>
              <span className="mt-0.5 block text-[0.7rem] leading-snug">{row.detail}</span>
            </span>
          </Link>
        ))}
      </div>
      {issueLines.length > 0 ? (
        <ul className="mt-3 list-disc space-y-1 border-t border-border/30 pt-3 pl-4 text-xs text-amber">
          {issueLines.map((line) => (
            <li key={line}>{line}</li>
          ))}
        </ul>
      ) : (
        <p className="mt-3 border-t border-border/30 pt-3 text-xs text-emerald-200/85">
          No active setup or data issues.
        </p>
      )}
    </section>
  );
}

function Metric({
  label,
  value,
  tone,
}: {
  label: string;
  value: number;
  tone: string;
}) {
  return (
    <div className="rounded-md border border-border/40 bg-background/40 p-3">
      <p className="frame text-[0.6rem] uppercase tracking-wider text-foreground/50">
        {label}
      </p>
      <p className={`mt-1 font-display text-2xl ${tone}`}>{value}</p>
    </div>
  );
}

function PmiOrgMetric({ orgPmi }: { orgPmi?: DashboardSummary["org_pmi"] }) {
  if (!orgPmi || orgPmi.max_pmi == null) {
    return (
      <div className="rounded-md border border-border/40 bg-background/40 p-3">
        <p className="frame text-[0.6rem] uppercase tracking-wider text-foreground/50">
          Worst PMI
        </p>
        <p className="mt-1 font-display text-lg text-foreground/45">—</p>
        <p className="mt-1 text-[0.65rem] text-foreground/50">
          <Link href="/spray/forecasts" className="text-amber hover:text-amber/80">
            Forecasts →
          </Link>
        </p>
      </div>
    );
  }
  const tierTone =
    orgPmi.max_pmi_tier === "high"
      ? "text-red-300"
      : orgPmi.max_pmi_tier === "moderate"
        ? "text-amber"
        : "text-emerald-300";
  return (
    <div className="rounded-md border border-border/40 bg-background/40 p-3">
      <p className="frame text-[0.6rem] uppercase tracking-wider text-foreground/50">
        Worst PMI
      </p>
      <p className={`mt-1 font-display text-2xl ${tierTone}`}>{orgPmi.max_pmi}</p>
      <p className="mt-0.5 frame text-[0.6rem] uppercase tracking-wider text-foreground/50">
        {orgPmi.max_pmi_tier} · {orgPmi.max_pmi_block_name}
      </p>
      <p className="mt-1 text-[0.65rem] text-foreground/50">
        <Link
          href="/spray/forecasts"
          className="font-semibold text-amber hover:text-amber/80"
        >
          See breakdown →
        </Link>
      </p>
    </div>
  );
}

function EmptyState({
  title,
  body,
  href,
  cta,
}: {
  title: string;
  body: string;
  href: string;
  cta: string;
}) {
  return (
    <div className="mt-12 rounded-md border border-dashed border-border/40 p-12 text-center">
      <h2 className="font-display text-xl">{title}</h2>
      <p className="mx-auto mt-2 max-w-xl text-sm text-foreground/60">{body}</p>
      <Link
        href={href}
        className="mt-5 inline-flex rounded-md bg-amber px-4 py-2 frame text-xs font-semibold text-background hover:bg-amber/90"
      >
        {cta}
      </Link>
    </div>
  );
}

function ErrorState({
  message,
  onRetry,
}: {
  message: string;
  onRetry: () => void;
}) {
  return (
    <div className="mt-6 rounded-md border border-red-500/50 bg-red-500/10 p-4 text-sm text-red-200">
      <p>{message}</p>
      <button
        type="button"
        onClick={onRetry}
        className="mt-3 frame text-xs font-semibold text-red-100 underline"
      >
        Retry
      </button>
    </div>
  );
}

function DashboardSkeleton() {
  return (
    <div className="mt-8 grid gap-4 md:grid-cols-3">
      {[0, 1, 2].map((item) => (
        <div
          key={item}
          className="h-48 animate-pulse rounded-md border border-border/40 bg-foreground/5"
        />
      ))}
    </div>
  );
}
