import { crmFetch } from "@/lib/admin/api";
import {
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

export type CalendarAccountRow = {
  id: string;
  provider: string;
  status: string;
  displayName: string | null;
  refreshToken: string | null;
};

function unwrapRows(data: unknown): Record<string, unknown>[] {
  if (Array.isArray(data)) {
    return data as Record<string, unknown>[];
  }
  if (data && typeof data === "object" && Array.isArray((data as { results?: unknown }).results)) {
    return (data as { results: Record<string, unknown>[] }).results;
  }
  return [];
}

export async function getCalendarAccountForUser(
  _userId: string,
): Promise<CalendarAccountRow | null> {
  const accounts = await listCalendarAccountsForUser(_userId);
  return accounts.find((account) => account.status !== "disconnected") ?? null;
}

export async function listCalendarAccountsForUser(
  _userId: string,
): Promise<CalendarAccountRow[]> {
  const data = await crmFetch("/calendar-accounts/");
  return unwrapRows(data).map((row) => ({
    id: String(row.id),
    provider: String(row.provider ?? "demo"),
    status: String(row.status ?? "connected"),
    displayName: (row.display_name as string | null) ?? null,
    refreshToken: (row.refresh_token as string | null) ?? null,
  }));
}

async function buildSuggestion(
  _workspaceId: string,
  attendees: EventAttendee[],
): Promise<CalendarSuggestion | null> {
  const externals = externalAttendees(attendees);
  if (externals.length === 0) return null;

  const emails = externals.map((attendee) => attendee.email);
  const params = new URLSearchParams();
  emails.forEach((email) => params.append("emails", email));

  try {
    const suggestion = await crmFetch(`/calendar-events/suggest/?${params.toString()}`);
    return suggestion as CalendarSuggestion | null;
  } catch {
    return null;
  }
}

export type CalendarEventListItem = {
  id: string;
  title: string;
  startsAt: Date;
  endsAt: Date;
  description: string | null;
  location: string | null;
  meetingUrl: string | null;
  attendees: EventAttendee[];
  linkStatus: string;
  companyId: string | null;
  contactId: string | null;
  company: { id: string; name: string } | null;
  contact: { id: string; name: string } | null;
  interaction: { id: string } | null;
  suggestion: CalendarSuggestion | null;
  calendarAccount?: { id: string; provider: string; displayName: string; userId: string };
};

function mapNestedRef(
  value: unknown,
): { id: string; name: string } | null {
  if (!value || typeof value !== "object") {
    return null;
  }
  const record = value as Record<string, unknown>;
  if (record.id == null) {
    return null;
  }
  return {
    id: String(record.id),
    name: String(record.name ?? ""),
  };
}

function mapInteractionRef(value: unknown): { id: string } | null {
  if (!value) {
    return null;
  }
  if (typeof value === "string") {
    return { id: value };
  }
  if (typeof value === "object") {
    const record = value as Record<string, unknown>;
    if (record.id != null) {
      return { id: String(record.id) };
    }
  }
  return null;
}

function mapCalendarEvent(row: Record<string, unknown>): CalendarEventListItem {
  const company = mapNestedRef(row.company);
  const contact = mapNestedRef(row.contact);

  return {
    id: String(row.id),
    title: String(row.title ?? ""),
    startsAt: new Date(String(row.starts_at ?? Date.now())),
    endsAt: new Date(String(row.ends_at ?? Date.now())),
    description: (row.description as string | null) ?? null,
    location: (row.location as string | null) ?? null,
    meetingUrl: (row.meeting_url as string | null) ?? null,
    attendees: parseAttendees(row.attendees),
    linkStatus: String(row.link_status ?? "unmatched"),
    companyId: company?.id ?? (row.company != null ? String(row.company) : null),
    contactId: contact?.id ?? (row.contact != null ? String(row.contact) : null),
    company,
    contact,
    interaction: mapInteractionRef(row.interaction),
    suggestion: (row.suggestion as CalendarSuggestion | null) ?? null,
  };
}

export async function listMeetingsForUser(
  workspaceId: string,
  _userId: string,
  options: { since?: Date; until?: Date; mineOnly?: boolean } = {},
): Promise<CalendarEventListItem[]> {
  const params = new URLSearchParams();
  if (options.since) params.append("since", options.since.toISOString());
  if (options.until) params.append("until", options.until.toISOString());
  if (options.mineOnly) params.append("mine_only", "true");

  const events = await crmFetch(`/calendar-events/?${params.toString()}`);
  const mapped = unwrapRows(events).map(mapCalendarEvent);

  const withSuggestions = await Promise.all(
    mapped.map(async (event) => {
      if (event.suggestion || event.companyId) {
        return event;
      }
      const suggestion = await buildSuggestion(workspaceId, event.attendees);
      return suggestion ? { ...event, suggestion } : event;
    }),
  );

  return withSuggestions.sort(
    (left, right) => left.startsAt.getTime() - right.startsAt.getTime(),
  );
}

export async function getCalendarEvent(_workspaceId: string, eventId: string) {
  const event = await crmFetch(`/calendar-events/${eventId}/`);
  if (!event || typeof event !== "object") {
    return null;
  }
  return mapCalendarEvent(event as Record<string, unknown>);
}
