import Link from "next/link";
import { notFound } from "next/navigation";

import { CapturePanel } from "@/components/admin/capture/capture-panel";
import { WisprIngestCard } from "@/components/admin/wispr/wispr-ingest-card";
import { Badge } from "@/components/admin/ui/badge";
import { buttonVariants } from "@/components/admin/ui/button";
import { listWorkspaceCompaniesForSelect } from "@/lib/admin/calendar/companies";
import { getCompany, listRelationshipStages } from "@/lib/admin/companies/queries";
import {
  formatDateTime,
  interactionSourceLabel,
  interactionTypeLabel,
  parseTags,
} from "@/lib/admin/crm";
import { requireAdmin } from "@/lib/admin/auth-check";
import { listCompanyInteractions } from "@/lib/admin/work/queries";
import { listWisprIngestsForCompany } from "@/lib/admin/wispr/queries";

type CompanyNotesPageProps = {
  params: Promise<{ companyId: string }>;
};

export default async function CompanyNotesPage({ params }: CompanyNotesPageProps) {
  const { userId } = await requireAdmin();
  const { companyId } = await params;

  const [company, interactions, ingests, companies, stages] = await Promise.all([
    getCompany("00000000-0000-4000-8000-000000000001", companyId),
    listCompanyInteractions(companyId),
    listWisprIngestsForCompany("00000000-0000-4000-8000-000000000001", companyId),
    listWorkspaceCompaniesForSelect("00000000-0000-4000-8000-000000000001"),
    listRelationshipStages("00000000-0000-4000-8000-000000000001"),
  ]);

  if (!company) {
    notFound();
  }

  const pendingIngests = ingests.filter((ingest) => ingest.status === "pending");
  const stageOptions = stages.map((stage) => ({ key: stage.key, label: stage.label }));

  return (
    <div className="space-y-8">
      <div className="flex flex-col gap-3 md:flex-row md:items-end md:justify-between">
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.2em] text-muted-foreground">
            {company.name}
          </p>
          <h1 className="mt-2 text-3xl font-semibold tracking-tight">Notes</h1>
          <p className="mt-1 max-w-2xl text-sm text-muted-foreground">
            Everything you&apos;ve captured for this company in one place — pending voice notes awaiting
            review, plus every logged interaction with its summary and follow-ups.
          </p>
        </div>
        <Link
          href={`/admin/companies/${company.id}`}
          className={buttonVariants({ variant: "outline" })}
        >
          Back to company
        </Link>
      </div>

      <section className="space-y-4">
        <div>
          <h2 className="text-lg font-semibold">Capture a note</h2>
          <p className="text-sm text-muted-foreground">
            Dictate or paste — AI structures it (summary, needs, follow-ups) before you save.
          </p>
        </div>
        <CapturePanel
          companyId={company.id}
          contacts={company.contacts.map((contact) => ({ id: contact.id, name: contact.name }))}
        />
      </section>

      {pendingIngests.length > 0 ? (
        <section className="space-y-3">
          <h2 className="text-lg font-semibold">
            Pending voice notes ({pendingIngests.length})
          </h2>
          <p className="text-sm text-muted-foreground">
            AI-suggested for this company. Apply to add as an interaction, or discard.
          </p>
          {pendingIngests.map((ingest) => (
            <WisprIngestCard
              key={ingest.id}
              ingest={ingest}
              companies={companies}
              stages={stageOptions}
            />
          ))}
        </section>
      ) : null}

      <section className="space-y-4">
        <div className="flex items-end justify-between gap-3">
          <div>
            <h2 className="text-lg font-semibold">All notes</h2>
            <p className="text-sm text-muted-foreground">
              Interactions logged on this company, newest first. Includes manual notes, AI-reviewed voice
              and paste captures, calendar meetings, and applied voice notes.
            </p>
          </div>
        </div>

        {interactions.length === 0 ? (
          <div className="rounded-xl border border-dashed bg-background px-6 py-12 text-center">
            <p className="text-sm font-medium">No notes yet.</p>
            <p className="mt-1 text-sm text-muted-foreground">
              Use the capture panel above or log an interaction manually from the company page.
            </p>
          </div>
        ) : (
          <div className="space-y-3">
            {interactions.map((interaction) => {
              const needs = parseTags(interaction.aiNeeds);
              const tagHints = parseTags(interaction.aiTagHints);
              return (
                <article key={interaction.id} className="rounded-xl border bg-background p-5">
                  <header className="flex flex-wrap items-center gap-2">
                    <Badge variant="secondary">{interactionTypeLabel(interaction.type)}</Badge>
                    {interaction.source !== "manual" ? (
                      <Badge variant="outline">{interactionSourceLabel(interaction.source)}</Badge>
                    ) : null}
                    <span className="text-sm text-muted-foreground">
                      {formatDateTime(interaction.occurredAt)}
                    </span>
                    {interaction.contact ? (
                      <span className="text-sm text-muted-foreground">
                        with {interaction.contact.name}
                      </span>
                    ) : null}
                  </header>
                  {interaction.aiSummary ? (
                    <div className="mt-3 rounded-lg border bg-muted/40 p-3">
                      <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
                        AI summary
                      </p>
                      <p className="mt-1 whitespace-pre-wrap text-sm">{interaction.aiSummary}</p>
                    </div>
                  ) : null}
                  {interaction.notes ? (
                    <p className="mt-3 whitespace-pre-wrap text-sm leading-6">{interaction.notes}</p>
                  ) : null}
                  {needs.length > 0 ? (
                    <div className="mt-3">
                      <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
                        Needs
                      </p>
                      <ul className="mt-1 list-disc space-y-1 pl-5 text-sm text-muted-foreground">
                        {needs.map((item) => (
                          <li key={item}>{item}</li>
                        ))}
                      </ul>
                    </div>
                  ) : null}
                  {interaction.aiStageHint || tagHints.length > 0 ? (
                    <div className="mt-3 flex flex-wrap gap-2">
                      {interaction.aiStageHint ? (
                        <Badge variant="outline">Stage hint: {interaction.aiStageHint}</Badge>
                      ) : null}
                      {tagHints.map((tag) => (
                        <Badge key={tag} variant="outline">
                          {tag}
                        </Badge>
                      ))}
                    </div>
                  ) : null}
                  {interaction.transcript ? (
                    <details className="mt-3">
                      <summary className="cursor-pointer text-sm font-medium">Transcript</summary>
                      <p className="mt-2 whitespace-pre-wrap text-sm text-muted-foreground">
                        {interaction.transcript}
                      </p>
                    </details>
                  ) : null}
                  <p className="mt-3 text-xs text-muted-foreground">
                    Logged by {interaction.createdBy.name ?? interaction.createdBy.email}
                  </p>
                </article>
              );
            })}
          </div>
        )}
      </section>
    </div>
  );
}
