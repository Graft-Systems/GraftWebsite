import { formatDate, formatDateTime } from "@/lib/admin/crm";
import { getAppBaseUrl } from "@/lib/admin/env";

export type DigestTask = {
  title: string;
  dueAt: Date | null;
  company: { id: string; name: string };
  contact: { name: string } | null;
};

export type DigestMeeting = {
  title: string;
  startsAt: Date;
  company: { id: string; name: string } | null;
};

export type UserDigest = {
  name: string | null;
  email: string;
  taskCount: number;
  meetingCount: number;
  overdue: DigestTask[];
  dueToday: DigestTask[];
  dueThisWeek: DigestTask[];
  meetingsToday: DigestMeeting[];
};

const baseUrl = getAppBaseUrl();

export type RenderedDigest = {
  subject: string;
  html: string;
  text: string;
};

function appLink(path: string): string {
  if (!path.startsWith("/")) {
    return `${baseUrl}/${path}`;
  }
  return `${baseUrl}${path}`;
}

function taskLine(task: DigestTask, includeDue = true): string {
  const due = includeDue && task.dueAt ? ` — due ${formatDate(task.dueAt)}` : "";
  const contact = task.contact ? ` (${task.contact.name})` : "";
  return `• ${task.title}${due} · ${task.company.name}${contact}`;
}

function meetingLine(meeting: DigestMeeting): string {
  const time = formatDateTime(meeting.startsAt);
  const company = meeting.company ? ` · ${meeting.company.name}` : "";
  return `• ${meeting.title}${company} — ${time}`;
}

function renderTaskSectionHtml(label: string, tasks: DigestTask[], accent: string): string {
  if (tasks.length === 0) {
    return "";
  }

  const rows = tasks
    .map((task) => {
      const due = task.dueAt
        ? `<span style="color:#64748b;font-size:13px;">Due ${formatDate(task.dueAt)}</span>`
        : `<span style="color:#94a3b8;font-size:13px;">No due date</span>`;
      const companyLink = appLink(`/companies/${task.company.id}`);
      const contact = task.contact
        ? `<span style="color:#64748b;font-size:13px;"> · ${task.contact.name}</span>`
        : "";
      return `
        <tr>
          <td style="padding:10px 0;border-bottom:1px solid #f1f5f9;">
            <div style="font-weight:600;color:#0f172a;font-size:14px;">${escapeHtml(task.title)}</div>
            <div style="margin-top:2px;">
              <a href="${companyLink}" style="color:#1d4ed8;text-decoration:none;font-size:13px;">${escapeHtml(task.company.name)}</a>${contact}
            </div>
            <div style="margin-top:4px;">${due}</div>
          </td>
        </tr>`;
    })
    .join("");

  return `
    <div style="margin-top:24px;">
      <div style="display:inline-block;padding:4px 10px;border-radius:999px;background:${accent};color:#fff;font-size:11px;font-weight:600;letter-spacing:0.05em;text-transform:uppercase;">${escapeHtml(label)} · ${tasks.length}</div>
      <table role="presentation" cellpadding="0" cellspacing="0" border="0" width="100%" style="margin-top:8px;border-collapse:collapse;">
        <tbody>${rows}</tbody>
      </table>
    </div>`;
}

function renderMeetingSectionHtml(meetings: DigestMeeting[]): string {
  if (meetings.length === 0) {
    return "";
  }
  const rows = meetings
    .map((meeting) => {
      const companyHtml = meeting.company
        ? ` · <a href="${appLink(`/companies/${meeting.company.id}`)}" style="color:#1d4ed8;text-decoration:none;">${escapeHtml(meeting.company.name)}</a>`
        : "";
      return `
        <tr>
          <td style="padding:10px 0;border-bottom:1px solid #f1f5f9;">
            <div style="font-weight:600;color:#0f172a;font-size:14px;">${escapeHtml(meeting.title)}</div>
            <div style="margin-top:2px;color:#64748b;font-size:13px;">${formatDateTime(meeting.startsAt)}${companyHtml}</div>
          </td>
        </tr>`;
    })
    .join("");

  return `
    <div style="margin-top:24px;">
      <div style="display:inline-block;padding:4px 10px;border-radius:999px;background:#0f766e;color:#fff;font-size:11px;font-weight:600;letter-spacing:0.05em;text-transform:uppercase;">Meetings today · ${meetings.length}</div>
      <table role="presentation" cellpadding="0" cellspacing="0" border="0" width="100%" style="margin-top:8px;border-collapse:collapse;">
        <tbody>${rows}</tbody>
      </table>
    </div>`;
}

