import Link from "next/link";
import { notFound } from "next/navigation";

import {
  createContactAction,
  deleteCompanyAction,
  deleteContactAction,
  updateContactAction,
} from "@/app/admin/actions/companies";
import { CommentsSection } from "@/components/admin/work/comments-section";
import { ContactList } from "@/components/admin/companies/contact-list";
import { InteractionSection } from "@/components/admin/work/interaction-section";
import { InvestorPanel } from "@/components/admin/investors/investor-panel";
import { NeedsPanel } from "@/components/admin/companies/needs-panel";
import { TaskSection } from "@/components/admin/work/task-section";
import { Badge } from "@/components/admin/ui/badge";
import { Button, buttonVariants } from "@/components/admin/ui/button";
import { getCompany, listWorkspaceUsers } from "@/lib/admin/companies/queries";
import { formatDate, parseTags } from "@/lib/admin/crm";
import {
  getCompanyInvestorProfile,
  listCompanyDeals,
} from "@/lib/admin/pipeline/queries";
import { requireAdmin } from "@/lib/admin/auth-check";
import { listCompanyComments } from "@/lib/admin/work/comments";
import { listCompanyInteractions, listCompanyTasks } from "@/lib/admin/work/queries";

type CompanyDetailPageProps = {
  params: Promise<{ companyId: string }>;
};

export default async function CompanyDetailPage({ params }: CompanyDetailPageProps) {
  const { userId } = await requireAdmin();
  const { companyId } = await params;
  const [
    company,
    users,
    interactions,
    tasks,
    deals,
    investorProfile,
    comments,
  ] = await Promise.all([
    getCompany("00000000-0000-4000-8000-000000000001", companyId),
    listWorkspaceUsers("00000000-0000-4000-8000-000000000001"),
    listCompanyInteractions(companyId),
    listCompanyTasks(companyId),
    listCompanyDeals(companyId),
    getCompanyInvestorProfile(companyId),
    listCompanyComments(companyId),
  ]);

  if (!company) {
    notFound();
  }

  return (
    <div className="space-y-8">
      <div className="flex flex-col gap-4 md:flex-row md:items-start md:justify-between">
        <div className="space-y-3">
          <div className="flex flex-wrap items-center gap-2">
            {company.relationshipStage ? (
              <Badge variant="secondary">{company.relationshipStage.label}</Badge>
            ) : null}
            {parseTags(company.tags).map((tag) => (
              <Badge key={tag} variant="outline">
                {tag}
              </Badge>
            ))}
          </div>
          <div>
            <h1 className="text-3xl font-semibold tracking-tight">{company.name}</h1>
            <p className="mt-1 text-sm text-muted-foreground">
              Owner: {company.accountOwner.name ?? company.accountOwner.email} · Updated{" "}
              {formatDate(company.updatedAt)}
            </p>
          </div>
          {company.domain ? (
            <p className="text-sm text-muted-foreground">{company.domain}</p>
          ) : null}
        </div>
        <div className="flex flex-wrap gap-2">
          <Link
            href={`/admin/companies/${company.id}/notes`}
            className={buttonVariants({ variant: "default" })}
          >
            Open notes
          </Link>
          <Link
            href={`/admin/companies/${company.id}/edit`}
            className={buttonVariants({ variant: "outline" })}
          >
            Edit company
          </Link>
          <form action={deleteCompanyAction.bind(null, company.id)}>
            <Button type="submit" variant="outline">
              Delete
            </Button>
          </form>
        </div>
      </div>

      <section className="grid gap-6 lg:grid-cols-2">
        <NeedsPanel companyId={company.id} needs={company.needs} />
        <div className="rounded-xl border bg-background p-6">
          <h2 className="text-lg font-semibold">Company details</h2>
          <dl className="mt-4 space-y-3 text-sm">
            <div>
              <dt className="text-muted-foreground">Website</dt>
              <dd>{company.website || "—"}</dd>
            </div>
            <div>
              <dt className="text-muted-foreground">Description</dt>
              <dd className="whitespace-pre-wrap">{company.description || "—"}</dd>
            </div>
          </dl>
        </div>
      </section>

      <InvestorPanel
        companyId={company.id}
        profile={
          investorProfile
            ? {
                ...investorProfile,
                thesisTags: parseTags(investorProfile.thesisTags),
              }
            : null
        }
      />

      <InteractionSection
        companyId={company.id}
        contacts={company.contacts}
        interactions={interactions}
      />

      <TaskSection
        companyId={company.id}
        contacts={company.contacts}
        users={users}
        deals={deals.map((deal) => ({ id: deal.id, name: deal.name }))}
        tasks={tasks}
      />

      <CommentsSection
        companyId={company.id}
        currentUserId={userId}
        currentUserRole={session.user.role}
        comments={comments}
      />

      <ContactList
        companyId={company.id}
        contacts={company.contacts}
        createContactAction={createContactAction}
        updateContactAction={updateContactAction}
        deleteContactAction={deleteContactAction}
      />
    </div>
  );
}
