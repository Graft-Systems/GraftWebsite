"use server";

import { revalidatePath } from "next/cache";

import {
  DEAL_STAGES,
  INVESTOR_STAGES,
  PARTNER_PROGRAM_STATUSES,
  PILOT_STATUSES,
} from "@/lib/admin/constants";
import { crmFetch } from "@/lib/admin/api";
import { tagsToJson } from "@/lib/admin/crm";
import { touchCompany } from "@/lib/admin/work/activity";
import { requireAdmin } from "@/lib/admin/auth-check";
import { isOneOf } from "@/lib/admin/validation";

const dealStageValues = DEAL_STAGES.map((item) => item.value);
const pilotStatusValues = PILOT_STATUSES.map((item) => item.value);
const investorStageValues = INVESTOR_STAGES.map((item) => item.value);
const partnerStatusValues = PARTNER_PROGRAM_STATUSES.map((item) => item.value);

function thesisTagsFromInput(value?: string) {
  if (!value) {
    return tagsToJson([]);
  }

  return tagsToJson(
    value
      .split(",")
      .map((tag) => tag.trim())
      .filter(Boolean),
  );
}

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

function parseOptionalNumber(value?: string) {
  if (!value) {
    return null;
  }

  const parsed = Number(value);
  if (Number.isNaN(parsed)) {
    throw new Error("Enter a valid number.");
  }

  return parsed;
}

function revalidatePipelinePaths(companyId?: string) {
  revalidatePath("/admin/deals");
  revalidatePath("/admin/investors");
  revalidatePath("/admin/companies");
  if (companyId) {
    revalidatePath(`/admin/companies/${companyId}`);
  }
}

async function getCompanyForWorkspace(_workspaceId: string, companyId: string) {
  return crmFetch(`/companies/${companyId}/`);
}

async function assertDealForCompany(companyId: string, dealId?: string) {
  if (!dealId) {
    return null;
  }

  const deal = await crmFetch(`/deals/${dealId}/`);

  if (!deal || deal.company_id !== companyId) {
    throw new Error("Deal not found.");
  }

  return deal;
}

function parseDealForm(formData: FormData) {
  const name = formData.get("name")?.toString().trim();
  const stage = (formData.get("stage")?.toString() || "open").trim();
  const valueEstimate = formData.get("valueEstimate")?.toString().trim();
  const expectedClose = formData.get("expectedClose")?.toString().trim();
  const startsAt = formData.get("startsAt")?.toString().trim();
  const endsAt = formData.get("endsAt")?.toString().trim();
  const link = formData.get("link")?.toString().trim();
  const ownerId = formData.get("ownerId")?.toString().trim();
  const notes = formData.get("notes")?.toString().trim();

  if (!name) throw new Error("Competition name is required.");
  if (!isOneOf(stage, dealStageValues)) throw new Error("Invalid stage.");
  if (link && !/^https?:\/\//i.test(link)) {
    throw new Error("Link must start with http:// or https://");
  }

  return {
    name,
    stage,
    valueEstimate,
    expectedClose,
    startsAt,
    endsAt,
    link,
    ownerId,
    notes,
  };
}

function dealDataFromParsed(parsed: ReturnType<typeof parseDealForm>) {
  return {
    name: parsed.name,
    stage: parsed.stage,
    value_estimate: parseOptionalNumber(parsed.valueEstimate),
    expected_close: parseDateInput(parsed.expectedClose),
    starts_at: parseDateInput(parsed.startsAt),
    ends_at: parseDateInput(parsed.endsAt),
    link: parsed.link || null,
    owner_id: parsed.ownerId || null,
    notes: parsed.notes || null,
  };
}

export async function createDealAction(companyId: string, formData: FormData) {
  await requireAdmin();
  const parsed = parseDealForm(formData);

  const company = await getCompanyForWorkspace("00000000-0000-4000-8000-000000000001", companyId);
  if (!company) {
    throw new Error("Company not found.");
  }

  await crmFetch("/deals/", {
    method: "POST",
    body: JSON.stringify({
      company_id: company.id,
      ...dealDataFromParsed(parsed),
    }),
  });

  await touchCompany(companyId);
  revalidatePipelinePaths(companyId);
}

export async function createDealWithCompanyPickerAction(formData: FormData) {
  await requireAdmin();
  const parsed = parseDealForm(formData);
  const raw = formData.get("companyId");
  const companyId = typeof raw === "string" && raw.trim() ? raw.trim() : null;

  if (companyId) {
    const company = await getCompanyForWorkspace("00000000-0000-4000-8000-000000000001", companyId);
    if (!company) {
      throw new Error("Company not found.");
    }
  }

  await crmFetch("/deals/", {
    method: "POST",
    body: JSON.stringify({
      company_id: companyId,
      ...dealDataFromParsed(parsed),
    }),
  });

  if (companyId) {
    await touchCompany(companyId);
  }
  revalidatePipelinePaths(companyId ?? undefined);
}

export async function updateDealAction(dealId: string, formData: FormData) {
  await requireAdmin();
  const parsed = parseDealForm(formData);

  const deal = await crmFetch(`/deals/${dealId}/`);

  if (!deal) {
    throw new Error("Competition not found.");
  }

  await crmFetch(`/deals/${dealId}/`, {
    method: "PATCH",
    body: JSON.stringify(dealDataFromParsed(parsed)),
  });

  if (deal.company_id) {
    await touchCompany(deal.company_id);
  }
  revalidatePipelinePaths(deal.company_id ?? undefined);
}