function escapeHtml(value: string): string {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

export function renderDigest(digest: UserDigest): RenderedDigest {
  const greeting = digest.name?.split(" ")[0] ?? digest.email.split("@")[0];
  const taskWord = digest.taskCount === 1 ? "follow-up" : "follow-ups";
  const meetingTag = digest.meetingCount
    ? ` · ${digest.meetingCount} meeting${digest.meetingCount === 1 ? "" : "s"} today`
    : "";

  const subject =
    digest.taskCount === 0 && digest.meetingCount === 0
      ? "Graft CRM — you're all clear"
      : `Graft CRM — ${digest.taskCount} ${taskWord}${meetingTag}`;

  const inboxLink = appLink("/inbox");

  const overdueHtml = renderTaskSectionHtml("Overdue", digest.overdue, "#dc2626");
  const todayHtml = renderTaskSectionHtml("Due today", digest.dueToday, "#1d4ed8");
  const weekHtml = renderTaskSectionHtml("Due this week", digest.dueThisWeek, "#0ea5e9");
  const meetingsHtml = renderMeetingSectionHtml(digest.meetingsToday);

  const emptyState =
    digest.taskCount === 0 && digest.meetingCount === 0
      ? `<p style="margin-top:24px;padding:16px;border-radius:12px;background:#f8fafc;color:#475569;font-size:14px;">
          Nothing on your plate right now. Use this time to log notes from yesterday or open the
          <a href="${inboxLink}" style="color:#1d4ed8;text-decoration:none;">inbox</a> to grab unassigned work.
         </p>`
      : "";

  const html = `<!doctype html>
<html>
  <body style="margin:0;padding:24px;background:#f8fafc;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,Helvetica,Arial,sans-serif;color:#0f172a;">
    <table role="presentation" cellpadding="0" cellspacing="0" border="0" width="100%" style="max-width:560px;margin:0 auto;background:#ffffff;border-radius:16px;border:1px solid #e2e8f0;">
      <tr>
        <td style="padding:24px;">
          <p style="margin:0;color:#64748b;font-size:12px;letter-spacing:0.08em;text-transform:uppercase;">Daily digest</p>
          <h1 style="margin:6px 0 0;font-size:22px;font-weight:600;">Good morning${greeting ? `, ${escapeHtml(greeting)}` : ""}.</h1>
          <p style="margin:8px 0 0;color:#475569;font-size:14px;">
            You have <strong>${digest.taskCount}</strong> open ${taskWord}${meetingTag ? ` and <strong>${digest.meetingCount}</strong> meeting${digest.meetingCount === 1 ? "" : "s"} today` : ""}.
          </p>
          ${overdueHtml}${todayHtml}${weekHtml}${meetingsHtml}${emptyState}
          <div style="margin-top:28px;">
            <a href="${inboxLink}" style="display:inline-block;padding:10px 16px;border-radius:10px;background:#0f172a;color:#fff;font-size:14px;text-decoration:none;">Open inbox</a>
          </div>
          <p style="margin:28px 0 0;color:#94a3b8;font-size:12px;">
            Sent to ${escapeHtml(digest.email)}. Manage reminders in
            <a href="${appLink("/settings")}" style="color:#64748b;text-decoration:underline;">settings</a>.
          </p>
        </td>
      </tr>
    </table>
  </body>
</html>`;

  const textLines: string[] = [];
  textLines.push(
    digest.taskCount === 0 && digest.meetingCount === 0
      ? "Nothing on your plate right now."
      : `You have ${digest.taskCount} open ${taskWord}${meetingTag ? ` and ${digest.meetingCount} meeting${digest.meetingCount === 1 ? "" : "s"} today` : ""}.`,
  );
  if (digest.overdue.length) {
    textLines.push("", "Overdue:", ...digest.overdue.map((task) => taskLine(task)));
  }
  if (digest.dueToday.length) {
    textLines.push("", "Due today:", ...digest.dueToday.map((task) => taskLine(task)));
  }
  if (digest.dueThisWeek.length) {
    textLines.push("", "Due this week:", ...digest.dueThisWeek.map((task) => taskLine(task)));
  }
  if (digest.meetingsToday.length) {
    textLines.push("", "Meetings today:", ...digest.meetingsToday.map((meeting) => meetingLine(meeting)));
  }
  textLines.push("", `Open inbox: ${inboxLink}`);

  return {
    subject,
    html,
    text: textLines.join("\n"),
  };
}
