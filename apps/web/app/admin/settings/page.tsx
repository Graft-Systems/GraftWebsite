import { updateStageLabelAction } from "@/app/admin/actions/companies";
import {
  connectDemoCalendarAction,
  disconnectCalendarAction,
  refreshDemoCalendarAction,
} from "@/app/admin/actions/calendar";
import {
  deleteDigestAction,
  runDailyDigestNowAction,
  sendTestDigestAction,
} from "@/app/admin/actions/notifications";
import {
  connectDemoWisprAction,
  disconnectWisprAction,
} from "@/app/admin/actions/wispr";
import Link from "next/link";

import { Badge } from "@/components/admin/ui/badge";
import { Button, buttonVariants } from "@/components/admin/ui/button";
import { Input } from "@/components/admin/ui/input";
import { listCalendarAccountsForUser } from "@/lib/admin/calendar/queries";
import { listKnownTags, listRelationshipStages, listWorkspaceUsers } from "@/lib/admin/companies/queries";
import { CALENDAR_PROVIDERS } from "@/lib/admin/constants";
import { formatDateTime } from "@/lib/admin/crm";
import { getEmailProviderInfo } from "@/lib/admin/email/provider";
import { listRecentDigests } from "@/lib/admin/email/queries";
import {
  getGoogleRedirectUri,
  isCronSecretConfigured,
  isGoogleCalendarConfigured,
  isWisprWebhookConfigured,
} from "@/lib/admin/env";
import { requireAdmin } from "@/lib/admin/auth-check";
import { getWisprConnectionForUser } from "@/lib/admin/wispr/queries";

function digestStatusVariant(status: string): "default" | "secondary" | "outline" | "destructive" {
  if (status === "sent") return "default";
  if (status === "outbox_only") return "secondary";
  if (status === "error") return "destructive";
  return "outline";
}

function digestStatusLabel(status: string): string {
  switch (status) {
    case "sent":
      return "Sent";
    case "outbox_only":
      return "Outbox only";
    case "queued":
      return "Queued";
    case "error":
      return "Error";
    case "skipped":
      return "Skipped";
    default:
      return status;
  }
}

function providerLabel(provider: string) {
  return CALENDAR_PROVIDERS.find((entry) => entry.value === provider)?.label ?? provider;
}

