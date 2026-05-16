"use server";

import { revalidatePath } from "next/cache";

import { INTERACTION_TYPES, TASK_STATUSES } from "@/lib/admin/constants";
import { crmFetch } from "@/lib/admin/api";
import { touchCompany } from "@/lib/admin/work/activity";
import { requireAdmin } from "@/lib/admin/auth-check";

const interactionTypeValues = INTERACTION_TYPES.map((item) => item.value);
const taskStatusValues = TASK_STATUSES.map((item) => item.value);

function parseDateInput(value?: any) {
  if (!value) {
    return null;
  }

  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) {
    throw new Error("Enter a valid date.");
  }

  return parsed;
}

function revalidateWorkPaths(companyId?: string) {
  revalidatePath("/admin/inbox");
  revalidatePath("/admin/companies");
  revalidatePath("/admin/deals");
  revalidatePath("/admin/pilots");
  if (companyId) {
    revalidatePath(`/admin/companies/${companyId}`);
  }
}

async function getCompanyForWorkspace(_workspaceId: string, companyId: string) {
  return crmFetch(`/companies/${companyId}/`);
}

export async function updateCompanyNeedsAction(companyId: string, formData: FormData) {
  await requireAdmin();
  const needs = (formData.get("needs") as string | null)?.trim() || null;

  const company = await getCompanyForWorkspace("00000000-0000-4000-8000-000000000001", companyId);
  if (!company) {
    throw new Error("Company not found.");
  }

  await crmFetch(`/companies/${companyId}/`, {
    method: "PATCH",
    body: JSON.stringify({ needs }),
  });

  await touchCompany(companyId);
  revalidateWorkPaths(companyId);
}

export async function createInteractionAction(companyId: string, formData: FormData) {
  const { userId } = await requireAdmin();
  const type = (formData.get("type") as string | null)?.trim();
  const occurredAt = (formData.get("occurredAt") as string | null)?.trim();
  const notes = (formData.get("notes") as string | null)?.trim() || null;
  const contactId = (formData.get("contactId") as string | null)?.trim() || null;

  if (!type || !interactionTypeValues.includes(type)) {
    throw new Error("Invalid interaction type.");
  }
  if (!occurredAt) {
    throw new Error("Date is required.");
  }

  const company = await getCompanyForWorkspace("00000000-0000-4000-8000-000000000001", companyId);
  if (!company) {
    throw new Error("Company not found.");
  }

  if (contactId) {
    const contact = await crmFetch(`/contacts/${contactId}/`);
    if (!contact || contact.company_id !== companyId) {
      throw new Error("Contact not found.");
    }
  }

  await crmFetch("/interactions/", {
    method: "POST",
    body: JSON.stringify({
      company_id: companyId,
      contact_id: contactId,
      type,
      occurred_at: parseDateInput(occurredAt)?.toISOString() ?? new Date().toISOString(),
      notes,
      created_by_id: userId,
    }),
  });

  await touchCompany(companyId);
  revalidateWorkPaths(companyId);
}

export async function createTaskAction(companyId: string, formData: FormData) {
  const { userId } = await requireAdmin();
  const title = (formData.get("title") as string | null)?.trim();
  const description = (formData.get("description") as string | null)?.trim() || null;
  const status = (formData.get("status") as string | null)?.trim() || "open";
  const dueAt = (formData.get("dueAt") as string | null)?.trim() || null;
  const ownerId = (formData.get("ownerId") as string | null)?.trim() || null;
  const contactId = (formData.get("contactId") as string | null)?.trim() || null;
  const dealId = (formData.get("dealId") as string | null)?.trim() || null;
  const pilotId = (formData.get("pilotId") as string | null)?.trim() || null;
  const interactionId = (formData.get("interactionId") as string | null)?.trim() || null;

  if (!title) {
    throw new Error("Task title is required.");
  }
  if (!taskStatusValues.includes(status)) {
    throw new Error("Invalid task status.");
  }

  const company = await getCompanyForWorkspace("00000000-0000-4000-8000-000000000001", companyId);
  if (!company) {
    throw new Error("Company not found.");
  }

  if (contactId) {
    const contact = await crmFetch(`/contacts/${contactId}/`);
    if (!contact || contact.company_id !== companyId) {
      throw new Error("Contact not found.");
    }
  }

  await crmFetch("/follow-up-tasks/", {
    method: "POST",
    body: JSON.stringify({
      company_id: companyId,
      contact_id: contactId,
      deal_id: dealId,
      pilot_id: pilotId,
      interaction_id: interactionId,
      title,
      description,
      status,
      due_at: parseDateInput(dueAt)?.toISOString() || null,
      owner_id: ownerId,
      created_by_id: userId,
    }),
  });

  await touchCompany(companyId);
  revalidateWorkPaths(companyId);
}

