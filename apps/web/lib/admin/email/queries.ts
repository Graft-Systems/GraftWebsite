import { crmFetch } from "@/lib/admin/api";

export async function listRecentDigests(_workspaceId: string, take = 10) {
  const digests = await crmFetch(`/email-digests/?limit=${take}`);
  if (!Array.isArray(digests)) {
    return digests?.results ?? [];
  }
  return digests.slice(0, take);
}

export async function getDigestById(_workspaceId: string, digestId: string) {
  return crmFetch(`/email-digests/${digestId}/`);
}
