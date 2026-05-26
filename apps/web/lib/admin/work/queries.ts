import { crmFetch } from "../api";
import {
  listWorkspaceUsers,
  type CompanyContactRow,
  type WorkspaceUserRow,
} from "../companies/queries";

export type InteractionRow = {
  id: string;
  type: string;
  source: string;
  occurredAt: Date;
  notes: string | null;
  transcript: string | null;
  aiSummary: string | null;
  aiNeeds: unknown;
  aiStageHint: string | null;
  aiTagHints: unknown;
  contact: { id: string; name: string } | null;
  createdBy: { name: string | null; email: string };
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

function mapInteraction(
  row: Record<string, unknown>,
  users: WorkspaceUserRow[],
  contacts: CompanyContactRow[],
): InteractionRow {
  const createdById = row.created_by != null ? String(row.created_by) : "";
  const creator = users.find((user) => user.id === createdById);
  const contactId = row.contact != null ? String(row.contact) : null;
  const contact = contactId
    ? contacts.find((item) => item.id === contactId) ?? null
    : null;

  return {
    id: String(row.id),
    type: String(row.type ?? "other"),
    source: String(row.source ?? "manual"),
    occurredAt: new Date(String(row.occurred_at ?? Date.now())),
    notes: (row.notes as string | null) ?? null,
    transcript: (row.transcript as string | null) ?? null,
    aiSummary: (row.ai_summary as string | null) ?? null,
    aiNeeds: row.ai_needs ?? null,
    aiStageHint: (row.ai_stage_hint as string | null) ?? null,
    aiTagHints: row.ai_tag_hints ?? null,
    contact: contact ? { id: contact.id, name: contact.name } : null,
    createdBy: {
      name: creator?.name ?? null,
      email: creator?.email ?? "Unknown",
    },
  };
}

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

export type TaskRow = {
  id: string;
  title: string;
  description: string | null;
  status: string;
  dueAt: Date | null;
  owner: { id: string; name: string | null; email: string } | null;
  contact: { id: string; name: string } | null;
  deal: { id: string; name: string } | null;
};

export async function listCompanyTasks(companyId: string): Promise<TaskRow[]> {
  const workspaceId = "00000000-0000-4000-8000-000000000001";
  const [tasksRaw, contactsRaw, dealsRaw, users] = await Promise.all([
    crmFetch(`/follow-up-tasks/?company_id=${companyId}`),
    crmFetch(`/contacts/?company_id=${companyId}`),
    crmFetch(`/deals/?company_id=${companyId}`),
    listWorkspaceUsers(workspaceId),
  ]);

  const contacts = unwrapRows(contactsRaw).map((row) => ({
    id: String(row.id),
    name: String(row.name ?? ""),
  }));
  const deals = unwrapRows(dealsRaw).map((row) => ({
    id: String(row.id),
    name: String(row.name ?? ""),
  }));

  return unwrapRows(tasksRaw).map((row) => {
    const ownerId = row.owner != null ? String(row.owner) : null;
    const owner = ownerId ? users.find((user) => user.id === ownerId) ?? null : null;
    const contactId = row.contact != null ? String(row.contact) : null;
    const contact = contactId
      ? contacts.find((item) => item.id === contactId) ?? null
      : null;
    const dealId = row.deal != null ? String(row.deal) : null;
    const deal = dealId ? deals.find((item) => item.id === dealId) ?? null : null;

    return {
      id: String(row.id),
      title: String(row.title ?? ""),
      description: (row.description as string | null) ?? null,
      status: String(row.status ?? "open"),
      dueAt: row.due_at ? new Date(String(row.due_at)) : null,
      owner: owner
        ? { id: owner.id, name: owner.name, email: owner.email }
        : null,
      contact,
      deal,
    };
  });
}

export async function listCompanyInteractions(companyId: string): Promise<InteractionRow[]> {
  const workspaceId = "00000000-0000-4000-8000-000000000001";
  const [interactionsRaw, contactsRaw, users] = await Promise.all([
    crmFetch(`/interactions/?company_id=${companyId}`),
    crmFetch(`/contacts/?company_id=${companyId}`),
    listWorkspaceUsers(workspaceId),
  ]);

  const contacts = unwrapRows(contactsRaw).map((row) => ({
    id: String(row.id),
    name: String(row.name ?? ""),
    email: (row.email as string | null) ?? null,
    phone: (row.phone as string | null) ?? null,
    linkedinUrl: (row.linkedin_url as string | null) ?? null,
    title: (row.title as string | null) ?? null,
    contactRole: (row.contact_role as string | null) ?? null,
    isPrimary: Boolean(row.is_primary),
    notes: (row.notes as string | null) ?? null,
  }));

  return unwrapRows(interactionsRaw)
    .map((row) => mapInteraction(row, users, contacts))
    .sort((left, right) => right.occurredAt.getTime() - left.occurredAt.getTime());
}

export async function getInboxCounts(_workspaceId: string, currentUserId: string) {
  return crmFetch(`/follow-up-tasks/counts/?user_id=${currentUserId}`);
}
