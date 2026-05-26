export type WisprIngestRow = {
  id: string;
  rawText: string;
  aiSummary: string | null;
  aiNeeds: unknown;
  aiSuggestedTasks: unknown;
  aiStageHint: string | null;
  aiTagHints: unknown;
  interactionType: string;
  receivedAt: Date;
  status: string;
  suggestedCompany: { id: string; name: string } | null;
  appliedInteraction: { id: string; companyId: string } | null;
};

function mapSuggestedCompany(
  raw: Record<string, unknown>,
): WisprIngestRow["suggestedCompany"] {
  const suggestedRaw = raw.suggested_company;
  if (typeof suggestedRaw === "string") {
    return { id: suggestedRaw, name: "" };
  }
  if (suggestedRaw && typeof suggestedRaw === "object") {
    const record = suggestedRaw as Record<string, unknown>;
    if (record.id == null) {
      return null;
    }
    return {
      id: String(record.id),
      name: typeof record.name === "string" ? record.name : "",
    };
  }
  return null;
}

function mapAppliedInteraction(
  raw: Record<string, unknown>,
): WisprIngestRow["appliedInteraction"] {
  const applied = raw.applied_interaction;
  if (!applied || typeof applied !== "object") {
    return null;
  }
  const record = applied as Record<string, unknown>;
  const companyId = record.company ?? record.company_id;
  if (record.id == null || companyId == null) {
    return null;
  }
  return {
    id: String(record.id),
    companyId: String(companyId),
  };
}

export function mapWisprIngest(raw: Record<string, unknown>): WisprIngestRow {
  return {
    id: String(raw.id),
    rawText: String(raw.raw_text ?? ""),
    aiSummary: raw.ai_summary != null ? String(raw.ai_summary) : null,
    aiNeeds: raw.ai_needs ?? [],
    aiSuggestedTasks: raw.ai_suggested_tasks ?? [],
    aiStageHint: raw.ai_stage_hint != null ? String(raw.ai_stage_hint) : null,
    aiTagHints: raw.ai_tag_hints ?? [],
    interactionType: String(raw.interaction_type ?? "voice_note"),
    receivedAt: new Date(String(raw.received_at ?? raw.created_at ?? Date.now())),
    status: String(raw.status ?? "pending"),
    suggestedCompany: mapSuggestedCompany(raw),
    appliedInteraction: mapAppliedInteraction(raw),
  };
}

export function enrichWisprIngestCompanies(
  ingests: WisprIngestRow[],
  companies: { id: string; name: string }[],
): WisprIngestRow[] {
  const namesById = new Map(companies.map((company) => [company.id, company.name]));
  return ingests.map((ingest) => {
    if (!ingest.suggestedCompany || ingest.suggestedCompany.name) {
      return ingest;
    }
    const name = namesById.get(ingest.suggestedCompany.id);
    if (!name) {
      return ingest;
    }
    return {
      ...ingest,
      suggestedCompany: { ...ingest.suggestedCompany, name },
    };
  });
}

function unwrapRows(data: unknown): Record<string, unknown>[] {
  if (Array.isArray(data)) {
    return data as Record<string, unknown>[];
  }
  if (data && typeof data === "object" && Array.isArray((data as { results?: unknown }).results)) {
    return (data as { results: Record<string, unknown>[] }).results;
  }
  return [];
}

export function mapWisprIngestList(data: unknown): WisprIngestRow[] {
  return unwrapRows(data).map(mapWisprIngest);
}
