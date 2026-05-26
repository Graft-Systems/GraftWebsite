import { INTERACTION_TYPES } from "@/lib/admin/constants";

import { structureCaptureWithGroq } from "@/lib/admin/ai/groq";
import type { CaptureCompanyContext, CaptureSource, StructuredCapture } from "@/lib/admin/ai/types";
import { isGroqConfigured } from "@/lib/admin/env";

const interactionTypeValues = new Set<string>(INTERACTION_TYPES.map((item) => item.value));

function normalizeInteractionType(value: string, source: CaptureSource) {
  if (interactionTypeValues.has(value)) {
    return value;
  }

  if (source === "in_app_voice" || source === "wispr_api") {
    return "voice_note";
  }
  return "meeting";
}

function firstSentences(text: string, maxSentences = 2) {
  const sentences = text
    .split(/(?<=[.!?])\s+/)
    .map((sentence) => sentence.trim())
    .filter(Boolean);

  if (sentences.length === 0) {
    return text.trim().slice(0, 240);
  }

  return sentences.slice(0, maxSentences).join(" ");
}

function heuristicStructureCapture(
  transcript: string,
  context: CaptureCompanyContext,
  source: CaptureSource,
): StructuredCapture {
  const normalized = transcript.trim().replace(/\s+/g, " ");
  const lower = normalized.toLowerCase();
  const lines = transcript
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter(Boolean);

  const needsBullets = lines
    .filter((line) => /^(?:-|\*|\d+\.)\s+/.test(line) || /\b(need|needs|priority|pain)\b/i.test(line))
    .map((line) => line.replace(/^(?:-|\*|\d+\.)\s+/, "").trim())
    .slice(0, 5);

  const suggestedTasks = [
    {
      title: `Follow up with ${context.companyName}`,
      description: "Confirm next steps from the latest touchpoint.",
      dueInDays: 3,
    },
  ];

  if (/\b(security|compliance|legal)\b/i.test(lower)) {
    suggestedTasks.push({
      title: "Confirm security or compliance path",
      description: "Document owners and timing for review.",
      dueInDays: 5,
    });
  }

  let interactionType: string =
    source === "in_app_voice" || source === "wispr_api" ? "voice_note" : "meeting";
  if (/\bemail\b/.test(lower)) {
    interactionType = "email";
  } else if (/\bcall\b/.test(lower)) {
    interactionType = "call";
  } else if (/\bevent\b/.test(lower)) {
    interactionType = "event";
  }

  const stageHint =
    context.stageKeys.find((stage) => lower.includes(stage.replaceAll("_", " "))) ??
    (/\bpilot\b/.test(lower) ? "pilot" : /\binvestor\b/.test(lower) ? "investor" : null);

  const tagHints = context.tags.slice(0, 3);
  if (/\bhealthcare\b/.test(lower) && !tagHints.includes("healthcare")) {
    tagHints.push("healthcare");
  }

  return {
    provider: "heuristic",
    summary: firstSentences(normalized) || `Captured notes for ${context.companyName}.`,
    needsBullets:
      needsBullets.length > 0
        ? needsBullets
        : ["Clarify the customer's top priority and timing in the next touchpoint."],
    suggestedTasks,
    interactionType,
    stageHint,
    tagHints,
  };
}

function finalizeStructuredCapture(
  capture: StructuredCapture,
  source: CaptureSource,
  context: CaptureCompanyContext,
): StructuredCapture {
  const stageHint =
    capture.stageHint && context.stageKeys.includes(capture.stageHint) ? capture.stageHint : null;

  return {
    ...capture,
    summary: capture.summary.trim() || `Captured notes for ${context.companyName}.`,
    needsBullets: capture.needsBullets.map((item) => item.trim()).filter(Boolean).slice(0, 8),
    suggestedTasks: capture.suggestedTasks
      .map((task) => ({
        title: task.title.trim(),
        description: task.description?.trim() || undefined,
        dueInDays:
          typeof task.dueInDays === "number" && Number.isFinite(task.dueInDays)
            ? Math.max(0, Math.round(task.dueInDays))
            : undefined,
      }))
      .filter((task) => task.title)
      .slice(0, 6),
    interactionType: normalizeInteractionType(capture.interactionType, source),
    stageHint,
    tagHints: capture.tagHints.map((tag) => tag.trim()).filter(Boolean).slice(0, 8),
  };
}

export async function structureCapture(
  transcript: string,
  context: CaptureCompanyContext,
  source: CaptureSource,
): Promise<StructuredCapture> {
  const trimmed = transcript.trim();
  if (!trimmed) {
    throw new Error("Add a transcript or pasted notes before structuring.");
  }

  if (isGroqConfigured()) {
    try {
      const structured = await structureCaptureWithGroq(trimmed, {
        companyName: context.companyName,
        needs: context.needs,
        tags: context.tags,
        stageKeys: context.stageKeys,
        source,
      });
      return finalizeStructuredCapture(structured, source, context);
    } catch {
      return finalizeStructuredCapture(
        heuristicStructureCapture(trimmed, context, source),
        source,
        context,
      );
    }
  }

  return finalizeStructuredCapture(
    heuristicStructureCapture(trimmed, context, source),
    source,
    context,
  );
}
