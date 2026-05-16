import type { Prisma } from "@/generated/prisma/client";

import { prisma } from "@/lib/admin/db";
import { env } from "@/lib/admin/env";

import { buildDigestForUser, type UserDigest } from "./digest";
import { sendEmail, getEmailProviderInfo } from "./provider";
import { renderDigest } from "./render";

export type EnqueueDigestResult = {
  digestId: string;
  status: string;
  provider: string;
  taskCount: number;
  meetingCount: number;
  recipientEmail: string;
};

export async function enqueueDigestForUser(
  userId: string,
  options: { kind?: "daily_digest" | "test_digest"; force?: boolean; now?: Date } = {},
): Promise<EnqueueDigestResult | null> {
  const kind = options.kind ?? "daily_digest";
  const digest = await buildDigestForUser(userId, { now: options.now });
  if (!digest) {
    return null;
  }

  const isEmpty = digest.taskCount === 0 && digest.meetingCount === 0;
  if (isEmpty && kind === "daily_digest" && !options.force) {
    return null;
  }

  return enqueueDigest(digest, kind);
}

export async function enqueueDigest(
  digest: UserDigest,
  kind: "daily_digest" | "test_digest" = "daily_digest",
): Promise<EnqueueDigestResult> {
  const rendered = renderDigest(digest);
  const providerInfo = getEmailProviderInfo();
  const outboundEmail = (env.email.digestOutboundOverride ?? digest.email).trim().toLowerCase();

  const row = await prisma.emailDigest.create({
    data: {
      workspaceId: digest.workspaceId,
      recipientId: digest.userId,
      recipientEmail: outboundEmail,
      kind,
      provider: providerInfo.provider,
      subject: rendered.subject,
      bodyHtml: rendered.html,
      bodyText: rendered.text,
      taskIds: collectTaskIds(digest) as Prisma.InputJsonValue,
      meetingIds: digest.meetingsToday.map((m) => m.id) as Prisma.InputJsonValue,
      taskCount: digest.taskCount,
      meetingCount: digest.meetingCount,
      status: "queued",
    },
  });

  const result = await sendEmail({
    to: outboundEmail,
    subject: rendered.subject,
    html: rendered.html,
    text: rendered.text,
  });

  let status = "queued";
  let error: string | null = null;
  let providerMessageId: string | null = null;
  let sentAt: Date | null = null;

  if (result.status === "sent") {
    status = "sent";
    providerMessageId = result.providerMessageId;
    sentAt = new Date();
  } else if (result.status === "outbox_only") {
    status = "outbox_only";
    sentAt = new Date();
  } else {
    status = "error";
    error = result.error;
  }

  await prisma.emailDigest.update({
    where: { id: row.id },
    data: { status, error, providerMessageId, sentAt },
  });

  return {
    digestId: row.id,
    status,
    provider: providerInfo.provider,
    taskCount: digest.taskCount,
    meetingCount: digest.meetingCount,
    recipientEmail: outboundEmail,
  };
}

export async function runDailyDigestForWorkspace(
  workspaceId: string,
  options: { now?: Date; force?: boolean } = {},
): Promise<{ enqueued: EnqueueDigestResult[]; skipped: string[] }> {
  const users = await prisma.user.findMany({
    where: { workspaceId },
    select: { id: true, email: true },
  });

  const enqueued: EnqueueDigestResult[] = [];
  const skipped: string[] = [];

  for (const user of users) {
    const digest = await buildDigestForUser(user.id, { now: options.now });
    if (!digest) {
      skipped.push(user.id);
      continue;
    }
    const isEmpty = digest.taskCount === 0 && digest.meetingCount === 0;
    if (isEmpty && !options.force) {
      skipped.push(user.id);
      continue;
    }
    const result = await enqueueDigest(digest, "daily_digest");
    enqueued.push(result);
  }

  return { enqueued, skipped };
}

function collectTaskIds(digest: UserDigest): string[] {
  return [
    ...digest.overdue.map((task) => task.id),
    ...digest.dueToday.map((task) => task.id),
    ...digest.dueThisWeek.map((task) => task.id),
  ];
}
