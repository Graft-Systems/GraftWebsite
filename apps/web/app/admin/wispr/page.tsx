import Link from "next/link";

import { connectDemoWisprAction } from "@/app/admin/actions/wispr";
import { Button } from "@/components/admin/ui/button";
import { WisprCaptureForm } from "@/components/admin/wispr/wispr-capture-form";
import { WisprIngestCard } from "@/components/admin/wispr/wispr-ingest-card";
import { listWorkspaceCompaniesForSelect } from "@/lib/admin/calendar/companies";
import { listRelationshipStages } from "@/lib/admin/companies/queries";
import { requireAdmin } from "@/lib/admin/auth-check";
import { enrichWisprIngestCompanies } from "@/lib/admin/wispr/types";
import { getWisprConnectionForUser, listWisprIngests } from "@/lib/admin/wispr/queries";

type WisprPageProps = {
  searchParams: Promise<{ status?: string }>;
};

export default async function WisprPage({ searchParams }: WisprPageProps) {
  const { userId } = await requireAdmin();
  const { status } = await searchParams;

  const [connection, companies, stages, ingests] = await Promise.all([
    getWisprConnectionForUser(userId),
    listWorkspaceCompaniesForSelect("00000000-0000-4000-8000-000000000001"),
    listRelationshipStages("00000000-0000-4000-8000-000000000001"),
    listWisprIngests("00000000-0000-4000-8000-000000000001", { status: status || undefined }),
  ]);

  const stageOptions = stages.map((stage) => ({ key: stage.key, label: stage.label }));
  const ingestsWithNames = enrichWisprIngestCompanies(
    ingests,
    companies.map((company) => ({ id: company.id, name: company.name })),
  );
  const pending = ingestsWithNames.filter((ingest) => ingest.status === "pending");
  const applied = ingestsWithNames.filter((ingest) => ingest.status === "applied");
  const discarded = ingestsWithNames.filter((ingest) => ingest.status === "discarded");

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
        <div>
          <h1 className="text-3xl font-semibold tracking-tight">Voice notes</h1>
          <p className="mt-1 max-w-2xl text-sm text-muted-foreground">
            Voice notes and pasted scratchpad text arrive here for review. AI structures each one with a
            summary, needs, tags, and proposed tasks before you save it to a company timeline.
          </p>
        </div>
        <div className="flex items-center gap-2 text-sm">
          <Link
            href="/admin/wispr"
            className={`rounded-full border px-3 py-1 ${!status ? "bg-primary text-primary-foreground" : ""}`}
          >
            All
          </Link>
          <Link
            href="/admin/wispr?status=pending"
            className={`rounded-full border px-3 py-1 ${status === "pending" ? "bg-primary text-primary-foreground" : ""}`}
          >
            Pending
          </Link>
          <Link
            href="/admin/wispr?status=applied"
            className={`rounded-full border px-3 py-1 ${status === "applied" ? "bg-primary text-primary-foreground" : ""}`}
          >
            Applied
          </Link>
        </div>
      </div>

      {!connection || connection.status !== "connected" ? (
        <section className="rounded-xl border border-dashed bg-background p-6">
          <h2 className="text-lg font-semibold">Connect voice capture</h2>
          <p className="mt-1 text-sm text-muted-foreground">
            Real Wispr Flow API access is partner-gated (see{" "}
            <Link href="/admin/settings" className="underline">Settings</Link>{" "}
            for webhook configuration). Until access is approved, use the demo connection — it seeds a couple of
            sample voice notes and routes them through the same AI review pipeline.
          </p>
          <form action={connectDemoWisprAction} className="mt-3">
            <Button type="submit">Connect demo source</Button>
          </form>
        </section>
      ) : (
        <section className="space-y-3 rounded-xl border bg-background p-5">
          <div>
            <h2 className="text-base font-semibold">Capture a note</h2>
            <p className="text-sm text-muted-foreground">
              Dictate on the spot or paste raw text. AI structures it and drops it in the pending queue below
              for you to route to the right company.
            </p>
          </div>
          <WisprCaptureForm />
        </section>
      )}

      {pending.length > 0 ? (
        <section className="space-y-3">
          <h2 className="text-sm font-semibold uppercase tracking-wide text-muted-foreground">
            Pending review ({pending.length})
          </h2>
          {pending.map((ingest) => (
            <WisprIngestCard
              key={ingest.id}
              ingest={ingest}
              companies={companies}
              stages={stageOptions}
            />
          ))}
        </section>
      ) : null}

      {applied.length > 0 ? (
        <section className="space-y-3">
          <h2 className="text-sm font-semibold uppercase tracking-wide text-muted-foreground">
            Applied ({applied.length})
          </h2>
          {applied.map((ingest) => (
            <WisprIngestCard
              key={ingest.id}
              ingest={ingest}
              companies={companies}
              stages={stageOptions}
            />
          ))}
        </section>
      ) : null}

      {discarded.length > 0 ? (
        <section className="space-y-3">
          <h2 className="text-sm font-semibold uppercase tracking-wide text-muted-foreground">
            Discarded ({discarded.length})
          </h2>
          {discarded.map((ingest) => (
            <WisprIngestCard
              key={ingest.id}
              ingest={ingest}
              companies={companies}
              stages={stageOptions}
            />
          ))}
        </section>
      ) : null}

      {pending.length === 0 && applied.length === 0 && discarded.length === 0 ? (
        <div className="rounded-xl border border-dashed bg-background px-6 py-12 text-center">
          <p className="text-sm font-medium">No voice notes in the inbox.</p>
          <p className="mt-1 text-sm text-muted-foreground">
            Connect the demo source above to seed sample notes, or record/paste a note once connected.
          </p>
        </div>
      ) : null}
    </div>
  );
}
