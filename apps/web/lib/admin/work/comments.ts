import { crmFetch } from "@/lib/admin/api";

type CommentRow = Record<string, unknown>;

function mapComment(row: CommentRow) {
  const author = (row.author as CommentRow | undefined) ?? {};
  const interaction = row.interaction as CommentRow | null | undefined;

  return {
    id: String(row.id),
    body: String(row.body ?? ""),
    createdAt: new Date(String(row.created_at ?? row.createdAt)),
    author: {
      id: String(author.clerk_id ?? author.clerkId ?? author.id ?? ""),
      name: (author.name as string | null) ?? null,
      email: String(author.email ?? ""),
    },
    interaction: interaction
      ? {
          id: String(interaction.id),
          type: String(interaction.type ?? "note"),
          occurredAt: new Date(
            String(interaction.occurred_at ?? interaction.occurredAt),
          ),
        }
      : null,
  };
}

function normalizeList(payload: unknown): CommentRow[] {
  if (Array.isArray(payload)) {
    return payload as CommentRow[];
  }
  if (payload && typeof payload === "object" && Array.isArray((payload as { results?: unknown }).results)) {
    return (payload as { results: CommentRow[] }).results;
  }
  return [];
}

export async function listCompanyComments(companyId: string) {
  const rows = await crmFetch(`/comments/?company_id=${companyId}`);
  return normalizeList(rows).map(mapComment);
}

export async function listInteractionComments(interactionId: string) {
  const rows = await crmFetch(`/comments/?interaction_id=${interactionId}`);
  return normalizeList(rows).map(mapComment);
}
