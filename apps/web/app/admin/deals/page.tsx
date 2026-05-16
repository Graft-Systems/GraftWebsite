import { AddCompetitionForm } from "@/components/admin/competitions/add-competition-form";
import { DealTable } from "@/components/admin/competitions/deal-table";
import { DEAL_STAGES } from "@/lib/admin/constants";
import { listCompanySelectOptions, listWorkspaceUsers } from "@/lib/admin/companies/queries";
import { listDeals } from "@/lib/admin/pipeline/queries";
import { requireAdmin } from "@/lib/admin/auth-check";
import { cn } from "@/lib/admin/utils";

type DealsPageProps = {
  searchParams: Promise<{
    stage?: string;
    ownerId?: string;
    openOnly?: string;
  }>;
};

export const metadata = {
  title: "Competitions",
};

const selectClassName = cn(
  "flex h-9 w-full rounded-md border border-input bg-background px-3 py-1 text-sm shadow-xs outline-none transition-colors",
  "focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50",
);

export default async function DealsPage({ searchParams }: DealsPageProps) {
  const { userId } = await requireAdmin();
  const filters = await searchParams;
  const openOnly = filters.openOnly !== "0";

  const [deals, users, companies] = await Promise.all([
    listDeals("00000000-0000-4000-8000-000000000001", {
      stage: filters.stage,
      ownerId: filters.ownerId,
      openOnly: openOnly && !filters.stage,
    }),
    listWorkspaceUsers("00000000-0000-4000-8000-000000000001"),
    listCompanySelectOptions("00000000-0000-4000-8000-000000000001"),
  ]);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-semibold tracking-tight">Competitions</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Pitch competitions, accelerators, grants, and challenges for the workspace. Link a company only when
          it applies.
        </p>
      </div>

      <AddCompetitionForm companies={companies} users={users} />

      <form method="get" className="grid gap-4 rounded-xl border bg-background p-4 md:grid-cols-4">
        <div className="space-y-2">
          <label className="text-sm font-medium" htmlFor="stage">
            Stage
          </label>
          <select id="stage" name="stage" defaultValue={filters.stage ?? ""} className={selectClassName}>
            <option value="">Active</option>
            {DEAL_STAGES.map((stage) => (
              <option key={stage.value} value={stage.value}>
                {stage.label}
              </option>
            ))}
          </select>
        </div>
        <div className="space-y-2">
          <label className="text-sm font-medium" htmlFor="ownerId">
            Owner
          </label>
          <select id="ownerId" name="ownerId" defaultValue={filters.ownerId ?? ""} className={selectClassName}>
            <option value="">All owners</option>
            {users.map((user) => (
              <option key={user.id} value={user.id}>
                {user.name ?? user.email}
              </option>
            ))}
          </select>
        </div>
        <div className="flex items-end gap-2 md:col-span-2">
          <input type="hidden" name="openOnly" value={openOnly ? "1" : "0"} />
          <button
            type="submit"
            className="inline-flex h-9 items-center justify-center rounded-md bg-primary px-4 text-sm font-medium text-primary-foreground"
          >
            Apply filters
          </button>
          <a
            href="/admin/deals"
            className="inline-flex h-9 items-center justify-center rounded-md border px-4 text-sm font-medium"
          >
            Reset
          </a>
        </div>
      </form>

      <DealTable deals={deals} />
    </div>
  );
}
