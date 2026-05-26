import { AddInvestorForm } from "@/components/admin/investors/add-investor-form";
import { InvestorTable } from "@/components/admin/investors/investor-table";
import { INVESTOR_STAGES } from "@/lib/admin/constants";
import { listCompanySelectOptions } from "@/lib/admin/companies/queries";
import { listInvestors } from "@/lib/admin/pipeline/queries";
import { requireAdmin } from "@/lib/admin/auth-check";
import { cn } from "@/lib/admin/utils";

type InvestorsPageProps = {
  searchParams: Promise<{
    stage?: string;
  }>;
};

const selectClassName = cn(
  "flex h-9 w-full rounded-md border border-input bg-background px-3 py-1 text-sm shadow-xs outline-none transition-colors",
  "focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50",
);

export default async function InvestorsPage({ searchParams }: InvestorsPageProps) {
  const { userId } = await requireAdmin();
  const filters = await searchParams;

  const [investors, companies] = await Promise.all([
    listInvestors("00000000-0000-4000-8000-000000000001", {
      stage: filters.stage,
    }),
    listCompanySelectOptions("00000000-0000-4000-8000-000000000001"),
  ]);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-semibold tracking-tight">Investors</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Investor-specific context attached to company records. Add or update a profile here or on the company.
        </p>
      </div>

      <AddInvestorForm companies={companies} />

      <form method="get" className="grid gap-4 rounded-xl border bg-background p-4 md:grid-cols-3">
        <div className="space-y-2">
          <label className="text-sm font-medium" htmlFor="stage">
            Stage
          </label>
          <select id="stage" name="stage" defaultValue={filters.stage ?? ""} className={selectClassName}>
            <option value="">All stages</option>
            {INVESTOR_STAGES.map((stage) => (
              <option key={stage.value} value={stage.value}>
                {stage.label}
              </option>
            ))}
          </select>
        </div>
        <div className="flex items-end gap-2 md:col-span-2">
          <button
            type="submit"
            className="inline-flex h-9 items-center justify-center rounded-md bg-primary px-4 text-sm font-medium text-primary-foreground"
          >
            Apply filters
          </button>
          <a
            href="/admin/investors"
            className="inline-flex h-9 items-center justify-center rounded-md border px-4 text-sm font-medium"
          >
            Reset
          </a>
        </div>
      </form>

      <InvestorTable investors={investors} />
    </div>
  );
}
