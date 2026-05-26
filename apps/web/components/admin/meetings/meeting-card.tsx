import Link from "next/link";

import {
  confirmEventCompanyAction,
  logMeetingAction,
  skipEventAction,
} from "@/app/admin/actions/calendar";
import { Badge } from "@/components/admin/ui/badge";
import { Button } from "@/components/admin/ui/button";
import { Label } from "@/components/admin/ui/label";
import type { CalendarSuggestion } from "@/lib/admin/calendar/queries";
import { cn } from "@/lib/admin/utils";

type AttendeeLite = {
  email: string;
  name?: string | null;
  isOrganizer?: boolean;
};

type CompanyOption = {
  id: string;
  name: string;
  domain: string | null;
  contacts: { id: string; name: string; email: string | null; isPrimary: boolean }[];
};

type MeetingCardProps = {
  event: {
    id: string;
    title: string;
    description: string | null;
    startsAt: Date;
    endsAt: Date;
    location: string | null;
    meetingUrl: string | null;
    linkStatus: string;
    attendees: AttendeeLite[];
    company: { id: string; name: string } | null;
    contact: { id: string; name: string } | null;
    interaction: { id: string } | null;
    suggestion: CalendarSuggestion | null;
  };
  companies: CompanyOption[];
};

const selectClassName = cn(
  "flex h-9 w-full rounded-md border border-input bg-transparent px-3 py-1 text-sm shadow-xs outline-none transition-colors",
  "focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50",
);

function formatTimeRange(startsAt: Date, endsAt: Date) {
  const date = startsAt.toLocaleDateString(undefined, {
    weekday: "short",
    month: "short",
    day: "numeric",
  });
  const start = startsAt.toLocaleTimeString(undefined, {
    hour: "numeric",
    minute: "2-digit",
  });
  const end = endsAt.toLocaleTimeString(undefined, {
    hour: "numeric",
    minute: "2-digit",
  });
  return `${date} · ${start} – ${end}`;
}

function statusBadge(status: string) {
  switch (status) {
    case "confirmed":
      return <Badge variant="secondary">Confirmed</Badge>;
    case "skipped":
      return <Badge variant="outline">Skipped</Badge>;
    case "suggested":
      return <Badge variant="outline">Suggested</Badge>;
    default:
      return <Badge variant="outline">No match yet</Badge>;
  }
}

export function MeetingCard({ event, companies }: MeetingCardProps) {
  const externalAttendees = event.attendees.filter(
    (attendee) => !attendee.email.endsWith("@graft.systems"),
  );
  const isLogged = Boolean(event.interaction);

  return (
    <article className="space-y-4 rounded-xl border bg-background p-5">
      <header className="flex flex-wrap items-start justify-between gap-3">
        <div className="space-y-1">
          <div className="flex flex-wrap items-center gap-2">
            <h3 className="text-base font-semibold">{event.title}</h3>
            {statusBadge(event.linkStatus)}
            {isLogged ? <Badge variant="secondary">Logged</Badge> : null}
          </div>
          <p className="text-sm text-muted-foreground">{formatTimeRange(event.startsAt, event.endsAt)}</p>
          {event.location ? (
            <p className="text-sm text-muted-foreground">{event.location}</p>
          ) : null}
          {event.meetingUrl ? (
            <a
              className="text-sm text-primary hover:underline"
              href={event.meetingUrl}
              target="_blank"
              rel="noreferrer"
            >
              Join meeting
            </a>
          ) : null}
        </div>
        {event.company ? (
          <Link
            href={`/admin/companies/${event.company.id}`}
            className="text-sm font-medium text-primary hover:underline"
          >
            {event.company.name} →
          </Link>
        ) : null}
      </header>

      <div className="flex flex-wrap gap-2 text-sm">
        {externalAttendees.length === 0 ? (
          <span className="text-muted-foreground">No external attendees.</span>
        ) : (
          externalAttendees.map((attendee) => (
            <span
              key={attendee.email}
              className="rounded-full border bg-muted/40 px-3 py-1 text-xs"
              title={attendee.email}
            >
              {attendee.name ?? attendee.email}
            </span>
          ))
        )}
      </div>

      {event.description ? (
        <p className="text-sm text-muted-foreground whitespace-pre-wrap">{event.description}</p>
      ) : null}

      {event.linkStatus === "confirmed" && event.company ? (
        <div className="flex flex-wrap items-center gap-2 rounded-lg border bg-muted/30 p-3">
          <p className="text-sm">
            Linked to <span className="font-medium">{event.company.name}</span>
            {event.contact ? ` · ${event.contact.name}` : null}
          </p>
          {isLogged ? (
            <Link
              href={`/admin/companies/${event.company.id}`}
              className="ml-auto text-sm text-primary hover:underline"
            >
              Open timeline
            </Link>
          ) : (
            <form action={logMeetingAction.bind(null, event.id)} className="ml-auto">
              <Button type="submit" size="sm">
                Log this meeting
              </Button>
            </form>
          )}
        </div>
      ) : (
        <form
          action={confirmEventCompanyAction.bind(null, event.id)}
          className="grid gap-3 rounded-lg border bg-muted/20 p-3 md:grid-cols-[1fr_1fr_auto]"
        >
          <div className="space-y-1">
            <Label htmlFor={`company-${event.id}`}>Company</Label>
            <select
              id={`company-${event.id}`}
              name="companyId"
              defaultValue={event.suggestion?.companyId ?? ""}
              className={selectClassName}
              required
            >
              <option value="">Select a company</option>
              {companies.map((company) => (
                <option key={company.id} value={company.id}>
                  {company.name}
                  {company.domain ? ` · ${company.domain}` : ""}
                </option>
              ))}
            </select>
            {event.suggestion ? (
              <p className="text-xs text-muted-foreground">
                Suggested via {event.suggestion.matchKind === "exact_email" ? "email match" : "domain match"}
                {": "}
                {event.suggestion.matchedEmail}
              </p>
            ) : null}
          </div>
          <div className="space-y-1">
            <Label htmlFor={`contact-${event.id}`}>Contact (optional)</Label>
            <select
              id={`contact-${event.id}`}
              name="contactId"
              defaultValue={event.suggestion?.contactId ?? ""}
              className={selectClassName}
            >
              <option value="">No specific contact</option>
              {(
                companies.find((c) => c.id === event.suggestion?.companyId)?.contacts ?? []
              ).map((contact) => (
                <option key={contact.id} value={contact.id}>
                  {contact.name}
                  {contact.email ? ` · ${contact.email}` : ""}
                </option>
              ))}
            </select>
          </div>
          <div className="flex items-end gap-2">
            <Button type="submit" size="sm">
              Confirm link
            </Button>
          </div>
        </form>
      )}

      {event.linkStatus !== "confirmed" ? (
        <div>
          <form action={skipEventAction.bind(null, event.id)}>
            <Button type="submit" size="sm" variant="ghost">
              Skip this meeting
            </Button>
          </form>
        </div>
      ) : null}
    </article>
  );
}
