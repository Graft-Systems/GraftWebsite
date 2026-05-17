import { crmFetch } from "@/lib/admin/api";

export type EmailDigestRow = {
  id: string;
  subject: string;
  sentAt: Date | null;
  createdAt: Date;
  recipientEmail: string;
  recipient: { name: string | null; email: string };
  taskCount: number;
  meetingCount: number;
  error: string | null;
  status: string;
};

function unwrapRows(data: unknown): Record<string, unknown>[] {
  if (Array.isArray(data)) {
    return data as Record<string, unknown>[];
  }
  if (data && typeof data === "object" && Array.isArray((data as { results?: unknown }).results)) {
    return (data as { results: Record<string, unknown>[] }).results;
  }
  return [];
}

function mapDigest(row: Record<string, unknown>): EmailDigestRow {
  const recipientRaw = row.recipient;
  const recipient =
    recipientRaw && typeof recipientRaw === "object"
      ? {
          name: ((recipientRaw as Record<string, unknown>).name as string | null) ?? null,
          email: String((recipientRaw as Record<string, unknown>).email ?? row.recipient_email ?? ""),
        }
      : {
          name: null,
          email: String(row.recipient_email ?? ""),
        };

  return {
    id: String(row.id),
    subject: String(row.subject ?? ""),
    sentAt: row.sent_at ? new Date(String(row.sent_at)) : null,
    createdAt: new Date(String(row.created_at ?? Date.now())),
    recipientEmail: String(row.recipient_email ?? recipient.email),
    recipient,
    taskCount: Number(row.task_count ?? 0),
    meetingCount: Number(row.meeting_count ?? 0),
    error: (row.error as string | null) ?? null,
    status: String(row.status ?? "pending"),
  };
}

export async function listRecentDigests(
  _workspaceId: string,
  take = 10,
): Promise<EmailDigestRow[]> {
  const digests = await crmFetch(`/email-digests/?limit=${take}`);
  return unwrapRows(digests).slice(0, take).map(mapDigest);
}

export async function getDigestById(_workspaceId: string, digestId: string) {
  const digest = await crmFetch(`/email-digests/${digestId}/`);
  return digest && typeof digest === "object"
    ? mapDigest(digest as Record<string, unknown>)
    : null;
}
