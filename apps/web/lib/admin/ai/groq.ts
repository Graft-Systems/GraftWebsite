import type { CaptureSource, StructuredCapture } from "@/lib/admin/ai/types";
import { env } from "@/lib/admin/env";

type GroqResponse = {
  choices?: Array<{
    message?: {
      content?: string;
    };
  }>;
};

function extractJsonObject(text: string) {
  const trimmed = text.trim();
  const fenced = trimmed.match(/```(?:json)?\s*([\s\S]*?)```/i);
  const candidate = fenced?.[1]?.trim() ?? trimmed;
  const start = candidate.indexOf("{");
  const end = candidate.lastIndexOf("}");
  if (start === -1 || end === -1 || end <= start) {
    throw new Error("Model response did not include JSON.");
  }

  return JSON.parse(candidate.slice(start, end + 1)) as unknown;
}

export async function structureCaptureWithGroq(
  transcript: string,
  context: {
    companyName: string;
    needs: string | null;
    tags: string[];
    stageKeys: string[];
    source: CaptureSource;
  },
): Promise<StructuredCapture> {
  const apiKey = env.groq.apiKey;
  if (!apiKey) {
    throw new Error("GROQ_API_KEY is not configured.");
  }

  const model = env.groq.model;
  const response = await fetch("https://api.groq.com/openai/v1/chat/completions", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${apiKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      model,
      temperature: 0.2,
      response_format: { type: "json_object" },
      messages: [
        {
          role: "system",
          content:
            "You structure CRM meeting and call notes for a company-first sales CRM. Return strict JSON only with keys: summary (string), needsBullets (string[]), suggestedTasks (array of {title, description?, dueInDays?}), interactionType (one of call, meeting, email, event, voice_note, other), stageHint (string|null from allowed stages), tagHints (string[]). Keep summaries concise and actionable.",
        },
        {
          role: "user",
          content: JSON.stringify({
            source: context.source,
            companyName: context.companyName,
            existingNeeds: context.needs,
            existingTags: context.tags,
            allowedStages: context.stageKeys,
            transcript,
          }),
        },
      ],
    }),
  });

  if (!response.ok) {
    throw new Error(`Groq request failed with status ${response.status}.`);
  }

  const payload = (await response.json()) as GroqResponse;
  const content = payload.choices?.[0]?.message?.content;
  if (!content) {
    throw new Error("Groq returned an empty response.");
  }

  const parsed = extractJsonObject(content) as Partial<StructuredCapture>;
  return {
    provider: "groq",
    summary: typeof parsed.summary === "string" ? parsed.summary.trim() : "",
    needsBullets: Array.isArray(parsed.needsBullets)
      ? parsed.needsBullets.filter((item): item is string => typeof item === "string")
      : [],
    suggestedTasks: Array.isArray(parsed.suggestedTasks)
      ? parsed.suggestedTasks
          .filter((item): item is { title: string; description?: string; dueInDays?: number } => {
            return Boolean(item && typeof item === "object" && typeof item.title === "string");
          })
          .map((item) => ({
            title: item.title.trim(),
            description:
              typeof item.description === "string" ? item.description.trim() : undefined,
            dueInDays:
              typeof item.dueInDays === "number" && Number.isFinite(item.dueInDays)
                ? Math.max(0, Math.round(item.dueInDays))
                : undefined,
          }))
      : [],
    interactionType:
      typeof parsed.interactionType === "string" ? parsed.interactionType : "meeting",
    stageHint: typeof parsed.stageHint === "string" ? parsed.stageHint : null,
    tagHints: Array.isArray(parsed.tagHints)
      ? parsed.tagHints.filter((item): item is string => typeof item === "string")
      : [],
  };
}
