import { env, isResendConfigured } from "@/lib/admin/env";

export type EmailMessage = {
  to: string;
  subject: string;
  html: string;
  text: string;
};

export type EmailSendResult =
  | { status: "sent"; provider: "resend"; providerMessageId: string | null }
  | { status: "outbox_only"; provider: "outbox" }
  | { status: "error"; provider: "resend" | "outbox"; error: string };

export type EmailProviderInfo = {
  provider: "resend" | "outbox";
  configured: boolean;
  from: string | null;
  reason?: string;
};

export function getEmailProviderInfo(): EmailProviderInfo {
  const apiKey = env.email.resendApiKey;
  const from = env.email.from;

  if (!apiKey) {
    return {
      provider: "outbox",
      configured: false,
      from,
      reason: "Set RESEND_API_KEY (and EMAIL_FROM) in .env to send real email.",
    };
  }
  if (!from) {
    return {
      provider: "outbox",
      configured: false,
      from,
      reason: "Set EMAIL_FROM (e.g. \"Graft CRM <crm@yourdomain.com>\") to enable Resend.",
    };
  }

  return { provider: "resend", configured: true, from };
}

export async function sendEmail(message: EmailMessage): Promise<EmailSendResult> {
  const info = getEmailProviderInfo();
  if (!isResendConfigured() || !info.from) {
    return { status: "outbox_only", provider: "outbox" };
  }

  try {
    const response = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${env.email.resendApiKey}`,
      },
      body: JSON.stringify({
        from: info.from,
        to: [message.to],
        subject: message.subject,
        html: message.html,
        text: message.text,
      }),
    });

    if (!response.ok) {
      const body = await response.text().catch(() => "");
      return {
        status: "error",
        provider: "resend",
        error: `Resend ${response.status}: ${body.slice(0, 200) || response.statusText}`,
      };
    }

    const data = (await response.json().catch(() => null)) as { id?: string } | null;
    return { status: "sent", provider: "resend", providerMessageId: data?.id ?? null };
  } catch (error) {
    return {
      status: "error",
      provider: "resend",
      error: error instanceof Error ? error.message : "Unknown Resend error",
    };
  }
}