export default async function SettingsPage({
  searchParams,
}: {
  searchParams: Promise<{
    calendar?: string;
    err?: string;
    detail?: string;
    reason?: string;
  }>;
}) {
  const { userId } = await requireAdmin();
  const cal = await searchParams;
  const [stages, tags, workspaceUsers, calendarAccounts, wisprConnection, recentDigests] = await Promise.all([
    listRelationshipStages("00000000-0000-4000-8000-000000000001"),
    listKnownTags("00000000-0000-4000-8000-000000000001"),
    listWorkspaceUsers("00000000-0000-4000-8000-000000000001"),
    listCalendarAccountsForUser(userId),
    getWisprConnectionForUser(userId),
    listRecentDigests("00000000-0000-4000-8000-000000000001", 10),
  ]);

  const emailInfo = getEmailProviderInfo();
  const cronSecretConfigured = isCronSecretConfigured();
  const wisprApiConfigured = isWisprWebhookConfigured();
  const wisprConnected = wisprConnection?.status === "connected";
  const googleConfigured = isGoogleCalendarConfigured();
  const activeAccounts = calendarAccounts.filter((account) => account.status !== "disconnected");

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-3xl font-semibold tracking-tight">Settings</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Workspace defaults and personal integrations.
        </p>
      </div>

      <div className="rounded-xl border border-border bg-card p-6 shadow-sm">
        <p className="text-sm font-medium">Sign-in &amp; team</p>
        <p className="mt-1 text-sm text-muted-foreground">
          Workspace accounts use email and password. Successful sign-ins update &quot;Last sign-in&quot;.
          Users without a password on file choose one on first login.
        </p>
        <ul className="mt-4 divide-y divide-border rounded-lg border">
          {workspaceUsers.map((member) => (
            <li
              key={member.id}
              className="flex flex-wrap items-baseline justify-between gap-x-4 gap-y-1 px-3 py-2.5 text-sm"
            >
              <div>
                <span className="font-medium text-foreground">{member.name ?? member.email}</span>
                {member.name ? (
                  <span className="ml-2 text-muted-foreground">{member.email}</span>
                ) : null}
                <span className="ml-2 rounded-md bg-muted px-1.5 py-0.5 text-xs capitalize text-muted-foreground">
                  {member.role}
                </span>
              </div>
              <span className="text-xs tabular-nums text-muted-foreground">
                Last sign-in:{" "}
                {member.lastSignInAt ? formatDateTime(member.lastSignInAt) : "— (not yet)"}
              </span>
            </li>
          ))}
        </ul>
      </div>

      {cal.calendar === "google_ok" ? (
        <p className="rounded-lg border border-green-200 bg-green-50 px-4 py-3 text-sm text-green-900 dark:border-green-900 dark:bg-green-950 dark:text-green-100">
          Google Calendar connected. You can schedule invites from the Meetings page.
        </p>
      ) : null}
      {cal.calendar === "google_denied" ? (
        <p className="rounded-lg border px-4 py-3 text-sm text-muted-foreground">
          Google sign-in was cancelled. Try again when you&apos;re ready.
        </p>
      ) : null}
      {cal.calendar === "google_oauth" ? (
        <p className="rounded-lg border border-destructive/40 bg-destructive/10 px-4 py-3 text-sm text-destructive">
          Google OAuth error{cal.err ? ` (${cal.err})` : ""}.{cal.detail ? ` ${cal.detail}` : ""}{" "}
          In Google Cloud Console, enable{" "}
          <strong className="font-medium">Google Calendar API</strong>, add scope{" "}
          <code className="rounded bg-muted px-1 text-foreground">calendar.events</code>,{" "}
          <code className="rounded bg-muted px-1 text-foreground">userinfo.email</code>,{" "}
          <code className="rounded bg-muted px-1 text-foreground">userinfo.profile</code>,{" "}
          <code className="rounded bg-muted px-1 text-foreground">openid</code>, on the{" "}
          <strong className="font-medium">OAuth consent screen → Scopes</strong>, add yourself as a{" "}
          <strong className="font-medium">Test user</strong> if the app is in Testing, then try again.
        </p>
      ) : null}
      {cal.calendar === "google_state" ? (
        <p className="rounded-lg border border-destructive/40 bg-destructive/10 px-4 py-3 text-sm text-destructive">
          {cal.reason === "session"
            ? "Google returned OK, but the CRM lost your login session — sign out and sign in again, then connect Google Calendar in one browser tab."
            : cal.reason === "state"
              ? "Google callback did not match this session — try connecting again without extra tabs."
              : "Google callback was incomplete — disconnect and try Connect Google Calendar again."}
        </p>
      ) : null}
      {cal.calendar === "google_error" || cal.calendar === "google_config" ? (
        <p className="rounded-lg border border-destructive/40 bg-destructive/10 px-4 py-3 text-sm text-destructive">
          Could not connect Google Calendar. Check your Google Cloud OAuth client: app credentials, redirect URI
          (must match exactly), <strong className="font-medium">OAuth consent scopes</strong> for calendar and
          profile/email, and that everything lives in the{" "}
          <strong className="font-medium">same Google Cloud project</strong>.
          {cal.detail ? (
            <>
              {" "}
              <span className="block mt-2 text-xs opacity-95">
                Detail: <code className="break-all">{cal.detail}</code>
              </span>
            </>
          ) : null}
        </p>
      ) : null}

      <section className="space-y-4 rounded-xl border bg-background p-6">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <h2 className="text-lg font-semibold">Email reminders</h2>
            <p className="text-sm text-muted-foreground">
              Daily digests of overdue, due-today, and due-this-week follow-ups for each owner, plus
              meetings on today&apos;s calendar. Every send is recorded in the outbox below.
            </p>
          </div>
          <Badge variant={emailInfo.provider === "resend" ? "default" : "secondary"}>
            {emailInfo.provider === "resend" ? "Resend connected" : "Outbox only"}
          </Badge>
        </div>

        <div className="grid gap-3 md:grid-cols-2">
          <div className="space-y-2 rounded-lg border p-4">
            <div className="flex items-center justify-between">
              <p className="text-sm font-medium">Provider</p>
              <Badge variant={emailInfo.configured ? "default" : "outline"}>
                {emailInfo.configured ? "Configured" : "Not configured"}
              </Badge>
            </div>
            <p className="text-xs text-muted-foreground">
              {emailInfo.configured
                ? `Sending real email through Resend as ${emailInfo.from}.`
                : (emailInfo.reason ?? "No email provider is configured yet.")}
            </p>
            <p className="text-xs text-muted-foreground">
              Until Resend is configured, digests are still rendered and stored in the outbox so you
              can preview what will go out.
            </p>
          </div>
          <div className="space-y-2 rounded-lg border p-4">
            <div className="flex items-center justify-between">
              <p className="text-sm font-medium">Daily automation</p>
              <Badge variant={cronSecretConfigured ? "default" : "outline"}>
                {cronSecretConfigured ? "Protected" : "Dev only"}
              </Badge>
            </div>
            <p className="text-xs text-muted-foreground">
              In production, schedule a daily request to{" "}
              <code className="rounded bg-muted px-1">/api/cron/reminders</code> using your host&apos;s cron or
              another scheduler.
              {cronSecretConfigured ? (
                <>
                  {" "}
                  Include the <strong className="font-medium text-foreground">Bearer token</strong> or signed
                  query parameter your team configured on the server so only your automation can run digests.
                </>
              ) : (
                <>
                  {" "}
                  Production uses a shared server secret so random callers can&apos;t trigger sends; local dev
                  skips that check.
                </>
              )}
            </p>
            <div className="flex flex-wrap gap-2">
              <form action={sendTestDigestAction}>
                <Button type="submit" size="sm">
                  Send me a test digest
                </Button>
              </form>
              <form action={runDailyDigestNowAction}>
                <Button type="submit" size="sm" variant="outline">
                  Run today&apos;s digest now
                </Button>
              </form>
            </div>
          </div>
        </div>

        <div className="space-y-2">
          <p className="text-sm font-medium">Recent digests</p>
          {recentDigests.length === 0 ? (
            <p className="text-sm text-muted-foreground">
              No digests yet. Send a test digest to see one appear here.
            </p>
          ) : (
            <div className="space-y-2">
              {recentDigests.map((digest) => (
                <div
                  key={digest.id}
                  className="flex flex-wrap items-center justify-between gap-3 rounded-lg border p-3"
                >
                  <div className="min-w-0">
                    <p className="truncate text-sm font-medium">{digest.subject}</p>
                    <p className="text-xs text-muted-foreground">
                      {formatDateTime(digest.sentAt ?? digest.createdAt)} ·{" "}
                      {digest.recipient.name ?? digest.recipientEmail} ·{" "}
                      {digest.taskCount} task{digest.taskCount === 1 ? "" : "s"}
                      {digest.meetingCount
                        ? ` · ${digest.meetingCount} meeting${digest.meetingCount === 1 ? "" : "s"}`
                        : ""}
                    </p>
                    {digest.error ? (
                      <p className="mt-1 text-xs text-destructive">{digest.error}</p>
                    ) : null}
                  </div>
                  <div className="flex items-center gap-2">
                    <Badge variant={digestStatusVariant(digest.status)}>
                      {digestStatusLabel(digest.status)}
                    </Badge>
                    <form action={deleteDigestAction.bind(null, digest.id)}>
                      <Button
                        type="submit"
                        size="sm"
                        variant="ghost"
                        className="h-7 px-2 text-xs text-muted-foreground hover:text-foreground"
                      >
                        Clear
                      </Button>
                    </form>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </section>

      <section className="space-y-4 rounded-xl border bg-background p-6">
        <div>
          <h2 className="text-lg font-semibold">Calendar integrations</h2>
          <p className="text-sm text-muted-foreground">
            Sync your calendar so external meetings surface in the CRM. Demo mode works out of the box for
            evaluation. Live Google Calendar uses OAuth configured for this deployment by your administrator.
          </p>
        </div>
        <div className="grid gap-3 md:grid-cols-2">
          <div className="space-y-2 rounded-lg border p-4">
            <div className="flex items-center justify-between">
              <p className="text-sm font-medium">Google Calendar</p>
              <Badge variant={googleConfigured ? "secondary" : "outline"}>
                {googleConfigured ? "Configured" : "Not configured"}
              </Badge>
            </div>
            <p className="text-xs text-muted-foreground">
              Connect once with OAuth. Then schedule meetings from <strong>Meetings</strong> and invite teammates —
              Google emails them a calendar invitation so it appears on their calendar (when their workspace email
              matches their Google account).
            </p>
            <p className="text-xs text-muted-foreground">
              Authorized redirect URI in Google Cloud Console:{" "}
              <code className="break-all rounded bg-muted px-1">
                {getGoogleRedirectUri()}
              </code>
            </p>
            {googleConfigured ? (
              <Link
                href="/api/calendar/google/start"
                className={buttonVariants({ variant: "outline", size: "sm" })}
              >
                Connect Google Calendar
              </Link>
            ) : (
              <Button type="button" variant="outline" size="sm" disabled>
                Google Calendar not enabled for this deployment
              </Button>
            )}
          </div>
          <div className="space-y-2 rounded-lg border p-4">
            <div className="flex items-center justify-between">
              <p className="text-sm font-medium">Demo calendar</p>
              <Badge variant="secondary">Ready</Badge>
            </div>
            <p className="text-xs text-muted-foreground">
              Loads a few sample meetings (one matched company, one unmatched) so the workflow is testable now.
            </p>
            <form action={connectDemoCalendarAction}>
              <Button type="submit" size="sm">
                {activeAccounts.find((a) => a.provider === "demo")
                  ? "Refresh demo meetings"
                  : "Connect demo calendar"}
              </Button>
            </form>
          </div>
        </div>

        {calendarAccounts.length > 0 ? (
          <div className="space-y-2">
            <p className="text-sm font-medium">Your accounts</p>
            <div className="space-y-2">
              {calendarAccounts.map((account) => (
                <div
                  key={account.id}
                  className="flex flex-wrap items-center justify-between gap-3 rounded-lg border p-3"
                >
                  <div>
                    <p className="text-sm font-medium">
                      {account.displayName ?? providerLabel(account.provider)}
                    </p>
                    <p className="text-xs text-muted-foreground">
                      {providerLabel(account.provider)} · {account.status}
                    </p>
                  </div>
                  <div className="flex gap-2">
                    {account.provider === "demo" && account.status === "connected" ? (
                      <form action={refreshDemoCalendarAction.bind(null, account.id)}>
                        <Button type="submit" variant="outline" size="sm">
                          Refresh
                        </Button>
                      </form>
                    ) : null}
                    {account.status === "connected" ? (
                      <form action={disconnectCalendarAction.bind(null, account.id)}>
                        <Button type="submit" variant="outline" size="sm">
                          Disconnect
                        </Button>
                      </form>
                    ) : null}
                  </div>
                </div>
              ))}
            </div>
          </div>
        ) : null}
      </section>

      <section className="space-y-4 rounded-xl border bg-background p-6">
        <div>
          <h2 className="text-lg font-semibold">Wispr Flow integration</h2>
          <p className="text-sm text-muted-foreground">
            Wispr dictation lands in the {""}
            <a href="/admin/wispr" className="underline">
              Wispr inbox
            </a>
            {""} as draft interactions and runs through the same AI review pipeline as in-app voice and paste.
            Real API access is partner-gated; demo mode lets you exercise the full flow today.
          </p>
        </div>
        <div className="grid gap-3 md:grid-cols-2">
          <div className="space-y-2 rounded-lg border p-4">
            <div className="flex items-center justify-between">
              <p className="text-sm font-medium">Wispr Voice API</p>
              <Badge variant={wisprApiConfigured ? "secondary" : "outline"}>
                {wisprApiConfigured ? "Webhook ready" : "Not configured"}
              </Badge>
            </div>
            <p className="text-xs text-muted-foreground">
              Once Wispr partner access is approved, your administrator finishes webhook verification; Wispr should
              send signed events to{" "}
              <code className="rounded bg-muted px-1">/api/webhooks/wispr</code>. Payloads are turned into drafts
              automatically.
            </p>
            <Button type="button" variant="outline" size="sm" disabled>
              {wisprApiConfigured ? "Connect Wispr (coming soon)" : "Awaiting partner credentials"}
            </Button>
          </div>
          <div className="space-y-2 rounded-lg border p-4">
            <div className="flex items-center justify-between">
              <p className="text-sm font-medium">Demo Wispr</p>
              <Badge variant={wisprConnected ? "secondary" : "outline"}>
                {wisprConnected ? "Connected" : "Ready"}
              </Badge>
            </div>
            <p className="text-xs text-muted-foreground">
              Seeds a couple of sample voice notes so the review and apply pipeline is exercisable now.
            </p>
            <div className="flex flex-wrap gap-2">
              <form action={connectDemoWisprAction}>
                <Button type="submit" size="sm">
                  {wisprConnected ? "Refresh demo notes" : "Connect demo Wispr"}
                </Button>
              </form>
              {wisprConnected ? (
                <form action={disconnectWisprAction}>
                  <Button type="submit" variant="outline" size="sm">
                    Disconnect
                  </Button>
                </form>
              ) : null}
            </div>
          </div>
        </div>
      </section>

      <section className="space-y-4 rounded-xl border bg-background p-6">
        <div>
          <h2 className="text-lg font-semibold">Relationship stages</h2>
          <p className="text-sm text-muted-foreground">
            Rename stage labels for the team. Keys stay stable for reporting.
          </p>
        </div>
        <div className="space-y-3">
          {stages.map((stage) => (
            <form
              key={stage.id}
              action={updateStageLabelAction}
              className="grid gap-3 rounded-lg border p-4 md:grid-cols-[160px_1fr_auto]"
            >
              <div>
                <p className="text-sm font-medium">{stage.key}</p>
                <p className="text-xs text-muted-foreground">Order {stage.sortOrder + 1}</p>
              </div>
              <Input name="label" defaultValue={stage.label} required />
              <input type="hidden" name="stageId" value={stage.id} />
              <Button type="submit" variant="outline">
                Save
              </Button>
            </form>
          ))}
        </div>
      </section>

      <section className="space-y-4 rounded-xl border bg-background p-6">
        <div>
          <h2 className="text-lg font-semibold">Known tags</h2>
          <p className="text-sm text-muted-foreground">
            Tags already used on companies. They appear as suggestions on company forms.
          </p>
        </div>
        {tags.length === 0 ? (
          <p className="text-sm text-muted-foreground">No tags yet.</p>
        ) : (
          <div className="flex flex-wrap gap-2">
            {tags.map((tag) => (
              <span key={tag} className="rounded-full border px-3 py-1 text-sm">
                {tag}
              </span>
            ))}
          </div>
        )}
      </section>
    </div>
  );
}
