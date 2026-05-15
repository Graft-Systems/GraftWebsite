"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { useAuth } from "@clerk/nextjs";
import type { Verdict, PowderyPmiProfile } from "@/components/spray/VerdictCard";

export type Membership = {
  org: { id: string; name: string };
  role: string;
};
export type ActiveOrg = { id: string; name: string; role?: string };

/** Vineyard DELETE (archive) requires org OWNER or ADMIN per API. */
export function orgCanArchiveVineyards(org: ActiveOrg | null): boolean {
  const r = org?.role;
  return r === "OWNER" || r === "ADMIN";
}

export type SetupStep = {
  id: string;
  label: string;
  complete: boolean;
  href: string;
};

export type SetupSummary = {
  counts: {
    vineyards: number;
    blocks: number;
    active_integrations: number;
    mapped_stations: number;
    verdicts: number;
    unmapped_stations: number;
    stale_stations: number;
    stale_integrations: number;
    never_seen_stations: number;
    never_checked_integrations: number;
  };
  steps: SetupStep[];
  warnings: string[];
};

export type PmiHistoryDay = {
  date: string;
  pmi: number;
  tier: string;
  phase: string;
  details: Record<string, unknown>;
};

/** Visual Crossing daily rollup from ``/blocks/<id>/forecast-weather``. */
export type BlockForecastWeatherDay = {
  date: string;
  temp_max_f: number | null;
  wind_max_mph: number | null;
  precip_mm: number | null;
  precip_prob_max: number | null;
};

export type BlockForecastWeatherResponse = {
  available: boolean;
  detail?: string;
  attribution?: string;
  days: BlockForecastWeatherDay[];
};

export type LatestPmiExplain = {
  headline: string;
  rules_applied_last_day: string[];
  data_sources: Record<string, unknown>;
  link_to_forecasts: string;
};

export type DashboardBlock = {
  id: string;
  name: string;
  vineyard_id: string;
  vineyard_name: string;
  variety: string;
  /** ISO date (YYYY-MM-DD) when set; needed for PMI trend and rollup context. */
  budbreak_date?: string | null;
  latest_verdict: Verdict | null;
  verdict_stale: boolean;
  latest_pmi?: number | null;
  latest_pmi_tier?: string | null;
  latest_pmi_date?: string | null;
  latest_pmi_phase?: string | null;
  pmi_history_14d?: PmiHistoryDay[];
  latest_pmi_explain?: LatestPmiExplain | null;
  powdery_pmi_profile?: PowderyPmiProfile | null;
};

export type DashboardCapture = {
  id: string;
  block_id: string;
  block_name?: string;
  vineyard_name?: string;
  kind: string;
  size_bytes: number | null;
  mime_type: string;
  taken_at: string | null;
  uploaded_at: string | null;
  status: string;
  download_url: string | null;
  created_at: string;
};

export type PilotSavingsSummary = {
  headline?: string;
  amount_usd?: number | null;
  footnote?: string;
};

export type FracProgramSummary = {
  frac_rotation: string;
  allowed_products: string;
};

export type DashboardVineyard = {
  id: string;
  name: string;
  region: string;
  is_demo: boolean;
  created_at: string;
  centroid: { type: "Point"; coordinates: [number, number] } | null;
};

export type BlockSensorReadingsResponse = {
  block_id: string;
  hours: number;
  since_utc: string;
  stations: { id: string; name: string; vendor_station_id: string }[];
  readings: {
    station_id: string;
    station_name: string;
    ts: string;
    air_temp_c: number | null;
    rh_pct: number | null;
    leaf_wetness_min: number | null;
    precip_mm: number | null;
    wind_speed_ms: number | null;
    quality_flag: string;
  }[];
  readings_total: number;
  readings_truncated: boolean;
};

export type DashboardSummary = {
  org: {
    id: string;
    name: string;
    region: string;
    settings: Record<string, unknown>;
    is_demo: boolean;
  };
  setup: SetupSummary;
  vineyards: DashboardVineyard[];
  blocks: DashboardBlock[];
  integrations: {
    id: string;
    vendor: string;
    vendor_account_id: string;
    status: string;
    health_status: string;
    last_health_at: string | null;
    last_health_detail: string;
  }[];
  stations: {
    id: string;
    name: string;
    vendor: string;
    last_seen_at: string | null;
    status: string;
    linked_block_ids: string[];
    linked_block_names: string[];
  }[];
  latest_generated_at: string | null;
  generated_at: string;
  recent_captures: DashboardCapture[];
  frac_program?: FracProgramSummary;
  pilot_savings?: PilotSavingsSummary;
  org_pmi?: {
    max_pmi: number | null;
    max_pmi_tier: string | null;
    max_pmi_block_name: string | null;
  };
};

export type VineyardBlock = {
  id: string;
  name: string;
  vineyard_id: string;
  vineyard_name: string;
};

export type SprayRecord = {
  id: string;
  block: string;
  block_name: string;
  vineyard_name: string;
  verdict: string | null;
  applied_at: string;
  product: string;
  rate: string;
  target_disease: string;
  rei_hours: number | null;
  phi_days: number | null;
  applicator: string;
  notes: string;
  created_at: string;
  updated_at: string;
  archived_at: string | null;
};

export type WeatherStation = {
  id: string;
  provider: string;
  station_id: string;
  name: string;
  location: { type: "Point"; coordinates: [number, number] };
  is_regional_default: boolean;
  region: string;
  settings: Record<string, unknown>;
  created_at: string;
  last_pull_at: string | null;
};

export type WeatherFeedCurrent = {
  available: boolean;
  temp_c: number | null;
  temp_f: number | null;
  rh_pct: number | null;
  observed_at: string | null;
  source: "live" | "cached" | null;
  detail: string | null;
};

