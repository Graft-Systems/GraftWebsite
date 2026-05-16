import { crmFetch } from "../api";

export async function listCompanyDeals(companyId: string) {
  return crmFetch(`/deals/?company_id=${companyId}`);
}

export async function listCompanyPilots(companyId: string) {
  return crmFetch(`/pilots/?company_id=${companyId}`);
}

export async function getCompanyInvestorProfile(companyId: string) {
  return crmFetch(`/investor-profiles/${companyId}/`);
}

export async function getCompanyPartnerProfile(companyId: string) {
  return crmFetch(`/partner-profiles/${companyId}/`);
}

export async function listDeals(_workspaceId: string, filters: any = {}) {
  const params = new URLSearchParams();
  if (filters.ownerId) params.append("owner_id", filters.ownerId);
  if (filters.stage) params.append("stage", filters.stage);
  if (filters.openOnly) params.append("open_only", "true");

  return crmFetch(`/deals/?${params.toString()}`);
}

export async function listPilots(_workspaceId: string, filters: any = {}) {
  const params = new URLSearchParams();
  if (filters.ownerId) params.append("owner_id", filters.ownerId);
  if (filters.status) params.append("status", filters.status);
  if (filters.activeOnly) params.append("active_only", "true");

  return crmFetch(`/pilots/?${params.toString()}`);
}

export async function listInvestors(_workspaceId: string, filters: any = {}) {
  const params = new URLSearchParams();
  if (filters.stage) params.append("stage", filters.stage);

  return crmFetch(`/investor-profiles/?${params.toString()}`);
}

export async function listPartners(_workspaceId: string, filters: any = {}) {
  const params = new URLSearchParams();
  if (filters.programStatus) params.append("program_status", filters.programStatus);
  if (filters.ownerId) params.append("owner_id", filters.ownerId);

  return crmFetch(`/partner-profiles/?${params.toString()}`);
}