export async function createPilotAction(companyId: string, formData: FormData) {
  await requireAdmin();
  
  const name = formData.get("name")?.toString().trim();
  const status = (formData.get("status")?.toString() || "planned").trim();
  const dealId = formData.get("dealId")?.toString().trim();
  const startAt = formData.get("startAt")?.toString().trim();
  const targetEndAt = formData.get("targetEndAt")?.toString().trim();
  const successCriteria = formData.get("successCriteria")?.toString().trim();
  const ownerId = formData.get("ownerId")?.toString().trim();
  const notes = formData.get("notes")?.toString().trim();

  if (!name) throw new Error("Pilot name is required.");
  if (!isOneOf(status, pilotStatusValues)) throw new Error("Invalid pilot status.");

  const company = await getCompanyForWorkspace("00000000-0000-4000-8000-000000000001", companyId);
  if (!company) {
    throw new Error("Company not found.");
  }

  await assertDealForCompany(companyId, dealId);

  await crmFetch("/pilots/", {
    method: "POST",
    body: JSON.stringify({
      company_id: companyId,
      deal_id: dealId || null,
      name: name,
      status: status,
      start_at: parseDateInput(startAt),
      target_end_at: parseDateInput(targetEndAt),
      success_criteria: successCriteria || null,
      owner_id: ownerId || null,
      notes: notes || null,
    }),
  });

  await touchCompany(companyId);
  revalidatePipelinePaths(companyId);
}

export async function updatePilotAction(pilotId: string, formData: FormData) {
  await requireAdmin();
  
  const name = formData.get("name")?.toString().trim();
  const status = (formData.get("status")?.toString() || "planned").trim();
  const dealId = formData.get("dealId")?.toString().trim();
  const startAt = formData.get("startAt")?.toString().trim();
  const targetEndAt = formData.get("targetEndAt")?.toString().trim();
  const successCriteria = formData.get("successCriteria")?.toString().trim();
  const ownerId = formData.get("ownerId")?.toString().trim();
  const notes = formData.get("notes")?.toString().trim();

  if (!name) throw new Error("Pilot name is required.");
  if (!isOneOf(status, pilotStatusValues)) throw new Error("Invalid pilot status.");

  const pilot = await crmFetch(`/pilots/${pilotId}/`);

  if (!pilot) {
    throw new Error("Pilot not found.");
  }

  await assertDealForCompany(pilot.company_id, dealId);

  await crmFetch(`/pilots/${pilotId}/`, {
    method: "PATCH",
    body: JSON.stringify({
      deal_id: dealId || null,
      name: name,
      status: status,
      start_at: parseDateInput(startAt),
      target_end_at: parseDateInput(targetEndAt),
      success_criteria: successCriteria || null,
      owner_id: ownerId || null,
      notes: notes || null,
    }),
  });

  await touchCompany(pilot.company_id);
  revalidatePipelinePaths(pilot.company_id);
}

export async function upsertInvestorProfileAction(companyId: string, formData: FormData) {
  await requireAdmin();
  
  const fundName = formData.get("fundName")?.toString().trim();
  const checkSizeBand = formData.get("checkSizeBand")?.toString().trim();
  const thesisTags = formData.get("thesisTags")?.toString().trim();
  const warmIntroSource = formData.get("warmIntroSource")?.toString().trim();
  const stage = (formData.get("stage")?.toString() || "prospecting").trim();
  const nextStep = formData.get("nextStep")?.toString().trim();
  const notes = formData.get("notes")?.toString().trim();

  if (!isOneOf(stage, investorStageValues)) throw new Error("Invalid investor stage.");

  const company = await getCompanyForWorkspace("00000000-0000-4000-8000-000000000001", companyId);
  if (!company) {
    throw new Error("Company not found.");
  }

  await crmFetch(`/investor-profiles/${companyId}/`, {
    method: "PUT",
    body: JSON.stringify({
      fund_name: fundName || null,
      check_size_band: checkSizeBand || null,
      thesis_tags: thesisTagsFromInput(thesisTags),
      warm_intro_source: warmIntroSource || null,
      stage: stage,
      next_step: nextStep || null,
      notes: notes || null,
    }),
  });

  await touchCompany(companyId);
  revalidatePipelinePaths(companyId);
}

export async function upsertInvestorWithCompanyPickerAction(formData: FormData) {
  const raw = formData.get("companyId");
  if (typeof raw !== "string" || !raw.trim()) {
    throw new Error("Choose a company.");
  }
  await upsertInvestorProfileAction(raw.trim(), formData);
}

export async function upsertPartnerProfileAction(companyId: string, formData: FormData) {
  await requireAdmin();
  
  const partnerType = formData.get("partnerType")?.toString().trim();
  const programStatus = (formData.get("programStatus")?.toString() || "exploring").trim();
  const ownerId = formData.get("ownerId")?.toString().trim();
  const integrationNotes = formData.get("integrationNotes")?.toString().trim();
  const notes = formData.get("notes")?.toString().trim();

  if (!isOneOf(programStatus, partnerStatusValues)) {
    throw new Error("Invalid partner program status.");
  }

  const company = await getCompanyForWorkspace("00000000-0000-4000-8000-000000000001", companyId);
  if (!company) {
    throw new Error("Company not found.");
  }

  await crmFetch(`/partner-profiles/${companyId}/`, {
    method: "PUT",
    body: JSON.stringify({
      partner_type: partnerType || null,
      program_status: programStatus,
      owner_id: ownerId || null,
      integration_notes: integrationNotes || null,
      notes: notes || null,
    }),
  });

  await touchCompany(companyId);
  revalidatePipelinePaths(companyId);
}
