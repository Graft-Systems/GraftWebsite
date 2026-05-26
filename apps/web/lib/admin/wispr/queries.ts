import { crmFetch } from "../api";
import {
  enrichWisprIngestCompanies,
  mapWisprIngest,
  mapWisprIngestList,
  type WisprIngestRow,
} from "./types";

export type { WisprIngestRow };

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
): Promise<WisprIngestRow[]> {
  const params = new URLSearchParams();
  if (options.status) params.append("status", options.status);
  if (options.mineUserId) params.append("user_id", options.mineUserId);

  const data = await crmFetch(`/wispr-ingests/?${params.toString()}`);
  return mapWisprIngestList(data);
}

export async function getWisprIngest(_workspaceId: string, ingestId: string) {
  const data = await crmFetch(`/wispr-ingests/${ingestId}/`);
  return data ? mapWisprIngest(data as Record<string, unknown>) : null;
}

export async function listWisprIngestsForCompany(
  _workspaceId: string,
  companyId: string,
  companies: { id: string; name: string }[] = [],
): Promise<WisprIngestRow[]> {
  const data = await crmFetch(`/wispr-ingests/?company_id=${companyId}`);
  return enrichWisprIngestCompanies(mapWisprIngestList(data), companies);
}