export async function updateTaskAction(taskId: string, formData: FormData) {
  await requireAdmin();
  const title = (formData.get("title") as string | null)?.trim();
  const description = (formData.get("description") as string | null)?.trim() || null;
  const status = (formData.get("status") as string | null)?.trim() || "open";
  const dueAt = (formData.get("dueAt") as string | null)?.trim() || null;
  const ownerId = (formData.get("ownerId") as string | null)?.trim() || null;
  const contactId = (formData.get("contactId") as string | null)?.trim() || null;
  const dealId = (formData.get("dealId") as string | null)?.trim() || null;
  const pilotId = (formData.get("pilotId") as string | null)?.trim() || null;

  if (!title) {
    throw new Error("Task title is required.");
  }
  if (!taskStatusValues.includes(status)) {
    throw new Error("Invalid task status.");
  }

  const task = await crmFetch(`/follow-up-tasks/${taskId}/`);

  if (!task) {
    throw new Error("Task not found.");
  }

  await crmFetch(`/follow-up-tasks/${taskId}/`, {
    method: "PATCH",
    body: JSON.stringify({
      title,
      description,
      status,
      due_at: parseDateInput(dueAt)?.toISOString() || null,
      owner_id: ownerId,
      contact_id: contactId,
      deal_id: dealId,
      pilot_id: pilotId,
    }),
  });

  await touchCompany(task.company_id);
  revalidateWorkPaths(task.company_id);
}

export async function reassignTaskAction(taskId: string, formData: FormData) {
  await requireAdmin();
  const ownerInput = (formData.get("ownerId") as string | null)?.trim() ?? "";
  const nextOwnerId = ownerInput ? ownerInput : null;

  if (nextOwnerId) {
    const owner = await crmFetch(`/crm-profiles/${nextOwnerId}/`);
    if (!owner) {
      throw new Error("Owner not found.");
    }
  }

  const task = await crmFetch(`/follow-up-tasks/${taskId}/`);
  if (!task) {
    throw new Error("Task not found.");
  }
  if (task.owner_id === nextOwnerId) {
    return;
  }

  await crmFetch(`/follow-up-tasks/${taskId}/`, {
    method: "PATCH",
    body: JSON.stringify({ owner_id: nextOwnerId }),
  });

  await touchCompany(task.company_id);
  revalidateWorkPaths(task.company_id);
}

export async function createCommentAction(companyId: string, formData: FormData) {
  const { userId } = await requireAdmin();
  const bodyText = (formData.get("body") as string | null)?.trim();
  const interactionId = (formData.get("interactionId") as string | null)?.trim() || null;

  if (!bodyText) {
    throw new Error("Comment cannot be empty.");
  }
  if (bodyText.length > 2000) {
    throw new Error("Comment is too long.");
  }

  const company = await getCompanyForWorkspace("00000000-0000-4000-8000-000000000001", companyId);
  if (!company) {
    throw new Error("Company not found.");
  }

  await crmFetch("/comments/", {
    method: "POST",
    body: JSON.stringify({
      company_id: companyId,
      interaction_id: interactionId,
      author_id: userId,
      body: bodyText,
    }),
  });

  await touchCompany(companyId);
  revalidateWorkPaths(companyId);
}

export async function deleteCommentAction(commentId: string) {
  const { userId } = await requireAdmin();
  const comment = await crmFetch(`/comments/${commentId}/`);
  if (!comment) {
    throw new Error("Comment not found.");
  }
  
  await crmFetch(`/comments/${commentId}/`, { method: "DELETE" });
  await touchCompany(comment.company_id);
  revalidateWorkPaths(comment.company_id);
}

export async function completeTaskAction(taskId: string, _formData: FormData) {
  await requireAdmin();

  const task = await crmFetch(`/follow-up-tasks/${taskId}/`);

  if (!task) {
    throw new Error("Task not found.");
  }

  if (task.status === "done") {
    return;
  }

  await crmFetch(`/follow-up-tasks/${taskId}/`, {
    method: "PATCH",
    body: JSON.stringify({ status: "done" }),
  });

  await touchCompany(task.company_id);
  revalidateWorkPaths(task.company_id);
}
