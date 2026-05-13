"use client";

import { useCallback, useEffect, useState } from "react";
import { useAuth } from "@clerk/nextjs";
import type { Verdict } from "@/components/spray/VerdictCard";

export type Membership = { org: { id: string; name: string } };
export type ActiveOrg = { id: string; name: string };

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

export type DashboardBlock = {
  id: string;
  name: string;
  vineyard_id: string;
  vineyard_name: string;
  variety: string;
  latest_verdict: Verdict | null;
  verdict_stale: boolean;
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
  vineyards: {
    id: string;
    name: string;
    region: string;
    is_demo: boolean;
  }[];
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
  return useCallback(
    async (path: string, init?: RequestInit) => {
      const token = await getToken();
      return fetch(path, {
        ...init,
        headers: {
          ...(init?.headers ?? {}),
          Authorization: `Bearer ${token}`,
        },
      });
    },
    [getToken],
  );
}

export function useActiveOrg() {
  const { isSignedIn } = useAuth();
  const authedFetch = useAuthedSprayFetch();
  const [org, setOrg] = useState<ActiveOrg | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const reload = useCallback(async () => {
    if (!isSignedIn) return;
    setLoading(true);
    setError(null);
    try {
      const res = await authedFetch("/api/spray/orgs/me");
      if (!res.ok) throw new Error(`orgs/me ${res.status}`);
      const data = (await res.json()) as { memberships: Membership[] };
      const first = data.memberships?.[0]?.org;
      setOrg(first ? { id: first.id, name: first.name } : null);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Could not load org.");
    } finally {
      setLoading(false);
    }
  }, [authedFetch, isSignedIn]);

  useEffect(() => {
    reload();
  }, [reload]);

  return { org, loading, error, reload, authedFetch };
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
      if (!res.ok) throw new Error(`dashboard-summary ${res.status}`);
      setSummary((await res.json()) as DashboardSummary);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Could not load dashboard.");
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
