"use server";

import { revalidatePath } from "next/cache";

import { normalizeSplitBuckets, splitBucketTotalPercent } from "@/lib/admin/capital/parse";
import { crmFetch } from "@/lib/admin/api";
import { requireAdmin } from "@/lib/admin/auth-check";
import { isOneOf } from "@/lib/admin/validation";

export async function updateCapitalSplitBucketsAction(formData: FormData) {
  await requireAdmin();
  const raw = formData.get("bucketsJson");
  if (typeof raw !== "string") {
    throw new Error("Invalid split configuration.");
  }

  let parsed: any;
  try {
    parsed = JSON.parse(raw);
  } catch {
    throw new Error("Split rules must be valid JSON.");
  }

  if (!Array.isArray(parsed)) {
    throw new Error("Invalid split rows: expected an array.");
  }
  if (parsed.length < 1 || parsed.length > 12) {
    throw new Error("Split configuration must have between 1 and 12 rows.");
  }

  for (const row of parsed) {
    if (typeof row.key !== "string" || !row.key.trim()) {
      throw new Error("Each split row must have a valid key.");
    }
    if (typeof row.label !== "string" || !row.label.trim()) {
      throw new Error("Each split row must have a valid label.");
    }
    if (typeof row.percent !== "number" || !Number.isFinite(row.percent)) {
      throw new Error("Each split row must have a valid percentage number.");
    }
  }

  const normalized = normalizeSplitBuckets(parsed);
  const total = splitBucketTotalPercent(normalized);

  if (Math.abs(total - 100) > 0.05) {
    throw new Error(`Split percentages must total 100% (currently ${total.toFixed(1)}%).`);
  }

  await crmFetch(`/workspaces/00000000-0000-4000-8000-000000000001/`, {
    method: "PATCH",
    body: JSON.stringify({ capital_split_buckets: normalized }),
  });

  revalidatePath("/admin/runway");
}

export async function createCapitalReceiptAction(formData: FormData) {
  await requireAdmin();

  const title = formData.get("title")?.toString().trim();
  const amountStr = formData.get("amount")?.toString().trim();
  const source = formData.get("source")?.toString().trim();
  const dealId = formData.get("dealId")?.toString().trim();
  const receivedAtStr = formData.get("receivedAt")?.toString().trim();
  const notes = formData.get("notes")?.toString().trim();

  if (!title) throw new Error("Title is required.");
  if (!amountStr) throw new Error("Amount is required.");
  if (!receivedAtStr) throw new Error("Date is required.");

  const validSources = ["deal", "investor", "partner", "other"] as const;
  if (!source || !isOneOf(source, validSources)) {
    throw new Error("Invalid source selected.");
  }

  const amount = Number(amountStr.replace(/,/g, ""));
  if (!Number.isFinite(amount) || amount <= 0) {
    throw new Error("Enter a valid positive amount.");
  }

  const receivedAtDate = new Date(`${receivedAtStr}T12:00:00`);
  if (isNaN(receivedAtDate.getTime())) {
    throw new Error("Invalid date provided.");
  }

  await crmFetch("/capital-receipts/", {
    method: "POST",
    body: JSON.stringify({
      amount,
      title,
      source,
      deal: dealId || null,
      received_at: receivedAtDate.toISOString(),
      notes: notes || null,
    }),
  });

  revalidatePath("/admin/runway");
}

export async function deleteCapitalReceiptAction(receiptId: string) {
  await requireAdmin();
  await crmFetch(`/capital-receipts/${receiptId}/`, {
    method: "DELETE",
  });
  revalidatePath("/admin/runway");
}
