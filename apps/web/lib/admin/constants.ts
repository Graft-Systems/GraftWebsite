/** Django CRM workspace id (was Prisma string `seed-workspace`). */
export const SEED_WORKSPACE_ID = "00000000-0000-4000-8000-000000000001";

export const DEFAULT_RELATIONSHIP_STAGES = [
  { key: "met", label: "Met", sortOrder: 0 },
  { key: "exploring", label: "Exploring", sortOrder: 1 },
  { key: "active_conversation", label: "Active conversation", sortOrder: 2 },
  { key: "pilot", label: "Pilot", sortOrder: 3 },
  { key: "customer", label: "Customer", sortOrder: 4 },
  { key: "partner", label: "Partner", sortOrder: 5 },
  { key: "investor", label: "Investor", sortOrder: 6 },
  { key: "dormant", label: "Dormant", sortOrder: 7 },
] as const;

export const STALE_DAYS_OPTIONS = [14, 30, 60, 90] as const;

export const INTERACTION_TYPES = [
  { value: "call", label: "Call" },
  { value: "meeting", label: "Meeting" },
  { value: "email", label: "Email" },
  { value: "event", label: "Event" },
  { value: "voice_note", label: "Voice note" },
  { value: "other", label: "Other" },
] as const;

export const INTERACTION_SOURCES = [
  { value: "manual", label: "Manual" },
  { value: "in_app_voice", label: "In-app voice" },
  { value: "paste", label: "Paste" },
  { value: "wispr_api", label: "Wispr API" },
  { value: "calendar", label: "Calendar" },
] as const;

export type InteractionSource = (typeof INTERACTION_SOURCES)[number]["value"];

export const TASK_STATUSES = [
  { value: "open", label: "Open" },
  { value: "done", label: "Done" },
  { value: "cancelled", label: "Cancelled" },
] as const;

export const INBOX_VIEWS = [
  "my",
  "overdue",
  "today",
  "week",
  "unassigned",
] as const;

export type InboxView = (typeof INBOX_VIEWS)[number];

export const DEAL_STAGES = [
  { value: "open", label: "Researching" },
  { value: "qualified", label: "Eligible" },
  { value: "proposal", label: "Submitted" },
  { value: "negotiation", label: "Shortlisted" },
  { value: "won", label: "Won" },
  { value: "lost", label: "Didn't win" },
] as const;

export const OPEN_DEAL_STAGES = ["open", "qualified", "proposal", "negotiation"] as const;

export const PILOT_STATUSES = [
  { value: "planned", label: "Planned" },
  { value: "active", label: "Active" },
  { value: "completed", label: "Completed" },
  { value: "cancelled", label: "Cancelled" },
] as const;

export const ACTIVE_PILOT_STATUSES = ["planned", "active"] as const;

export const INVESTOR_STAGES = [
  { value: "prospecting", label: "Prospecting" },
  { value: "diligence", label: "Diligence" },
  { value: "committed", label: "Committed" },
  { value: "passed", label: "Passed" },
] as const;

export const PARTNER_PROGRAM_STATUSES = [
  { value: "exploring", label: "Exploring" },
  { value: "active", label: "Active" },
  { value: "paused", label: "Paused" },
  { value: "ended", label: "Ended" },
] as const;

export const CAPITAL_RECEIPT_SOURCES = [
  { value: "deal", label: "Deal" },
  { value: "investor", label: "Investor" },
  { value: "customer", label: "Customer payment" },
  { value: "partner", label: "Partner" },
  { value: "grant", label: "Grant" },
  { value: "other", label: "Other" },
] as const;

export const CALENDAR_PROVIDERS = [
  { value: "google", label: "Google Calendar" },
  { value: "microsoft", label: "Microsoft 365" },
  { value: "demo", label: "Demo calendar" },
] as const;

export const CALENDAR_ACCOUNT_STATUSES = [
  { value: "connected", label: "Connected" },
  { value: "disconnected", label: "Disconnected" },
  { value: "error", label: "Needs reconnect" },
] as const;

export const CALENDAR_LINK_STATUSES = [
  { value: "unmatched", label: "No match yet" },
  { value: "suggested", label: "Suggested" },
  { value: "confirmed", label: "Confirmed" },
  { value: "skipped", label: "Skipped" },
] as const;

export const INTERNAL_GRAFT_DOMAINS = ["graft.systems", "graftsystems.com"] as const;

export const WISPR_INGEST_STATUSES = [
  { value: "pending", label: "Awaiting review" },
  { value: "applied", label: "Applied" },
  { value: "discarded", label: "Discarded" },
] as const;

export const WISPR_PROVIDERS = [
  { value: "wispr_api", label: "Wispr Voice API" },
  { value: "demo", label: "Demo Wispr" },
] as const;

export const EMAIL_DIGEST_KINDS = [
  { value: "daily_digest", label: "Daily digest" },
  { value: "test_digest", label: "Test digest" },
] as const;

export const EMAIL_DIGEST_STATUSES = [
  { value: "queued", label: "Queued" },
  { value: "sent", label: "Sent" },
  { value: "skipped", label: "Skipped" },
  { value: "outbox_only", label: "Outbox only" },
  { value: "error", label: "Error" },
] as const;

export const EMAIL_PROVIDERS = [
  { value: "resend", label: "Resend" },
  { value: "outbox", label: "Outbox (no real send)" },
] as const;

/**
 * Workspace `User` rows created by `prisma/seed.ts`.
 * Each person sets their own password on first login (`passwordHash` starts unset).
 */
export const SEED_WORKSPACE_USERS = [
  { email: "owner@graft.systems", name: "Graft Owner", role: "admin" as const },
  { email: "teammate@graft.systems", name: "Graft Teammate", role: "member" as const },
  { email: "arnavsai410@gmail.com", name: "Arnav", role: "member" as const },
] as const;

