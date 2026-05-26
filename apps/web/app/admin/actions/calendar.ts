"use server";

import { revalidatePath } from "next/cache";

import { crmFetch } from "@/lib/admin/api";
import { requireAdmin } from "@/lib/admin/auth-check";

function revalidateMeetingPaths(companyId?: string) {
  revalidatePath("/admin/meetings");
  revalidatePath("/admin/settings");
  revalidatePath("/admin/inbox");
  if (companyId) {
    revalidatePath(`/admin/companies/${companyId}`);
  }
}

export async function connectDemoCalendarAction() {
  await requireAdmin();
  await crmFetch("/calendar-accounts/connect_demo/", { method: "POST" });
  revalidateMeetingPaths();
}

export async function disconnectCalendarAction(accountId: string) {
  await requireAdmin();
  await crmFetch("/calendar-accounts/disconnect/", { method: "POST" });
  revalidateMeetingPaths();
}

export async function refreshDemoCalendarAction(accountId: string) {
  await requireAdmin();
  await crmFetch("/calendar-accounts/connect_demo/", { method: "POST" });
  revalidateMeetingPaths();
}

export async function confirmEventCompanyAction(
  eventId: string,
  formData: FormData,
) {
  await requireAdmin();
  const companyId = String(formData.get("companyId") ?? "").trim();
  const contactId = String(formData.get("contactId") ?? "").trim() || null;

  await crmFetch(`/calendar-events/${eventId}/confirm_link/`, {
    method: "PATCH",
    body: JSON.stringify({ company_id: companyId, contact_id: contactId })
  });

  revalidateMeetingPaths(companyId);
}

export async function skipEventAction(eventId: string) {
  await requireAdmin();
  await crmFetch(`/calendar-events/${eventId}/skip/`, {
    method: "PATCH"
  });
  revalidateMeetingPaths();
}

export async function logMeetingAction(eventId: string) {
  await requireAdmin();
  await crmFetch(`/calendar-events/${eventId}/log_meeting/`, {
    method: "POST"
  });
  revalidateMeetingPaths();
}

export async function createManualMeetingAction(formData: FormData) {
  await requireAdmin();
  // Simplified: Proxy manual meeting creation to Django
  const body = {
    title: formData.get("title"),
    starts_at: formData.get("startsAt"),
    ends_at: formData.get("endsAt"),
    attendees: formData.get("attendees"),
    location: formData.get("location"),
    meeting_url: formData.get("meetingUrl"),
    company_id: formData.get("companyId") || null,
    description: formData.get("description"),
  };
  
  await crmFetch("/calendar-events/", {
    method: "POST",
    body: JSON.stringify(body)
  });
  
  revalidateMeetingPaths(body.company_id as string);
}

export async function createGoogleScheduledMeetingAction(formData: FormData) {
  await requireAdmin();
  // Simplified for now: call Django endpoint if available, or just proxy the form
  const body = {
    title: formData.get("title"),
    starts_at: formData.get("startsAt"),
    ends_at: formData.get("endsAt"),
    location: formData.get("location"),
    meeting_url: formData.get("meetingUrl"),
    company_id: formData.get("companyId") || null,
    description: formData.get("description"),
    attendee_ids: formData.getAll("attendeeIds"),
  };

  await crmFetch("/calendar-events/schedule_google/", {
    method: "POST",
    body: JSON.stringify(body)
  });

  revalidateMeetingPaths(body.company_id as string);
}
