"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";

import { crmFetch } from "@/lib/admin/api";
import { tagsToJson } from "@/lib/admin/crm";
import { requireAdmin } from "@/lib/admin/auth-check";

function revalidateCompanyPaths(companyId?: string) {
  revalidatePath("/admin/companies");
  revalidatePath("/admin/settings");
  if (companyId) {
    revalidatePath(`/admin/companies/${companyId}`);
    revalidatePath(`/admin/companies/${companyId}/edit`);
  }
}

function validateEmail(email: string) {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return emailRegex.test(email);
}

export async function createCompanyAction(formData: FormData) {
  await requireAdmin();
  
  const name = formData.get("name")?.toString().trim();
  const website = formData.get("website")?.toString().trim();
  const domain = formData.get("domain")?.toString().trim();
  const description = formData.get("description")?.toString().trim();
  const needs = formData.get("needs")?.toString().trim();
  const relationshipStageId = formData.get("relationshipStageId")?.toString().trim();
  const accountOwnerId = formData.get("accountOwnerId")?.toString().trim();
  const tags = String(formData.get("tags") || "")
    .split(",")
    .map((tag) => tag.trim())
    .filter(Boolean);

  if (!name) throw new Error("Company name is required.");
  if (!accountOwnerId) throw new Error("Owner is required.");

  const company = await crmFetch("/companies/", {
    method: "POST",
    body: JSON.stringify({
      name,
      website: website || null,
      domain: domain || null,
      description: description || null,
      needs: needs || null,
      relationship_stage_id: relationshipStageId || null,
      account_owner_id: accountOwnerId,
      tags: tagsToJson(tags),
    }),
  });

  revalidateCompanyPaths(company.id);
  redirect(`/admin/companies/${company.id}`);
}

export async function updateCompanyAction(companyId: string, formData: FormData) {
  await requireAdmin();
  
  const name = formData.get("name")?.toString().trim();
  const website = formData.get("website")?.toString().trim();
  const domain = formData.get("domain")?.toString().trim();
  const description = formData.get("description")?.toString().trim();
  const needs = formData.get("needs")?.toString().trim();
  const relationshipStageId = formData.get("relationshipStageId")?.toString().trim();
  const accountOwnerId = formData.get("accountOwnerId")?.toString().trim();
  const tags = String(formData.get("tags") || "")
    .split(",")
    .map((tag) => tag.trim())
    .filter(Boolean);

  if (!name) throw new Error("Company name is required.");
  if (!accountOwnerId) throw new Error("Owner is required.");

  await crmFetch(`/companies/${companyId}/`, {
    method: "PATCH",
    body: JSON.stringify({
      name,
      website: website || null,
      domain: domain || null,
      description: description || null,
      needs: needs || null,
      relationship_stage_id: relationshipStageId || null,
      account_owner_id: accountOwnerId,
      tags: tagsToJson(tags),
    }),
  });

  revalidateCompanyPaths(companyId);
  redirect(`/admin/companies/${companyId}`);
}

export async function deleteCompanyAction(companyId: string, _formData: FormData) {
  await requireAdmin();
  await crmFetch(`/companies/${companyId}/`, { method: "DELETE" });
  revalidateCompanyPaths();
  redirect("/admin/companies");
}

export async function createContactAction(companyId: string, formData: FormData) {
  await requireAdmin();
  
  const name = formData.get("name")?.toString().trim();
  const email = formData.get("email")?.toString().trim();
  const phone = formData.get("phone")?.toString().trim();
  const linkedinUrl = formData.get("linkedinUrl")?.toString().trim();
  const title = formData.get("title")?.toString().trim();
  const contactRole = formData.get("contactRole")?.toString().trim();
  const notes = formData.get("notes")?.toString().trim();
  const isPrimary = formData.get("isPrimary") === "on";

  if (!name) throw new Error("Contact name is required.");
  if (email && !validateEmail(email)) {
    throw new Error("Enter a valid email address.");
  }

  await crmFetch(`/companies/${companyId}/contacts/`, {
    method: "POST",
    body: JSON.stringify({
      name,
      email: email || null,
      phone: phone || null,
      linkedin_url: linkedinUrl || null,
      title: title || null,
      contact_role: contactRole || null,
      notes: notes || null,
      is_primary: isPrimary,
    }),
  });

  revalidateCompanyPaths(companyId);
}

export async function updateContactAction(contactId: string, formData: FormData) {
  await requireAdmin();
  
  const name = formData.get("name")?.toString().trim();
  const email = formData.get("email")?.toString().trim();
  const phone = formData.get("phone")?.toString().trim();
  const linkedinUrl = formData.get("linkedinUrl")?.toString().trim();
  const title = formData.get("title")?.toString().trim();
  const contactRole = formData.get("contactRole")?.toString().trim();
  const notes = formData.get("notes")?.toString().trim();
  const isPrimary = formData.get("isPrimary") === "on";

  if (!name) throw new Error("Contact name is required.");
  if (email && !validateEmail(email)) {
    throw new Error("Enter a valid email address.");
  }

  const contact = await crmFetch(`/contacts/${contactId}/`, {
    method: "PATCH",
    body: JSON.stringify({
      name,
      email: email || null,
      phone: phone || null,
      linkedin_url: linkedinUrl || null,
      title: title || null,
      contact_role: contactRole || null,
      notes: notes || null,
      is_primary: isPrimary,
    }),
  });

  revalidateCompanyPaths(contact.company_id);
}

export async function deleteContactAction(contactId: string, _formData: FormData) {
  await requireAdmin();
  const contact = await crmFetch(`/contacts/${contactId}/`);
  await crmFetch(`/contacts/${contactId}/`, { method: "DELETE" });
  revalidateCompanyPaths(contact.company_id);
}

export async function updateStageLabelAction(formData: FormData) {
  await requireAdmin();
  
  const stageId = formData.get("stageId")?.toString().trim();
  const label = formData.get("label")?.toString().trim();

  if (!stageId) throw new Error("Stage ID is required.");
  if (!label) throw new Error("Stage label is required.");

  await crmFetch(`/relationship-stages/${stageId}/`, {
    method: "PATCH",
    body: JSON.stringify({ label }),
  });

  revalidatePath("/admin/settings");
  revalidatePath("/admin/companies");
}
