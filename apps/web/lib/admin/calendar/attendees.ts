import { INTERNAL_GRAFT_DOMAINS } from "@/lib/admin/constants";

export type EventAttendee = {
  email: string;
  name?: string | null;
  isOrganizer?: boolean;
  responseStatus?: string | null;
};

export function parseAttendees(value: unknown): EventAttendee[] {
  if (!Array.isArray(value)) {
    return [];
  }

  return value.flatMap((entry): EventAttendee[] => {
    if (!entry || typeof entry !== "object") return [];
    const record = entry as Record<string, unknown>;
    const email = typeof record.email === "string" ? record.email.trim().toLowerCase() : null;
    if (!email) return [];
    return [
      {
        email,
        name: typeof record.name === "string" ? record.name : null,
        isOrganizer: record.isOrganizer === true,
        responseStatus:
          typeof record.responseStatus === "string" ? record.responseStatus : null,
      },
    ];
  });
}

export function domainOf(email: string) {
  const at = email.lastIndexOf("@");
  if (at === -1) return null;
  return email.slice(at + 1).toLowerCase();
}

export function isInternalDomain(domain: string | null) {
  if (!domain) return false;
  return (INTERNAL_GRAFT_DOMAINS as readonly string[]).includes(domain);
}

export function externalAttendees(attendees: EventAttendee[]) {
  return attendees.filter((attendee) => !isInternalDomain(domainOf(attendee.email)));
}
