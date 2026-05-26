import { CompanyForm } from "@/components/admin/companies/company-form";
import { createCompanyAction } from "@/app/admin/actions/companies";
import {
  listKnownTags,
  listRelationshipStages,
  listWorkspaceUsers,
} from "@/lib/admin/companies/queries";
import { requireAdmin } from "@/lib/admin/auth-check";

export default async function NewCompanyPage() {
  const { userId } = await requireAdmin();

  const [users, stages, tags] = await Promise.all([
    listWorkspaceUsers("00000000-0000-4000-8000-000000000001"),
    listRelationshipStages("00000000-0000-4000-8000-000000000001"),
    listKnownTags("00000000-0000-4000-8000-000000000001"),
  ]);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-semibold tracking-tight">Add company</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Create an organization record and assign stage, owner, and tags.
        </p>
      </div>
      <div className="rounded-xl border bg-background p-6">
        <CompanyForm
          action={createCompanyAction}
          users={users}
          stages={stages}
          tagSuggestions={tags}
          submitLabel="Create company"
        />
      </div>
    </div>
  );
}
