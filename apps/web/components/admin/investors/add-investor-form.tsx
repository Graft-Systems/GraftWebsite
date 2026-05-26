import { upsertInvestorWithCompanyPickerAction } from "@/app/admin/actions/pipeline";
import { Button } from "@/components/admin/ui/button";
import { Input } from "@/components/admin/ui/input";
import { Label } from "@/components/admin/ui/label";
import { Textarea } from "@/components/admin/ui/textarea";
import { INVESTOR_STAGES } from "@/lib/admin/constants";
import { cn } from "@/lib/admin/utils";
import Link from "next/link";

const selectClassName = cn(
  "flex h-9 w-full rounded-md border border-input bg-background px-3 py-1 text-sm shadow-xs outline-none transition-colors",
  "focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50",
);

type AddInvestorFormProps = {
  companies: Array<{ id: string; name: string }>;
};

export function AddInvestorForm({ companies }: AddInvestorFormProps) {
  if (companies.length === 0) {
    return (
      <div className="rounded-xl border border-dashed bg-background px-4 py-6 text-sm text-muted-foreground">
        Add a{" "}
        <Link href="/admin/companies" className="font-medium text-foreground underline underline-offset-4">
          company
        </Link>{" "}
        first, then you can attach an investor profile here.
      </div>
    );
  }

  return (
    <div className="rounded-xl border bg-background p-6">
      <h2 className="text-lg font-semibold">Add or update investor</h2>
      <p className="mt-1 text-sm text-muted-foreground">
        Pick the company; if it already has an investor profile, saving updates it.
      </p>
      <form action={upsertInvestorWithCompanyPickerAction} className="mt-4 grid gap-4 md:grid-cols-2">
        <div className="space-y-2 md:col-span-2">
          <Label htmlFor="pipeline-investor-companyId">Company</Label>
          <select
            id="pipeline-investor-companyId"
            name="companyId"
            required
            defaultValue=""
            className={selectClassName}
          >
            <option value="" disabled>
              Select company…
            </option>
            {companies.map((c) => (
              <option key={c.id} value={c.id}>
                {c.name}
              </option>
            ))}
          </select>
        </div>
        <div className="space-y-2">
          <Label htmlFor="pipeline-investor-fundName">Fund name</Label>
          <Input id="pipeline-investor-fundName" name="fundName" placeholder="Northline Ventures" />
        </div>
        <div className="space-y-2">
          <Label htmlFor="pipeline-investor-checkSizeBand">Check size band</Label>
          <Input id="pipeline-investor-checkSizeBand" name="checkSizeBand" placeholder="$250k-$1M" />
        </div>
        <div className="space-y-2">
          <Label htmlFor="pipeline-investor-stage">Stage</Label>
          <select
            id="pipeline-investor-stage"
            name="stage"
            defaultValue="prospecting"
            className={selectClassName}
          >
            {INVESTOR_STAGES.map((stage) => (
              <option key={stage.value} value={stage.value}>
                {stage.label}
              </option>
            ))}
          </select>
        </div>
        <div className="space-y-2">
          <Label htmlFor="pipeline-investor-warmIntroSource">Warm intro source</Label>
          <Input id="pipeline-investor-warmIntroSource" name="warmIntroSource" />
        </div>
        <div className="space-y-2 md:col-span-2">
          <Label htmlFor="pipeline-investor-thesisTags">Thesis tags</Label>
          <Input id="pipeline-investor-thesisTags" name="thesisTags" placeholder="ai, industrial, b2b" />
        </div>
        <div className="space-y-2 md:col-span-2">
          <Label htmlFor="pipeline-investor-nextStep">Next step</Label>
          <Input id="pipeline-investor-nextStep" name="nextStep" />
        </div>
        <div className="space-y-2 md:col-span-2">
          <Label htmlFor="pipeline-investor-notes">Notes</Label>
          <Textarea id="pipeline-investor-notes" name="notes" />
        </div>
        <div className="md:col-span-2">
          <Button type="submit">Save investor</Button>
        </div>
      </form>
    </div>
  );
}
