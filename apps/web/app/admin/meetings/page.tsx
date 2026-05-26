import Link from "next/link";

import { connectDemoCalendarAction } from "@/app/admin/actions/calendar";
import { GoogleScheduleMeetingForm } from "@/components/admin/meetings/google-schedule-meeting-form";
import { ManualMeetingForm } from "@/components/admin/meetings/manual-meeting-form";
import { MeetingCard } from "@/components/admin/meetings/meeting-card";
import { Button } from "@/components/admin/ui/button";
import { listWorkspaceCompaniesForSelect } from "@/lib/admin/calendar/companies";
import { listWorkspaceUsers } from "@/lib/admin/companies/queries";
import { listCalendarAccountsForUser, listMeetingsForUser } from "@/lib/admin/calendar/queries";
import { requireAdmin } from "@/lib/admin/auth-check";

type MeetingsPageProps = {
  searchParams: Promise<{ scope?: string }>;
};

function bucketEvents<T extends { startsAt: Date }>(events: T[]) {
  const now = new Date();
  const startOfToday = new Date(now);
  startOfToday.setHours(0, 0, 0, 0);
  const endOfToday = new Date(startOfToday);
  endOfToday.setDate(endOfToday.getDate() + 1);
  const endOfWeek = new Date(startOfToday);
  endOfWeek.setDate(endOfWeek.getDate() + 7);

  const past: T[] = [];
  const today: T[] = [];
  const week: T[] = [];
  const later: T[] = [];

  for (const event of events) {
    if (event.startsAt < startOfToday) past.push(event);
    else if (event.startsAt < endOfToday) today.push(event);
    else if (event.startsAt < endOfWeek) week.push(event);
    else later.push(event);
  }

  return { past, today, week, later };
}

export default async function MeetingsPage({ searchParams }: MeetingsPageProps) {
  const { userId } = await requireAdmin();
  const filters = await searchParams;
  const scope = filters.scope === "all" ? "all" : "mine";

  const [accounts, companies, events, teammates] = await Promise.all([
    listCalendarAccountsForUser(userId),
    listWorkspaceCompaniesForSelect("00000000-0000-4000-8000-000000000001"),
    listMeetingsForUser("00000000-0000-4000-8000-000000000001", userId, {
      mineOnly: scope === "mine",
    }),
    listWorkspaceUsers("00000000-0000-4000-8000-000000000001"),
  ]);

  const activeAccount = accounts.find((account) => account.status === "connected");
  const googleConnected = accounts.some(
    (account) =>
      account.provider === "google" &&
      account.status === "connected" &&
      Boolean(account.refreshToken),
  );
  const { past, today, week, later } = bucketEvents(events);

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
        <div>
          <h1 className="text-3xl font-semibold tracking-tight">Meetings</h1>
          <p className="mt-1 max-w-2xl text-sm text-muted-foreground">
            Calendar events synced to the CRM. Confirm the company link and log the meeting in one click.
          </p>
        </div>
        <div className="flex items-center gap-2 text-sm">
          <Link
            href="/admin/meetings?scope=mine"
            className={`rounded-full border px-3 py-1 ${scope === "mine" ? "bg-primary text-primary-foreground" : ""}`}
          >
            My calendar
          </Link>
          <Link
            href="/admin/meetings?scope=all"
            className={`rounded-full border px-3 py-1 ${scope === "all" ? "bg-primary text-primary-foreground" : ""}`}
          >
            Team
          </Link>
        </div>
      </div>

      {!activeAccount ? (
        <section className="rounded-xl border border-dashed bg-background p-6">
          <h2 className="text-lg font-semibold">Connect a calendar</h2>
          <p className="mt-1 text-sm text-muted-foreground">
            Live Google Calendar needs OAuth set up for this deployment. Until then, use the demo calendar to test
            the flow with seeded events, or add meetings manually below.
          </p>
          <form action={connectDemoCalendarAction} className="mt-3">
            <Button type="submit">Connect demo calendar</Button>
          </form>
          <p className="mt-2 text-xs text-muted-foreground">
            Manage calendar accounts in <Link href="/admin/settings" className="underline">Settings</Link>.
          </p>
        </section>
      ) : null}

      <GoogleScheduleMeetingForm
        currentUserId={userId}
        teammates={teammates}
        companies={companies.map((company) => ({ id: company.id, name: company.name }))}
        googleConnected={googleConnected}
      />

      <ManualMeetingForm
        companies={companies.map((company) => ({ id: company.id, name: company.name }))}
      />

      {events.length === 0 && activeAccount ? (
        <div className="rounded-xl border border-dashed bg-background px-6 py-12 text-center">
          <p className="text-sm font-medium">No calendar events in range.</p>
          <p className="mt-1 text-sm text-muted-foreground">
            Try the team scope or refresh the demo calendar from Settings.
          </p>
        </div>
      ) : null}

      {today.length > 0 ? (
        <section className="space-y-3">
          <h2 className="text-sm font-semibold uppercase tracking-wide text-muted-foreground">Today</h2>
          {today.map((event) => (
            <MeetingCard key={event.id} event={event} companies={companies} />
          ))}
        </section>
      ) : null}

      {week.length > 0 ? (
        <section className="space-y-3">
          <h2 className="text-sm font-semibold uppercase tracking-wide text-muted-foreground">This week</h2>
          {week.map((event) => (
            <MeetingCard key={event.id} event={event} companies={companies} />
          ))}
        </section>
      ) : null}

      {later.length > 0 ? (
        <section className="space-y-3">
          <h2 className="text-sm font-semibold uppercase tracking-wide text-muted-foreground">Later</h2>
          {later.map((event) => (
            <MeetingCard key={event.id} event={event} companies={companies} />
          ))}
        </section>
      ) : null}

      {past.length > 0 ? (
        <section className="space-y-3">
          <h2 className="text-sm font-semibold uppercase tracking-wide text-muted-foreground">Recently completed</h2>
          {past.map((event) => (
            <MeetingCard key={event.id} event={event} companies={companies} />
          ))}
        </section>
      ) : null}
    </div>
  );
}
