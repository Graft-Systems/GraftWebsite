"use server";

import { revalidatePath } from "next/cache";

import type { CaptureSource, StructuredCapture } from "@/lib/admin/ai/types";
import { INTERACTION_SOURCES, INTERACTION_TYPES } from "@/lib/admin/constants";
import { parseTags, tagsToJson } from "@/lib/admin/crm";
import { crmFetch } from "@/lib/admin/api";
import { getCompany } from "@/lib/admin/companies/queries";
import { touchCompany } from "@/lib/admin/work/activity";
import { requireAdmin } from "@/lib/admin/auth-check";
import { isOneOf } from "@/lib/admin/validation";

const interactionTypeValues = INTERACTION_TYPES.map((item) => item.value);
const interactionSourceValues = INTERACTION_SOURCES.map((item) => item.value);

function parseDateInput(value?: string) {
  if (!value) {
    return null;
  }

  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) {
    throw new Error("Enter a valid date.");
  }

  return parsed;
}

function revalidateCapturePaths(companyId: string) {
  revalidatePath("/admin/inbox");
  revalidatePath("/admin/companies");
  revalidatePath(`/companies/${companyId}`);
}

function parseNeedsBullets(value?: string) {
  if (!value) {
    return [];
  }

  return value
    .split(/\r?\n/)
    .map((line) => line.replace(/^[-*]\s*/, "").trim())
    .filter(Boolean);
}

function parseTagHints(value?: string) {
  if (!value) {
    return [];
  }

  return value
    .split(/[,\n]/)
    .map((tag) => tag.trim())
    .filter(Boolean);
}

function parseReviewTasks(value?: string) {
  if (!value) {
    return [];
  }

  let parsed: any[];
  try {
    parsed = JSON.parse(value);
  } catch {
    throw new Error("Invalid task payload.");
  }

  if (!Array.isArray(parsed)) {
    throw new Error("Invalid task payload.");
  }

  return parsed
    .filter((item) => {
      return (
        item &&
        typeof item.title === "string" &&
        item.title.trim() !== "" &&
        item.selected === true
      );
    })
    .map((item) => ({
      title: item.title.trim(),
      description: typeof item.description === "string" ? item.description.trim() : undefined,
      dueInDays: typeof item.dueInDays === "number" ? item.dueInDays : 3,
      selected: true,
    }));
}

export async function structureCaptureAction(
  companyId: string,
  input: { source: CaptureSource; transcript: string },
): Promise<StructuredCapture> {
  await requireAdmin();
  
  if (input.source !== "in_app_voice" && input.source !== "paste") {
    throw new Error("Invalid capture source.");
  }
  if (!input.transcript || !input.transcript.trim()) {
    throw new Error("Add notes before structuring.");
  }

  return crmFetch("/interactions/structure/", {
    method: "POST",
    body: JSON.stringify({
      company_id: companyId,
      transcript: input.transcript.trim(),
      source: input.source,
    }),
  });
}

export async function applyCaptureReviewAction(companyId: string, formData: FormData) {
  await requireAdmin();

  const source = formData.get("source")?.toString().trim();
  const transcript = formData.get("transcript")?.toString().trim();
  const type = formData.get("type")?.toString().trim();
  const occurredAt = formData.get("occurredAt")?.toString().trim();
  const contactId = formData.get("contactId")?.toString().trim();
  const summary = formData.get("summary")?.toString().trim();
  const needsBulletsRaw = formData.get("needsBullets")?.toString().trim();
  const applyNeeds = formData.get("applyNeeds") === "on";
  const tagHintsRaw = formData.get("tagHints")?.toString().trim();
  const applyTags = formData.get("applyTags") === "on";
  const stageHint = formData.get("stageHint")?.toString().trim();
  const tasksPayload = formData.get("tasksPayload")?.toString().trim();

  if (!source || !isOneOf(source, interactionSourceValues)) {
    throw new Error("Invalid capture source.");
  }
  if (!transcript) throw new Error("Transcript is required.");
  if (!type || !isOneOf(type, interactionTypeValues)) {
    throw new Error("Invalid interaction type.");
  }
  if (!occurredAt) throw new Error("Date is required.");
  if (!summary) throw new Error("Summary is required.");

  const company = await getCompany("00000000-0000-4000-8000-000000000001", companyId);
  if (!company) {
    throw new Error("Company not found.");
  }

  const needsBullets = parseNeedsBullets(needsBulletsRaw);
  const tagHints = parseTagHints(tagHintsRaw);
  const selectedTasks = parseReviewTasks(tasksPayload);

  const interaction = await crmFetch("/interactions/", {
    method: "POST",
    body: JSON.stringify({
      company: companyId,
      contact: contactId || null,
      type: type,
      occurred_at: (parseDateInput(occurredAt) ?? new Date()).toISOString(),
      notes: summary,
      source: source,
      transcript: transcript,
      ai_summary: summary,
      ai_needs: needsBullets,
      ai_suggested_tasks: selectedTasks.map((task) => ({
        title: task.title,
        description: task.description,
        due_in_days: task.dueInDays,
      })),
      ai_stage_hint: stageHint || null,
      ai_tag_hints: tagHints,
    }),
  });

  if (applyNeeds && needsBullets.length > 0) {
    const formattedNeeds = needsBullets.map((bullet) => `- ${bullet}`).join("\n");
    await crmFetch(`/companies/${companyId}/`, {
      method: "PATCH",
      body: JSON.stringify({ needs: formattedNeeds }),
    });
  }

  if (applyTags && tagHints.length > 0) {
    const mergedTags = tagsToJson([...parseTags(company.tags), ...tagHints]);
    await crmFetch(`/companies/${companyId}/`, {
      method: "PATCH",
      body: JSON.stringify({ tags: mergedTags }),
    });
  }

  for (const task of selectedTasks) {
    const dueAt = new Date();
    dueAt.setDate(dueAt.getDate() + (task.dueInDays ?? 3));

    await crmFetch("/follow-up-tasks/", {
      method: "POST",
      body: JSON.stringify({
        company: companyId,
        contact: contactId || null,
        interaction: interaction.id,
        title: task.title,
        description: task.description || null,
        status: "open",
        due_at: dueAt.toISOString(),
      }),
    });
  }

  await touchCompany(companyId);
  revalidateCapturePaths(companyId);
}