export type WeatherFeedMeta = {
  name: string;
  coordinates: [number, number];
  provider: string;
  is_regional_default: boolean;
};

export type WeatherStationResponse = {
  results: WeatherStation[];
  feed: WeatherFeedMeta | null;
  current: WeatherFeedCurrent;
};

export type ProgramSettings = {
  program_type: string;
  allowed_products: string;
  frac_rotation: string;
  cultivar_sensitivity: string;
  canopy_density: string;
  max_wind_mph: number;
  min_temp_f: number;
  max_temp_f: number;
  avoid_rain_hours: number;
};

export function useAuthedSprayFetch() {
  const { getToken } = useAuth();
  // Clerk's getToken is not referentially stable; a ref keeps useCallback
  // stable so effects that depend on authedFetch do not refetch in a loop.
  const getTokenRef = useRef(getToken);
  getTokenRef.current = getToken;
  return useCallback(async (path: string, init?: RequestInit) => {
    const token = await getTokenRef.current();
    return fetch(path, {
      ...init,
      headers: {
        ...(init?.headers ?? {}),
        Authorization: `Bearer ${token}`,
      },
    });
  }, []);
}

/** Human-readable message from a failed Spray API response (reads body once). */
export async function formatSprayHttpError(res: Response): Promise<string> {
  const code = res.status;
  let snippet = "";
  try {
    const data: unknown = await res.json();
    if (data && typeof data === "object") {
      const d = data as Record<string, unknown>;
      if (typeof d.detail === "string") snippet = d.detail;
      else if (Array.isArray(d.detail)) snippet = JSON.stringify(d.detail);
      else if (typeof d.message === "string") snippet = d.message;
    }
  } catch {
    /* non-JSON body */
  }
  const prefix = `${code}`;
  if (code >= 500) {
    const base =
      "The Spray service returned a server error. Your profile is fine — try again shortly. If it persists, contact support.";
    return snippet ? `${prefix}: ${snippet}\n${base}` : `${prefix}: ${base}`;
  }
  if (code === 401 || code === 403) {
    return snippet
      ? `${prefix}: ${snippet}`
      : `${prefix}: Session may have expired — try signing out and back in.`;
  }
  if (snippet) return `${prefix}: ${snippet}`;
  return `${prefix}: Request could not be completed.`;
}

export function useActiveOrg() {
  const { isSignedIn } = useAuth();
  const authedFetch = useAuthedSprayFetch();
  const [org, setOrg] = useState<ActiveOrg | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  /** True after a successful `orgs/me` with zero memberships (not an HTTP error). */
  const [needsOrg, setNeedsOrg] = useState(false);

  const reload = useCallback(async () => {
    if (!isSignedIn) {
      setLoading(false);
      setOrg(null);
      setError(null);
      setNeedsOrg(false);
      return;
    }
    setLoading(true);
    setError(null);
    setNeedsOrg(false);
    try {
      const res = await authedFetch("/api/spray/orgs/me");
      if (!res.ok) {
        setOrg(null);
        setError(await formatSprayHttpError(res));
        return;
      }
      const data = (await res.json()) as { memberships?: Membership[] };
      const list = data.memberships ?? [];
      if (list.length === 0) {
        setOrg(null);
        setNeedsOrg(true);
        return;
      }
      const first = list[0];
      const o = first?.org;
      setOrg(
        o
          ? { id: o.id, name: o.name, role: first.role }
          : null,
      );
      setNeedsOrg(!first);
    } catch (e) {
      setOrg(null);
      setError(
        e instanceof Error ? e.message : "Could not reach the Spray service.",
      );
    } finally {
      setLoading(false);
    }
  }, [authedFetch, isSignedIn]);

  useEffect(() => {
    void reload();
  }, [reload]);

  return { org, loading, error, needsOrg, reload, authedFetch };
}

export function useSprayDashboard() {
  const { org, loading: orgLoading, error: orgError, reload, authedFetch } =
    useActiveOrg();
  const [summary, setSummary] = useState<DashboardSummary | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const reloadSummary = useCallback(async () => {
    if (!org) {
      setSummary(null);
      setLoading(false);
      return;
    }
    setLoading(true);
    setError(null);
    try {
      const res = await authedFetch(
        `/api/spray/orgs/${org.id}/dashboard-summary`,
      );
      if (!res.ok) {
        setError(await formatSprayHttpError(res));
        return;
      }
      setSummary((await res.json()) as DashboardSummary);
    } catch (e) {
      setError(
        e instanceof Error ? e.message : "Could not reach the Spray service.",
      );
    } finally {
      setLoading(false);
    }
  }, [authedFetch, org]);

  useEffect(() => {
    reloadSummary();
  }, [reloadSummary]);

  return {
    org,
    summary,
    loading: orgLoading || loading,
    error: orgError ?? error,
    reload: async () => {
      await reload();
      await reloadSummary();
    },
    authedFetch,
  };
}

export function useVineyardsAndBlocks() {
  const { summary, loading, error, reload } = useSprayDashboard();
  const blocks: VineyardBlock[] =
    summary?.blocks.map((block) => ({
      id: block.id,
      name: block.name,
      vineyard_id: block.vineyard_id,
      vineyard_name: block.vineyard_name,
    })) ?? [];
  return {
    org: summary?.org ?? null,
    vineyards: summary?.vineyards ?? [],
    blocks,
    loading,
    error,
    reload,
  };
}

export function useIntegrationsHealth() {
  const { summary, loading, error, reload } = useSprayDashboard();
  return {
    integrations: summary?.integrations ?? [],
    stations: summary?.stations ?? [],
    loading,
    error,
    reload,
  };
}
