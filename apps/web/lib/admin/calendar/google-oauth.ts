import { google } from "googleapis";

import { env } from "@/lib/admin/env";
import { prisma } from "@/lib/admin/db";

/** Calendar + identity: userinfo needs openid/email; calendar.events alone is not enough. */
const SCOPES = [
  "openid",
  "https://www.googleapis.com/auth/userinfo.email",
  "https://www.googleapis.com/auth/userinfo.profile",
  "https://www.googleapis.com/auth/calendar.events",
];

export function googleRedirectUri() {
  return env.google.redirectUri;
}

export function createOAuth2Client() {
  const clientId = env.google.clientId;
  const clientSecret = env.google.clientSecret;
  if (!clientId || !clientSecret) {
    throw new Error("Google Calendar is not configured (missing GOOGLE_CLIENT_ID or GOOGLE_CLIENT_SECRET).");
  }
  return new google.auth.OAuth2(clientId, clientSecret, googleRedirectUri());
}

export function buildGoogleConsentUrl(userId: string) {
  const client = createOAuth2Client();
  return client.generateAuthUrl({
    access_type: "offline",
    prompt: "consent",
    scope: SCOPES,
    state: userId,
  });
}

export async function exchangeCodeForTokens(code: string) {
  const client = createOAuth2Client();
  const { tokens } = await client.getToken(code);
  client.setCredentials(tokens);

  const oauth2 = google.oauth2({ version: "v2", auth: client });
  const { data } = await oauth2.userinfo.get();
  const email = data.email ?? null;
  const sub = data.id ?? email;
  if (!sub) {
    throw new Error("Could not read Google account id.");
  }

  return {
    tokens,
    externalAccountId: sub,
    displayName: email ? `Google (${email})` : "Google Calendar",
  };
}

export async function getAuthorizedCalendarClient(account: {
  id: string;
  accessToken: string | null;
  refreshToken: string | null;
  expiresAt: Date | null;
}) {
  if (!account.refreshToken) {
    throw new Error("Google Calendar needs to be reconnected (no refresh token).");
  }

  const client = createOAuth2Client();
  client.setCredentials({
    access_token: account.accessToken ?? undefined,
    refresh_token: account.refreshToken,
    expiry_date: account.expiresAt?.getTime(),
  });

  if (!account.expiresAt || account.expiresAt.getTime() < Date.now() + 60_000) {
    const { credentials } = await client.refreshAccessToken();
    client.setCredentials(credentials);
    await prisma.calendarAccount.update({
      where: { id: account.id },
      data: {
        accessToken: credentials.access_token ?? null,
        expiresAt: credentials.expiry_date ? new Date(credentials.expiry_date) : null,
      },
    });
  }

  return google.calendar({ version: "v3", auth: client });
}

export async function insertPrimaryCalendarEvent(
  account: {
    id: string;
    accessToken: string | null;
    refreshToken: string | null;
    expiresAt: Date | null;
  },
  input: {
    title: string;
    description: string | null;
    startsAt: Date;
    endsAt: Date;
    location: string | null;
    meetingUrl: string | null;
    attendees: { email: string; displayName?: string | null }[];
  },
) {
  const calendar = await getAuthorizedCalendarClient(account);

  const locationParts = [input.location, input.meetingUrl].filter(Boolean);
  const body: {
    summary: string;
    description?: string;
    location?: string;
    start: { dateTime: string };
    end: { dateTime: string };
    attendees: { email: string; displayName?: string }[];
  } = {
    summary: input.title,
    start: { dateTime: input.startsAt.toISOString() },
    end: { dateTime: input.endsAt.toISOString() },
    attendees: input.attendees.map((a) => ({
      email: a.email,
      ...(a.displayName ? { displayName: a.displayName } : {}),
    })),
  };
  if (input.description) {
    body.description = input.description;
  }
  if (locationParts.length > 0) {
    body.location = locationParts.join("\n");
  }

  const response = await calendar.events.insert({
    calendarId: "primary",
    sendUpdates: "all",
    requestBody: body,
  });

  const created = response.data;
  if (!created.id) {
    throw new Error("Google Calendar did not return an event id.");
  }

  return created;
}
