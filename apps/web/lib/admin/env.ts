function read(name: string, fallback = ""): string {
  return (process.env[name] ?? fallback).trim();
}

export function getAppBaseUrl(): string {
  const explicit = read("NEXT_PUBLIC_APP_URL") || read("APP_URL");
  if (explicit) {
    return explicit.replace(/\/$/, "");
  }
  const vercel = read("VERCEL_URL");
  if (vercel) {
    return `https://${vercel.replace(/^https?:\/\//, "")}`;
  }
  return "http://localhost:3000";
}

export function getGoogleRedirectUri(): string {
  const explicit = read("GOOGLE_REDIRECT_URI");
  if (explicit) {
    return explicit;
  }
  return `${getAppBaseUrl()}/api/calendar/google/callback`;
}

export const env = {
  email: {
    resendApiKey: read("RESEND_API_KEY"),
    from: read("EMAIL_FROM"),
    digestOutboundOverride: read("DIGEST_OUTBOUND_EMAIL_OVERRIDE") || undefined,
  },
  groq: {
    apiKey: read("GROQ_API_KEY"),
    model: read("GROQ_MODEL", "llama-3.3-70b-versatile"),
  },
  google: {
    clientId: read("GOOGLE_CLIENT_ID"),
    clientSecret: read("GOOGLE_CLIENT_SECRET"),
    redirectUri: getGoogleRedirectUri(),
  },
  cron: {
    secret: read("CRON_SECRET"),
  },
  wispr: {
    webhookSecret: read("WISPR_WEBHOOK_SECRET"),
  },
};

export function isResendConfigured(): boolean {
  return Boolean(env.email.resendApiKey && env.email.from);
}

export function isGroqConfigured(): boolean {
  return Boolean(env.groq.apiKey);
}

export function isGoogleCalendarConfigured(): boolean {
  return Boolean(env.google.clientId && env.google.clientSecret);
}

export function isCronSecretConfigured(): boolean {
  return Boolean(env.cron.secret);
}

export function isWisprWebhookConfigured(): boolean {
  return Boolean(env.wispr.webhookSecret);
}
