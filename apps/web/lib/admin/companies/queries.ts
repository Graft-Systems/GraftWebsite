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

export type CompanyContactRow = {
  id: string;
  name: string;
  email: string | null;
  phone: string | null;
  linkedinUrl: string | null;
  title: string | null;
  contactRole: string | null;
  isPrimary: boolean;
  notes: string | null;
};

export type CompanyDetail = {
  id: string;
  name: string;
  website: string | null;
  domain: string | null;
  description: string | null;
  tags: unknown;
  needs: string | null;
  updatedAt: string;
  relationshipStageId: string | null;
  accountOwnerId: string;
  relationshipStage: { id: string; key: string; label: string } | null;
  accountOwner: { id: string; name: string | null; email: string };
  contacts: CompanyContactRow[];
};

export type WorkspaceUserRow = {
  id: string;
  name: string | null;
  email: string;
  role: string;
  clerkId: string | null;
  lastSignInAt: Date | null;
};

function mapContact(row: Record<string, unknown>): CompanyContactRow {
  return {
    id: String(row.id),
    name: String(row.name ?? ""),
    email: (row.email as string | null) ?? null,
    phone: (row.phone as string | null) ?? null,
    linkedinUrl: (row.linkedin_url as string | null) ?? null,
    title: (row.title as string | null) ?? null,
    contactRole: (row.contact_role as string | null) ?? null,
    isPrimary: Boolean(row.is_primary),
    notes: (row.notes as string | null) ?? null,
  };
}

export async function getCompany(
  workspaceId: string,
  companyId: string,
): Promise<CompanyDetail | null> {
  const [raw, contactsRaw, stages, users] = await Promise.all([
    crmFetch(`/companies/${companyId}/`),
    crmFetch(`/contacts/?company_id=${companyId}`),
    listRelationshipStages(workspaceId),
    listWorkspaceUsers(workspaceId),
  ]);

  if (!raw || typeof raw !== "object") {
    return null;
  }

  const company = raw as Record<string, unknown>;
  const contactRows = Array.isArray(contactsRaw)
    ? contactsRaw
    : (contactsRaw as { results?: Record<string, unknown>[] })?.results ?? [];

  const relationshipStageId = company.relationship_stage
    ? String(company.relationship_stage)
    : null;
  const relationshipStage =
    stages.find((stage) => stage.id === relationshipStageId) ?? null;

  const accountOwnerId = String(company.account_owner ?? "");
  const ownerProfile = users.find((user) => user.id === accountOwnerId);

  return {
    id: String(company.id),
    name: String(company.name ?? ""),
    website: (company.website as string | null) ?? null,
    domain: (company.domain as string | null) ?? null,
    description: (company.description as string | null) ?? null,
    tags: company.tags ?? [],
    needs: (company.needs as string | null) ?? null,
    updatedAt: String(company.updated_at ?? new Date().toISOString()),
    relationshipStageId,
    accountOwnerId,
    relationshipStage: relationshipStage
      ? {
          id: relationshipStage.id,
          key: relationshipStage.key,
          label: relationshipStage.label,
        }
      : null,
    accountOwner: {
      id: accountOwnerId,
      name: ownerProfile?.name ?? null,
      email: ownerProfile?.email ?? "Unknown",
    },
    contacts: contactRows.map((row) => mapContact(row as Record<string, unknown>)),
  };
}

export async function listWorkspaceUsers(
  _workspaceId: string,
): Promise<WorkspaceUserRow[]> {
  const data = await crmFetch(`/crm-profiles/`);
  const rows = Array.isArray(data) ? data : data?.results ?? [];
  return rows.map((row: Record<string, unknown>) => ({
    id: String(row.id),
    name: (row.name as string | null) ?? null,
    email: String(row.email ?? ""),
    role: String(row.role ?? "member"),
    clerkId: (row.clerk_id as string | null) ?? null,
    lastSignInAt: row.last_sign_in_at
      ? new Date(String(row.last_sign_in_at))
      : null,
  }));
}

export type RelationshipStageRow = {
  id: string;
  key: string;
  label: string;
  sortOrder: number;
};

export async function listRelationshipStages(
  _workspaceId: string,
): Promise<RelationshipStageRow[]> {
  const data = await crmFetch(`/relationship-stages/`);
  const rows = Array.isArray(data) ? data : data?.results ?? [];
  return rows.map((row: Record<string, unknown>) => ({
    id: String(row.id),
    key: String(row.key ?? ""),
    label: String(row.label ?? ""),
    sortOrder: Number(row.sort_order ?? 0),
  }));
}

export async function listKnownTags(_workspaceId: string): Promise<string[]> {
  const data = await crmFetch(`/companies/tags/`);
  if (Array.isArray(data)) {
    return data.map((tag) => String(tag));
  }
  if (data && typeof data === "object" && Array.isArray((data as { tags?: unknown }).tags)) {
    return (data as { tags: unknown[] }).tags.map((tag) => String(tag));
  }
  return [];
}

/** Minimal list for dropdowns (competitions / investors add-from-pipeline). */
export async function listCompanySelectOptions(_workspaceId: string) {
  return crmFetch(`/companies/options/`);
}
