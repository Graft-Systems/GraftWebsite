import { prisma } from "@/lib/admin/db";

type DemoSeedContext = {
  workspaceId: string;
  userId: string;
  calendarAccountId: string;
};

function hoursFromNow(hours: number) {
  return new Date(Date.now() + hours * 60 * 60 * 1000);
}

export async function seedDemoEvents({ workspaceId, userId, calendarAccountId }: DemoSeedContext) {
  const acme = await prisma.company.findFirst({
    where: { workspaceId, name: "Acme Robotics" },
    select: { id: true, contacts: { where: { isPrimary: true }, take: 1 } },
  });
  const northwind = await prisma.company.findFirst({
    where: { workspaceId, name: "Northwind Logistics" },
    select: { id: true, contacts: { where: { isPrimary: true }, take: 1 } },
  });

  const today = new Date();
  today.setMinutes(0, 0, 0);
  const at = (hourOffset: number) => {
    const d = new Date(today);
    d.setHours(today.getHours() + hourOffset);
    return d;
  };

  type DemoEvent = {
    externalId: string;
    title: string;
    startsAt: Date;
    endsAt: Date;
    attendees: { email: string; name: string; isOrganizer?: boolean }[];
    location?: string;
    meetingUrl?: string;
    description?: string;
  };

  const events: DemoEvent[] = [
    {
      externalId: "demo-northwind-intro",
      title: "Northwind intro — routing demo",
      startsAt: at(3),
      endsAt: at(4),
      attendees: [
        { email: "elena@northwind.example", name: "Elena Marchetti" },
        { email: "owner@graft.systems", name: "Graft Owner", isOrganizer: true },
      ],
      meetingUrl: "https://meet.example/north-wind-intro",
      description: "Walk through routing demo, talk through exception handling.",
    },
    {
      externalId: "demo-acme-pilot-checkin",
      title: "Acme field-notes pilot weekly",
      startsAt: hoursFromNow(28),
      endsAt: hoursFromNow(29),
      attendees: [
        { email: "sarah@acme.example", name: "Sarah Chen" },
        { email: "marcus@acme.example", name: "Marcus Lee" },
        { email: "owner@graft.systems", name: "Graft Owner", isOrganizer: true },
      ],
      meetingUrl: "https://meet.example/abc-defg-hij",
      description: "Week-two metrics review and security follow-ups.",
    },
    {
      externalId: "demo-unmatched-vendor-intro",
      title: "Intro: prospective vendor partner",
      startsAt: hoursFromNow(72),
      endsAt: hoursFromNow(73),
      attendees: [
        { email: "buyer@vendor.example", name: "Priya Rao" },
        { email: "teammate@graft.systems", name: "Graft Teammate", isOrganizer: true },
      ],
      description: "Cold intro from the conference — explore distribution fit.",
    },
  ];

  for (const event of events) {
    await prisma.calendarEvent.upsert({
      where: {
        calendarAccountId_externalId: {
          calendarAccountId,
          externalId: event.externalId,
        },
      },
      update: {
        title: event.title,
        startsAt: event.startsAt,
        endsAt: event.endsAt,
        description: event.description ?? null,
        location: event.location ?? null,
        meetingUrl: event.meetingUrl ?? null,
        attendees: event.attendees,
        organizerEmail: event.attendees.find((attendee) => attendee.isOrganizer)?.email ?? null,
        linkStatus: "unmatched",
        companyId: null,
        contactId: null,
      },
      create: {
        workspaceId,
        calendarAccountId,
        externalId: event.externalId,
        title: event.title,
        startsAt: event.startsAt,
        endsAt: event.endsAt,
        description: event.description ?? null,
        location: event.location ?? null,
        meetingUrl: event.meetingUrl ?? null,
        attendees: event.attendees,
        organizerEmail: event.attendees.find((attendee) => attendee.isOrganizer)?.email ?? null,
        linkStatus: "unmatched",
      },
    });
  }

  return { acmeId: acme?.id ?? null, northwindId: northwind?.id ?? null, userId };
}
