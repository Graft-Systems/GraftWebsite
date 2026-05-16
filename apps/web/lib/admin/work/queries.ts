import { crmFetch } from "../api";

export async function listInboxTasks(
  _workspaceId: string,
  view: string,
  currentUserId: string,
) {
  const params = new URLSearchParams();
  params.append("view", view);
  params.append("user_id", currentUserId);

  return crmFetch(`/follow-up-tasks/?${params.toString()}`);
}

export async function listCompanyTasks(companyId: string) {
  return crmFetch(`/follow-up-tasks/?company_id=${companyId}`);
}

export async function listCompanyInteractions(companyId: string) {
  return crmFetch(`/interactions/?company_id=${companyId}`);
}

export async function getInboxCounts(_workspaceId: string, currentUserId: string) {
  return crmFetch(`/follow-up-tasks/counts/?user_id=${currentUserId}`);
}
