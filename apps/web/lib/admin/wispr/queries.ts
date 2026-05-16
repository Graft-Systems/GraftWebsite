import { crmFetch } from "../api";

export async function getWisprConnectionForUser(userId: string) {
  const connections = await crmFetch(
    `/wispr-connections/?clerk_user_id=${encodeURIComponent(userId)}`,
  );
  const rows = Array.isArray(connections) ? connections : connections?.results ?? [];
  return rows[0] ?? null;
}

export async function listWisprIngests(
  _workspaceId: string,
  options: { status?: string; mineUserId?: string } = {},
) {
  const params = new URLSearchParams();
  if (options.status) params.append("status", options.status);
  if (options.mineUserId) params.append("user_id", options.mineUserId);

  return crmFetch(`/wispr-ingests/?${params.toString()}`);
}

export async function getWisprIngest(_workspaceId: string, ingestId: string) {
  return crmFetch(`/wispr-ingests/${ingestId}/`);
}

export async function listWisprIngestsForCompany(
  _workspaceId: string,
  companyId: string,
) {
  return crmFetch(`/wispr-ingests/?company_id=${companyId}`);
}
