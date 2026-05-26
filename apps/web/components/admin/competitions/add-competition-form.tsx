import { createDealWithCompanyPickerAction } from "@/app/admin/actions/pipeline";
import { Button } from "@/components/admin/ui/button";
import { Input } from "@/components/admin/ui/input";
import { Label } from "@/components/admin/ui/label";
import { Textarea } from "@/components/admin/ui/textarea";
import { DEAL_STAGES } from "@/lib/admin/constants";
import { cn } from "@/lib/admin/utils";

const selectClassName = cn(
  "flex h-9 w-full rounded-md border border-input bg-background px-3 py-1 text-sm shadow-xs outline-none transition-colors",
  "focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50",
);

type AddCompetitionFormProps = {
  companies: Array<{ id: string; name: string }>;
  users: Array<{ id: string; name: string | null; email: string }>;
};

export function AddCompetitionForm({ companies, users }: AddCompetitionFormProps) {
  return (
    <div className="rounded-xl border bg-background p-6">
      <h2 className="text-lg font-semibold">Add competition</h2>
      <p className="mt-1 text-sm text-muted-foreground">
        Competitions are workspace-wide. Optionally link a company if this maps to an account.
      </p>
      <form action={createDealWithCompanyPickerAction} className="mt-4 grid gap-4 md:grid-cols-2">
        <div className="space-y-2 md:col-span-2">
          <Label htmlFor="pipeline-deal-companyId">Company (optional)</Label>
          <select id="pipeline-deal-companyId" name="companyId" defaultValue="" className={selectClassName}>
            <option value="">None</option>
            {companies.map((c) => (
              <option key={c.id} value={c.id}>
                {c.name}
              </option>
            ))}
          </select>
        </div>
        <div className="space-y-2 md:col-span-2">
          <Label htmlFor="pipeline-deal-name">Name</Label>
          <Input
            id="pipeline-deal-name"
            name="name"
            required
            placeholder="TechCrunch Disrupt Startup Battlefield"
          />
        </div>
        <div className="space-y-2 md:col-span-2">
          <Label htmlFor="pipeline-deal-link">Link to competition</Label>
          <Input id="pipeline-deal-link" name="link" type="url" placeholder="https://" />
        </div>
        <div className="space-y-2">
          <Label htmlFor="pipeline-deal-stage">Stage</Label>
          <select id="pipeline-deal-stage" name="stage" defaultValue="open" className={selectClassName}>
            {DEAL_STAGES.map((stage) => (
              <option key={stage.value} value={stage.value}>
                {stage.label}
              </option>
            ))}
          </select>
        </div>
        <div className="space-y-2">
          <Label htmlFor="pipeline-deal-ownerId">Lead</Label>
          <select id="pipeline-deal-ownerId" name="ownerId" defaultValue="" className={selectClassName}>
            <option value="">Unassigned</option>
            {users.map((user) => (
              <option key={user.id} value={user.id}>
                {user.name ?? user.email}
              </option>
            ))}
          </select>
        </div>
        <div className="space-y-2">
          <Label htmlFor="pipeline-deal-startsAt">Start date</Label>
          <Input id="pipeline-deal-startsAt" name="startsAt" type="date" />
        </div>
        <div className="space-y-2">
          <Label htmlFor="pipeline-deal-endsAt">End date</Label>
          <Input id="pipeline-deal-endsAt" name="endsAt" type="date" />
        </div>
        <div className="space-y-2">
          <Label htmlFor="pipeline-deal-expectedClose">Decision deadline</Label>
          <Input id="pipeline-deal-expectedClose" name="expectedClose" type="date" />
        </div>
        <div className="space-y-2">
          <Label htmlFor="pipeline-deal-valueEstimate">Prize / value ($)</Label>
          <Input id="pipeline-deal-valueEstimate" name="valueEstimate" type="number" min="0" step="1000" />
        </div>
        <div className="space-y-2 md:col-span-2">
          <Label htmlFor="pipeline-deal-notes">Notes</Label>
          <Textarea
            id="pipeline-deal-notes"
            name="notes"
            placeholder="Eligibility, submission requirements, program contact, etc."
          />
        </div>
        <div className="md:col-span-2">
          <Button type="submit">Add competition</Button>
        </div>
      </form>
    </div>
  );
}
