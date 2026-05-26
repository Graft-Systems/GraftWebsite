import { INTERACTION_SOURCES, INTERACTION_TYPES } from "@/lib/admin/constants";

export function parseTags(value: unknown): string[] {
  if (!Array.isArray(value)) {
    return [];
  }

  return value.filter((tag): tag is string => typeof tag === "string");
}

export function serializeTags(tags: string[]): string[] {
  return [...new Set(tags.map((tag) => tag.trim()).filter(Boolean))];
}

export function tagsToJson(tags: string[]): string[] {
  return serializeTags(tags);
}

export function formatDate(value: Date | string | null | undefined): string {
  if (!value) {
    return "—";
  }

  return new Intl.DateTimeFormat("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  }).format(new Date(value));
}

export function formatDateTime(value: Date | string | null | undefined): string {
  if (!value) {
    return "—";
  }

  return new Intl.DateTimeFormat("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
    hour: "numeric",
    minute: "2-digit",
  }).format(new Date(value));
}

export function startOfDay(date = new Date()) {
  const value = new Date(date);
  value.setHours(0, 0, 0, 0);
  return value;
}

export function endOfDay(date = new Date()) {
  const value = new Date(date);
  value.setHours(23, 59, 59, 999);
  return value;
}

export function endOfWeek(date = new Date()) {
  const value = endOfDay(date);
  const day = value.getDay();
  const daysUntilSunday = 7 - day;
  value.setDate(value.getDate() + (daysUntilSunday === 7 ? 0 : daysUntilSunday));
  return value;
}

export function summarizeText(value: string | null | undefined, maxLength = 120) {
  if (!value) {
    return "";
  }

  const trimmed = value.trim().replace(/\s+/g, " ");
  if (trimmed.length <= maxLength) {
    return trimmed;
  }

  return `${trimmed.slice(0, maxLength - 1)}…`;
}

export function interactionTypeLabel(type: string) {
  return INTERACTION_TYPES.find((item) => item.value === type)?.label ?? type;
}

export function interactionSourceLabel(source: string) {
  return INTERACTION_SOURCES.find((item) => item.value === source)?.label ?? source;
}
