"use server";

import { revalidatePath } from "next/cache";

import { INTERACTION_TYPES } from "@/lib/admin/constants";
import { parseTags, tagsToJson } from "@/lib/admin/crm";
import { crmFetch } from "@/lib/admin/api";
import { touchCompany } from "@/lib/admin/work/activity";
import { requireAdmin } from "@/lib/admin/auth-check";

const interactionTypeValues = INTERACTION_TYPES.map((item) => item.value);

function parseDateInput(value: string) {
  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) {
    throw new Error("Enter a valid date.");
  }
  return parsed;
}

function parseNeedsBullets(value?: string) {
  if (!value) return [];
  return value
    .split(/\r?\n/)
    .map((line) => line.replace(/^[-*]\s*/, "").trim())
    .filter(Boolean);
}

function parseTagHints(value?: string) {
  if (!value) return [];
  return value
    .split(/[,\n]/)
    .map((tag) => tag.trim())
    .filter(Boolean);
}

function revalidateWisprPaths(companyId?: string) {
  revalidatePath("/admin/wispr");
  revalidatePath("/admin/settings");
  revalidatePath("/admin/inbox");
  if (companyId) {
    revalidatePath(`/companies/${companyId}`);
  }
}

export async function connectDemoWisprAction() {
  await requireAdmin();
  await crmFetch("/wispr-connections/connect_demo/", { method: "POST" });
  revalidateWisprPaths();
}

export async function disconnectWisprAction() {
  await requireAdmin();
  await crmFetch("/wispr-connections/disconnect/", { method: "POST" });
  revalidateWisprPaths();
}

export async function simulateWisprNoteAction(formData: FormData) {
  await requireAdmin();
  
  const rawText = formData.get("rawText")?.toString().trim();
  const externalNoteId = formData.get("externalNoteId")?.toString().trim();

  if (!rawText) {
    throw new Error("Paste a Wispr note before saving.");
  }

  await crmFetch("/wispr-ingests/", {
    method: "POST",
    body: JSON.stringify({
      raw_text: rawText,
      external_note_id: externalNoteId || `manual-${Date.now()}`,
    }),
  });

  revalidateWisprPaths();
}

export async function applyWisprIngestAction(ingestId: string, formData: FormData) {
  await requireAdmin();
  const ingest = await crmFetch(`/wispr-ingests/${ingestId}/`);
  if (!ingest) {
    throw new Error("Wispr ingest not found.");
  }
  if (ingest.status === "applied") {
    throw new Error("This ingest has already been applied.");
  }

  const companyId = formData.get("companyId")?.toString().trim();
  const contactId = formData.get("contactId")?.toString().trim();
  const type = formData.get("type")?.toString().trim();
  const occurredAt = formData.get("occurredAt")?.toString().trim();
  const summary = formData.get("summary")?.toString().trim();
  const needsBulletsRaw = formData.get("needsBullets")?.toString().trim();
  const applyNeeds = formData.get("applyNeeds") === "on";
  const tagHintsRaw = formData.get("tagHints")?.toString().trim();
  const applyTags = formData.get("applyTags") === "on";
  const stageHint = formData.get("stageHint")?.toString().trim();

  if (!companyId) throw new Error("Pick a company.");
  if (!type || !interactionTypeValues.includes(type)) throw new Error("Invalid interaction type.");
  if (!occurredAt) throw new Error("Date is required.");
  if (!summary) throw new Error("Summary is required.");

  const company = await crmFetch(`/companies/${companyId}/`);
  if (!company) {
    throw new Error("Company not found.");
  }

  const needsBullets = parseNeedsBullets(needsBulletsRaw);
  const tagHints = parseTagHints(tagHintsRaw);
  const aiSuggestedTasks = Array.isArray(ingest.ai_suggested_tasks)
    ? ingest.ai_suggested_tasks
    : [];

  const interaction = await crmFetch("/interactions/", {
    method: "POST",
    body: JSON.stringify({
      company: company.id,
      contact: contactId || null,
      type: type,
      occurred_at: parseDateInput(occurredAt).toISOString(),
      notes: summary,
      source: "wispr_api",
      transcript: ingest.raw_text,
      ai_summary: summary,
      ai_needs: needsBullets,
      ai_suggested_tasks: aiSuggestedTasks,
      ai_stage_hint: stageHint || null,
      ai_tag_hints: tagHints,
      wispr_ingest: ingest.id,
    }),
  });

  if (applyNeeds && needsBullets.length > 0) {
    await crmFetch(`/companies/${company.id}/`, {
      method: "PATCH",
      body: JSON.stringify({ needs: needsBullets.map((bullet) => `- ${bullet}`).join("\n") }),
    });
  }

  if (applyTags && tagHints.length > 0) {
    const mergedTags = tagsToJson([...parseTags(company.tags), ...tagHints]);
    await crmFetch(`/companies/${company.id}/`, {
      method: "PATCH",
      body: JSON.stringify({ tags: mergedTags }),
    });
  }

  for (const task of aiSuggestedTasks) {
    if (!task.title) continue;
    const dueAt = new Date();
    dueAt.setDate(dueAt.getDate() + (task.dueInDays ?? 3));

    await crmFetch("/follow-up-tasks/", {
      method: "POST",
      body: JSON.stringify({
        company: company.id,
        contact: contactId || null,
        interaction: interaction.id,
        title: task.title,
        description: task.description || null,
        status: "open",
        due_at: dueAt.toISOString(),
      }),
    });
  }

  await crmFetch(`/wispr-ingests/${ingest.id}/`, {
    method: "PATCH",
    body: JSON.stringify({
      status: "applied",
      applied_interaction_id: interaction.id,
      suggested_company_id: company.id,
    }),
  });

  await touchCompany(company.id);
  revalidateWisprPaths(company.id);
}

export async function discardWisprIngestAction(ingestId: string) {
  await requireAdmin();
  await crmFetch(`/wispr-ingests/${ingestId}/`, {
    method: "PATCH",
    body: JSON.stringify({ status: "discarded" }),
  });
  revalidateWisprPaths();
}
