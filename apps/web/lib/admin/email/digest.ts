import { prisma } from "@/lib/admin/db";
import { endOfDay, endOfWeek, startOfDay } from "@/lib/admin/crm";

export type DigestTask = {
  id: string;
  title: string;
  dueAt: Date | null;
  company: { id: string; name: string };
  contact: { id: string; name: string } | null;
};

export type DigestMeeting = {
  id: string;
  title: string;
  startsAt: Date;
  endsAt: Date;
  company: { id: string; name: string } | null;
};

export type UserDigest = {
  userId: string;
  email: string;
  name: string | null;
  workspaceId: string;
  overdue: DigestTask[];
  dueToday: DigestTask[];
  dueThisWeek: DigestTask[];
  meetingsToday: DigestMeeting[];
  taskCount: number;
  meetingCount: number;
};

const taskSelect = {
  id: true,
  title: true,
  dueAt: true,
  company: { select: { id: true, name: true } },
  contact: { select: { id: true, name: true } },
} as const;

export async function buildDigestForUser(
  userId: string,
  options: { now?: Date } = {},
): Promise<UserDigest | null> {
  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: { id: true, email: true, name: true, workspaceId: true },
  });
  if (!user) {
    return null;
  }

  const now = options.now ?? new Date();
  const today = startOfDay(now);
  const todayEnd = endOfDay(now);
  const weekEnd = endOfWeek(now);

  const baseTaskWhere = {
    status: "open" as const,
    ownerId: user.id,
    company: { workspaceId: user.workspaceId },
  };

  const [overdue, dueToday, dueThisWeek, meetingsToday] = await Promise.all([
    prisma.followUpTask.findMany({
      where: { ...baseTaskWhere, dueAt: { lt: today } },
      select: taskSelect,
      orderBy: [{ dueAt: "asc" }, { createdAt: "asc" }],
      take: 25,
    }),
    prisma.followUpTask.findMany({
      where: { ...baseTaskWhere, dueAt: { gte: today, lte: todayEnd } },
      select: taskSelect,
      orderBy: [{ dueAt: "asc" }, { createdAt: "asc" }],
      take: 25,
    }),
    prisma.followUpTask.findMany({
      where: {
        ...baseTaskWhere,
        dueAt: { gt: todayEnd, lte: weekEnd },
      },
      select: taskSelect,
      orderBy: [{ dueAt: "asc" }, { createdAt: "asc" }],
      take: 25,
    }),
    prisma.calendarEvent.findMany({
      where: {
        workspaceId: user.workspaceId,
        startsAt: { gte: today, lte: todayEnd },
        calendarAccount: { userId: user.id, status: "connected" },
      },
      select: {
        id: true,
        title: true,
        startsAt: true,
        endsAt: true,
        company: { select: { id: true, name: true } },
      },
      orderBy: { startsAt: "asc" },
      take: 10,
    }),
  ]);

  const taskCount = overdue.length + dueToday.length + dueThisWeek.length;

  return {
    userId: user.id,
    email: user.email,
    name: user.name,
    workspaceId: user.workspaceId,
    overdue,
    dueToday,
    dueThisWeek,
    meetingsToday,
    taskCount,
    meetingCount: meetingsToday.length,
  };
}
