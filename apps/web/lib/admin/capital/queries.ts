import { crmFetch } from "../api";
import { listWorkspaceUsers } from "../companies/queries";
import { parseSplitBuckets, type SplitBucket } from "./parse";

function unwrapRows(data: unknown): Record<string, unknown>[] {
  if (Array.isArray(data)) {
    return data as Record<string, unknown>[];
  }
  if (data && typeof data === "object" && Array.isArray((data as { results?: unknown }).results)) {
    return (data as { results: Record<string, unknown>[] }).results;
  }
  return [];
}

export type CapitalReceiptRow = {
  id: string;
  title: string;
  amount: number;
  source: string;
  receivedAt: Date;
  notes: string | null;
  createdBy: { name: string | null; email: string };
  deal: {
    id: string;
    name: string;
    company: { name: string } | null;
  } | null;
};

export type WorkspaceRunway = {
  workspace: Record<string, unknown>;
  splitBuckets: SplitBucket[];
  receipts: CapitalReceiptRow[];
};

export type DealSelectOption = {
  id: string;
  name: string;
  company: { name: string } | null;
};

export async function getWorkspaceRunway(): Promise<WorkspaceRunway | null> {
  const workspaceId = "00000000-0000-4000-8000-000000000001";
  const [workspace, receiptsRaw, users] = await Promise.all([
    crmFetch(`/workspaces/${workspaceId}/`),
    crmFetch("/capital-receipts/"),
    listWorkspaceUsers(workspaceId),
  ]);

  if (!workspace || typeof workspace !== "object") {
    return null;
  }

  const workspaceRecord = workspace as Record<string, unknown>;
  const receipts = unwrapRows(receiptsRaw).map((row) => {
    const createdById = row.created_by != null ? String(row.created_by) : "";
    const creator = users.find((user) => user.id === createdById);
    const dealRaw = row.deal;
    let deal: CapitalReceiptRow["deal"] = null;
    if (dealRaw && typeof dealRaw === "object") {
      const dealRecord = dealRaw as Record<string, unknown>;
      const companyRaw = dealRecord.company;
      deal = {
        id: String(dealRecord.id),
        name: String(dealRecord.name ?? ""),
        company:
          companyRaw && typeof companyRaw === "object"
            ? { name: String((companyRaw as Record<string, unknown>).name ?? "") }
            : null,
      };
    }

    return {
      id: String(row.id),
      title: String(row.title ?? ""),
      amount: Number(row.amount ?? 0),
      source: String(row.source ?? "other"),
      receivedAt: new Date(String(row.received_at ?? Date.now())),
      notes: (row.notes as string | null) ?? null,
      createdBy: {
        name: creator?.name ?? null,
        email: creator?.email ?? "Unknown",
      },
      deal,
    };
  });

  return {
    workspace: workspaceRecord,
    splitBuckets: parseSplitBuckets(
      workspaceRecord.capital_split_buckets ?? workspaceRecord.capitalSplitBuckets,
    ),
    receipts: receipts.sort(
      (left, right) => right.receivedAt.getTime() - left.receivedAt.getTime(),
    ),
  };
}

export async function listWorkspaceDealsForSelect(): Promise<DealSelectOption[]> {
  const deals = await crmFetch("/deals/");
  return unwrapRows(deals).map((row) => {
    const companyRaw = row.company;
    return {
      id: String(row.id),
      name: String(row.name ?? ""),
      company:
        companyRaw && typeof companyRaw === "object"
          ? { name: String((companyRaw as Record<string, unknown>).name ?? "") }
          : null,
    };
  });
}
