import { crmFetch } from "../api";
import {
  listWorkspaceUsers,
  type CompanyContactRow,
  type WorkspaceUserRow,
} from "../companies/queries";

function unwrapRows(data: unknown): Record<string, unknown>[] {
  if (Array.isArray(data)) {
    return data as Record<string, unknown>[];
  }
  if (data && typeof data === "object" && Array.isArray((data as { results?: unknown }).results)) {
    return (data as { results: Record<string, unknown>[] }).results;
  }
  return [];
}

export type DealRow = {
  id: string;
  name: string;
  stage: string;
};

export type InvestorProfileRow = {
  fundName: string | null;
  checkSizeBand: string | null;
  thesisTags: unknown;
  warmIntroSource: string | null;
  stage: string;
  nextStep: string | null;
  notes: string | null;
};

export async function listCompanyDeals(companyId: string): Promise<DealRow[]> {
  const data = await crmFetch(`/deals/?company_id=${companyId}`);
  return unwrapRows(data).map((row) => ({
    id: String(row.id),
    name: String(row.name ?? ""),
    stage: String(row.stage ?? "open"),
  }));
}

export async function listCompanyPilots(companyId: string) {
  return crmFetch(`/pilots/?company_id=${companyId}`);
}

export async function getCompanyInvestorProfile(
  companyId: string,
): Promise<InvestorProfileRow | null> {
  try {
    const row = await crmFetch(`/investor-profiles/${companyId}/`);
    if (!row || typeof row !== "object") {
      return null;
    }
    const profile = row as Record<string, unknown>;
    return {
      fundName: (profile.fund_name as string | null) ?? null,
      checkSizeBand: (profile.check_size_band as string | null) ?? null,
      thesisTags: profile.thesis_tags ?? [],
      warmIntroSource: (profile.warm_intro_source as string | null) ?? null,
      stage: String(profile.stage ?? "prospecting"),
      nextStep: (profile.next_step as string | null) ?? null,
      notes: (profile.notes as string | null) ?? null,
    };
  } catch {
    return null;
  }
}

export async function getCompanyPartnerProfile(companyId: string) {
  return crmFetch(`/partner-profiles/${companyId}/`);
}

export async function listDeals(_workspaceId: string, filters: Record<string, unknown> = {}) {
  const params = new URLSearchParams();
  if (filters.ownerId) params.append("owner_id", String(filters.ownerId));
  if (filters.stage) params.append("stage", String(filters.stage));
  if (filters.openOnly) params.append("open_only", "true");

  return crmFetch(`/deals/?${params.toString()}`);
}

export async function listPilots(_workspaceId: string, filters: Record<string, unknown> = {}) {
  const params = new URLSearchParams();
  if (filters.ownerId) params.append("owner_id", String(filters.ownerId));
  if (filters.status) params.append("status", String(filters.status));
  if (filters.activeOnly) params.append("active_only", "true");

  return crmFetch(`/pilots/?${params.toString()}`);
}

export async function listInvestors(_workspaceId: string, filters: Record<string, unknown> = {}) {
  const params = new URLSearchParams();
  if (filters.stage) params.append("stage", String(filters.stage));

  return crmFetch(`/investor-profiles/?${params.toString()}`);
}

export async function listPartners(_workspaceId: string, filters: Record<string, unknown> = {}) {
  const params = new URLSearchParams();
  if (filters.programStatus) {
    params.append("program_status", String(filters.programStatus));
  }
  if (filters.ownerId) params.append("owner_id", String(filters.ownerId));

  return crmFetch(`/partner-profiles/?${params.toString()}`);
}

export type { CompanyContactRow, WorkspaceUserRow };
