"use client";

import { useMemo, useState } from "react";

import {
  applyWisprIngestAction,
  discardWisprIngestAction,
} from "@/app/admin/actions/wispr";
import { Badge } from "@/components/admin/ui/badge";
import { Button } from "@/components/admin/ui/button";
import { Input } from "@/components/admin/ui/input";
import { Label } from "@/components/admin/ui/label";
import { Textarea } from "@/components/admin/ui/textarea";
import { INTERACTION_TYPES } from "@/lib/admin/constants";
import { cn } from "@/lib/admin/utils";

type CompanyOption = {
  id: string;
  name: string;
  domain: string | null;
  contacts: { id: string; name: string; email: string | null; isPrimary: boolean }[];
};

type StageOption = { key: string; label: string };

type TaskShape = { title?: string; description?: string; dueInDays?: number };

type WisprIngestCardProps = {
  ingest: {
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
  companies: CompanyOption[];
  stages: StageOption[];
};

const selectClassName = cn(
  "flex h-9 w-full rounded-md border border-input bg-transparent px-3 py-1 text-sm shadow-xs outline-none transition-colors",
  "focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50",
);

function arrayFromJson(value: unknown): string[] {
  if (!Array.isArray(value)) return [];
  return value.filter((item): item is string => typeof item === "string");
}

function tasksFromJson(value: unknown): TaskShape[] {
  if (!Array.isArray(value)) return [];
  return value.flatMap((item): TaskShape[] => {
    if (!item || typeof item !== "object") return [];
    const record = item as Record<string, unknown>;
    const title = typeof record.title === "string" ? record.title : undefined;
    if (!title) return [];
    return [
      {
        title,
        description: typeof record.description === "string" ? record.description : undefined,
        dueInDays: typeof record.dueInDays === "number" ? record.dueInDays : undefined,
      },
    ];
  });
}

export function WisprIngestCard({ ingest, companies, stages }: WisprIngestCardProps) {
  const initialNeeds = useMemo(() => arrayFromJson(ingest.aiNeeds), [ingest.aiNeeds]);
  const initialTags = useMemo(() => arrayFromJson(ingest.aiTagHints), [ingest.aiTagHints]);
  const initialTasks = useMemo(() => tasksFromJson(ingest.aiSuggestedTasks), [ingest.aiSuggestedTasks]);

  const [companyId, setCompanyId] = useState(ingest.suggestedCompany?.id ?? "");
  const contactsForCompany =
    companies.find((company) => company.id === companyId)?.contacts ?? [];

  const occurredAtDefault = new Date(ingest.receivedAt).toISOString().slice(0, 16);

  const isApplied = ingest.status === "applied";
  const isDiscarded = ingest.status === "discarded";

  return (
    <article className="space-y-4 rounded-xl border bg-background p-5">
      <header className="flex flex-wrap items-start justify-between gap-3">
        <div className="space-y-1">
          <div className="flex flex-wrap items-center gap-2">
            <h3 className="text-base font-semibold">Wispr note</h3>
            {isApplied ? <Badge variant="secondary">Applied</Badge> : null}
            {isDiscarded ? <Badge variant="outline">Discarded</Badge> : null}
            {!isApplied && !isDiscarded ? <Badge variant="outline">Pending review</Badge> : null}
            {ingest.suggestedCompany ? (
              <Badge variant="outline">Suggested: {ingest.suggestedCompany.name}</Badge>
            ) : null}
          </div>
          <p className="text-xs text-muted-foreground">
            Received {new Date(ingest.receivedAt).toLocaleString()}
          </p>
        </div>
        {isApplied && ingest.appliedInteraction ? (
          <a
            href={`/admin/companies/${ingest.appliedInteraction.companyId}`}
            className="text-sm text-primary hover:underline"
          >
            Open company timeline →
          </a>
        ) : null}
      </header>

      <details className="rounded-lg border bg-muted/20">
        <summary className="cursor-pointer px-3 py-2 text-sm font-medium">Raw transcript</summary>
        <pre className="whitespace-pre-wrap wrap-break-word px-3 pb-3 text-sm text-muted-foreground">
          {ingest.rawText}
        </pre>
      </details>

      {isApplied || isDiscarded ? null : (
        <form
          action={applyWisprIngestAction.bind(null, ingest.id)}
          className="space-y-4 rounded-lg border bg-muted/10 p-4"
        >
          <div className="grid gap-4 md:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor={`company-${ingest.id}`}>Company</Label>
              <select
                id={`company-${ingest.id}`}
                name="companyId"
                value={companyId}
                onChange={(event) => setCompanyId(event.target.value)}
                className={selectClassName}
                required
              >
                <option value="">Select a company</option>
                {companies.map((company) => (
                  <option key={company.id} value={company.id}>
                    {company.name}
                    {company.domain ? ` · ${company.domain}` : ""}
                  </option>
                ))}
              </select>
            </div>
            <div className="space-y-2">
              <Label htmlFor={`contact-${ingest.id}`}>Contact (optional)</Label>
              <select
                id={`contact-${ingest.id}`}
                name="contactId"
                defaultValue=""
                className={selectClassName}
              >
                <option value="">No specific contact</option>
                {contactsForCompany.map((contact) => (
                  <option key={contact.id} value={contact.id}>
                    {contact.name}
                    {contact.email ? ` · ${contact.email}` : ""}
                  </option>
                ))}
              </select>
            </div>
            <div className="space-y-2">
              <Label htmlFor={`type-${ingest.id}`}>Interaction type</Label>
              <select
                id={`type-${ingest.id}`}
                name="type"
                defaultValue={ingest.interactionType}
                className={selectClassName}
              >
                {INTERACTION_TYPES.map((type) => (
                  <option key={type.value} value={type.value}>
                    {type.label}
                  </option>
                ))}
              </select>
            </div>
            <div className="space-y-2">
              <Label htmlFor={`occurredAt-${ingest.id}`}>Occurred at</Label>
              <Input
                id={`occurredAt-${ingest.id}`}
                name="occurredAt"
                type="datetime-local"
                defaultValue={occurredAtDefault}
                required
              />
            </div>
            <div className="space-y-2 md:col-span-2">
              <Label htmlFor={`summary-${ingest.id}`}>Summary</Label>
              <Textarea
                id={`summary-${ingest.id}`}
                name="summary"
                rows={3}
                defaultValue={ingest.aiSummary ?? ""}
                required
              />
            </div>
            <div className="space-y-2 md:col-span-2">
              <Label htmlFor={`needs-${ingest.id}`}>Needs bullets</Label>
              <Textarea
                id={`needs-${ingest.id}`}
                name="needsBullets"
                rows={3}
                defaultValue={initialNeeds.join("\n")}
                placeholder="One per line"
              />
              <label className="flex items-center gap-2 text-xs text-muted-foreground">
                <input type="checkbox" name="applyNeeds" />
                Replace the company&apos;s needs panel with these bullets
              </label>
            </div>
            <div className="space-y-2">
              <Label htmlFor={`tags-${ingest.id}`}>Tag hints</Label>
              <Input
                id={`tags-${ingest.id}`}
                name="tagHints"
                defaultValue={initialTags.join(", ")}
                placeholder="warm-intro, pilot"
              />
              <label className="flex items-center gap-2 text-xs text-muted-foreground">
                <input type="checkbox" name="applyTags" />
                Merge tags onto the company
              </label>
            </div>
            <div className="space-y-2">
              <Label htmlFor={`stage-${ingest.id}`}>Stage hint</Label>
              <select
                id={`stage-${ingest.id}`}
                name="stageHint"
                defaultValue={ingest.aiStageHint ?? ""}
                className={selectClassName}
              >
                <option value="">No change</option>
                {stages.map((stage) => (
                  <option key={stage.key} value={stage.key}>
                    {stage.label}
                  </option>
                ))}
              </select>
              <p className="text-xs text-muted-foreground">Captured for context; does not change stage automatically.</p>
            </div>
          </div>

          {initialTasks.length > 0 ? (
            <div className="rounded-md border bg-background p-3">
              <p className="text-sm font-medium">Tasks queued for creation</p>
              <ul className="mt-2 list-disc space-y-1 pl-5 text-sm text-muted-foreground">
                {initialTasks.map((task, index) => (
                  <li key={`${task.title ?? "task"}-${index}`}>
                    <span className="font-medium text-foreground">{task.title}</span>
                    {task.dueInDays ? ` · due in ${task.dueInDays} days` : ""}
                    {task.description ? ` · ${task.description}` : ""}
                  </li>
                ))}
              </ul>
              <p className="mt-2 text-xs text-muted-foreground">
                All listed tasks will be created on the chosen company on apply.
              </p>
            </div>
          ) : null}

          <div className="flex flex-wrap items-center gap-2">
            <Button type="submit">Apply to timeline</Button>
            <Button
              type="submit"
              variant="outline"
              formAction={discardWisprIngestAction.bind(null, ingest.id)}
            >
              Discard
            </Button>
          </div>
        </form>
      )}
    </article>
  );
}
