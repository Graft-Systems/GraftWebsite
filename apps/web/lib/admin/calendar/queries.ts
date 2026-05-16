import { crmFetch } from "@/lib/admin/api";
import {
  domainOf,
  externalAttendees,
  parseAttendees,
  type EventAttendee,
} from "@/lib/admin/calendar/attendees";

export type CalendarSuggestion = {
  companyId: string;
  companyName: string;
  contactId: string | null;
  contactName: string | null;
  matchedEmail: string;
  matchKind: "exact_email" | "domain";
};

export async function getCalendarAccountForUser(_userId: string) {
  const accounts = await crmFetch("/calendar-accounts/");
  return accounts.find((a: any) => a.status !== "disconnected") || null;
}

export async function listCalendarAccountsForUser(_userId: string) {
  return crmFetch("/calendar-accounts/");
}

async function buildSuggestion(
  _workspaceId: string,
  attendees: EventAttendee[],
): Promise<CalendarSuggestion | null> {
  const externals = externalAttendees(attendees);
  if (externals.length === 0) return null;

  const emails = externals.map((attendee) => attendee.email);
  
  // The Django API should handle filtering by workspace and email search
  // For now, we'll try to find a contact or company via API
  const params = new URLSearchParams();
  emails.forEach(email => params.append("emails", email));
  
  try {
    const suggestion = await crmFetch(`/calendar-events/suggest/?${params.toString()}`);
    return suggestion;
  } catch (e) {
    return null;
  }
}

export type CalendarEventListItem = {
  id: string;
  title: string;
  startsAt: string;
  endsAt: string;
  description: string | null;
  location: string | null;
  meetingUrl: string | null;
  attendees: EventAttendee[];
  linkStatus: string;
  companyId: string | null;
  contactId: string | null;
  company?: { id: string; name: string };
  contact?: { id: string; name: string };
  suggestion: CalendarSuggestion | null;
  calendarAccount?: { id: string; provider: string; displayName: string; userId: string };
};

export async function listMeetingsForUser(
  _workspaceId: string,
  _userId: string,
  options: { since?: Date; until?: Date; mineOnly?: boolean } = {},
): Promise<CalendarEventListItem[]> {
  const params = new URLSearchParams();
  if (options.since) params.append("since", options.since.toISOString());
  if (options.until) params.append("until", options.until.toISOString());
  if (options.mineOnly) params.append("mine_only", "true");

  const events = await crmFetch(`/calendar-events/?${params.toString()}`);

  return events.map((event: any) => ({
    ...event,
    startsAt: event.starts_at,
    endsAt: event.ends_at,
    meetingUrl: event.meeting_url,
    linkStatus: event.link_status,
    companyId: event.company_id,
    contactId: event.contact_id,
    calendarAccountId: event.calendar_account_id,
    attendees: parseAttendees(event.attendees),
    // Suggestion is usually handled by the frontend or separate call, 
    // but the original code did it here.
    suggestion: event.suggestion || null,
  }));
}

export async function getCalendarEvent(_workspaceId: string, eventId: string) {
  const event = await crmFetch(`/calendar-events/${eventId}/`);
  return {
    ...event,
    startsAt: event.starts_at,
    endsAt: event.ends_at,
    meetingUrl: event.meeting_url,
    linkStatus: event.link_status,
    companyId: event.company_id,
    contactId: event.contact_id,
    calendarAccountId: event.calendar_account_id,
    attendees: parseAttendees(event.attendees),
  };
}
