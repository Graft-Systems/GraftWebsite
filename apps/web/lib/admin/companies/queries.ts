import { crmFetch } from "@/lib/admin/api";
import { parseTags } from "@/lib/admin/crm";

export type CompanyListFilters = {
  q?: string;
  stageId?: string;
  tag?: string;
  ownerId?: string;
  staleDays?: number;
};

export async function listCompanies(
  _workspaceId: string,
  filters: CompanyListFilters = {},
) {
  const params = new URLSearchParams();
  if (filters.stageId) params.append("stage_id", filters.stageId);
  if (filters.ownerId) params.append("owner_id", filters.ownerId);
  if (filters.q) params.append("q", filters.q);
  if (filters.staleDays) params.append("stale_days", filters.staleDays.toString());

  const companies = await crmFetch(`/companies/?${params.toString()}`);

  if (!filters.tag) {
    return companies;
  }

  const tag = filters.tag.trim().toLowerCase();
  return companies.filter((company: any) =>
    parseTags(company.tags).some((value: string) => value.toLowerCase() === tag),
  );
}

export async function getCompany(_workspaceId: string, companyId: string) {
  return crmFetch(`/companies/${companyId}/`);
}

export async function listWorkspaceUsers(_workspaceId: string) {
  return crmFetch(`/crm-profiles/`);
}

export async function listRelationshipStages(_workspaceId: string) {
  return crmFetch(`/relationship-stages/`);
}

export async function listKnownTags(_workspaceId: string) {
  return crmFetch(`/companies/tags/`);
}

/** Minimal list for dropdowns (competitions / investors add-from-pipeline). */
export async function listCompanySelectOptions(_workspaceId: string) {
  return crmFetch(`/companies/options/`);
}
