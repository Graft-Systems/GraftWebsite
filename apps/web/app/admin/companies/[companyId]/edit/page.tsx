import { notFound } from "next/navigation";

import { CompanyForm } from "@/components/admin/companies/company-form";
import { updateCompanyAction } from "@/app/admin/actions/companies";
import {
  getCompany,
  listKnownTags,
  listRelationshipStages,
  listWorkspaceUsers,
} from "@/lib/admin/companies/queries";
import { requireAdmin } from "@/lib/admin/auth-check";

type EditCompanyPageProps = {
  params: Promise<{ companyId: string }>;
};

export default async function EditCompanyPage({ params }: EditCompanyPageProps) {
  const { userId } = await requireAdmin();
  const { companyId } = await params;

  const [company, users, stages, tags] = await Promise.all([
    getCompany("00000000-0000-4000-8000-000000000001", companyId),
    listWorkspaceUsers("00000000-0000-4000-8000-000000000001"),
    listRelationshipStages("00000000-0000-4000-8000-000000000001"),
    listKnownTags("00000000-0000-4000-8000-000000000001"),
  ]);

  if (!company) {
    notFound();
  }

  const updateAction = updateCompanyAction.bind(null, company.id);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-semibold tracking-tight">Edit company</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Update account details, stage, owner, and tags for {company.name}.
        </p>
      </div>
      <div className="rounded-xl border bg-background p-6">
        <CompanyForm
          action={updateAction}
          users={users}
          stages={stages}
          tagSuggestions={tags}
          submitLabel="Save changes"
          company={company}
        />
      </div>
    </div>
  );
}
