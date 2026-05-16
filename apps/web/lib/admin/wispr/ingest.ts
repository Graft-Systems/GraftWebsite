import { structureCapture } from "@/lib/admin/ai/structure-capture";
import type { StructuredCapture } from "@/lib/admin/ai/types";
import { prisma } from "@/lib/admin/db";
import { parseTags } from "@/lib/admin/crm";
import { listRelationshipStages } from "@/lib/admin/companies/queries";

type IngestInput = {
  workspaceId: string;
  wisprConnectionId: string;
  externalNoteId: string;
  rawText: string;
  receivedAt?: Date;
};

async function suggestCompanyForText(workspaceId: string, rawText: string) {
  const lower = rawText.toLowerCase();
  const companies = await prisma.company.findMany({
    where: { workspaceId },
    select: { id: true, name: true, domain: true },
  });

  let best: { id: string; score: number } | null = null;
  for (const company of companies) {
    const candidates = [company.name, company.domain ?? ""].filter(Boolean);
    let score = 0;
    for (const candidate of candidates) {
      if (!candidate) continue;
      if (lower.includes(candidate.toLowerCase())) score += 3;
      if (lower.includes(candidate.toLowerCase().split(" ")[0])) score += 1;
    }
    if (score > 0 && (best === null || score > best.score)) {
      best = { id: company.id, score };
    }
  }

  return best?.id ?? null;
}

async function structureForIngest(
  workspaceId: string,
  rawText: string,
  suggestedCompanyId: string | null,
): Promise<StructuredCapture> {
  const stages = await listRelationshipStages(workspaceId);

  let companyContext: {
    companyName: string;
    needs: string | null;
    tags: string[];
  } = {
    companyName: "your team",
    needs: null,
    tags: [],
  };

  if (suggestedCompanyId) {
    const company = await prisma.company.findFirst({
      where: { id: suggestedCompanyId, workspaceId },
    });
    if (company) {
      companyContext = {
        companyName: company.name,
        needs: company.needs,
        tags: parseTags(company.tags),
      };
    }
  }

  return structureCapture(
    rawText,
    { ...companyContext, stageKeys: stages.map((stage) => stage.key) },
    "wispr_api",
  );
}

export async function createWisprIngest(input: IngestInput) {
  const existing = await prisma.wisprIngest.findUnique({
    where: {
      wisprConnectionId_externalNoteId: {
        wisprConnectionId: input.wisprConnectionId,
        externalNoteId: input.externalNoteId,
      },
    },
  });
  if (existing) {
    return existing;
  }

  const suggestedCompanyId = await suggestCompanyForText(input.workspaceId, input.rawText);
  const structured = await structureForIngest(input.workspaceId, input.rawText, suggestedCompanyId);

  return prisma.wisprIngest.create({
    data: {
      workspaceId: input.workspaceId,
      wisprConnectionId: input.wisprConnectionId,
      externalNoteId: input.externalNoteId,
      receivedAt: input.receivedAt ?? new Date(),
      rawText: input.rawText,
      aiSummary: structured.summary,
      aiNeeds: structured.needsBullets,
      aiSuggestedTasks: structured.suggestedTasks,
      aiStageHint: structured.stageHint,
      aiTagHints: structured.tagHints,
      interactionType: structured.interactionType,
      suggestedCompanyId,
      status: "pending",
    },
  });
}
