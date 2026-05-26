import {
  createDealAction,
  updateDealAction,
} from "@/app/admin/actions/pipeline";
import { Badge } from "@/components/admin/ui/badge";
import { Button } from "@/components/admin/ui/button";
import { Input } from "@/components/admin/ui/input";
import { Label } from "@/components/admin/ui/label";
import { Textarea } from "@/components/admin/ui/textarea";
import { DEAL_STAGES } from "@/lib/admin/constants";
import { formatDate } from "@/lib/admin/crm";
import { cn } from "@/lib/admin/utils";

type DealSectionProps = {
  companyId: string;
  users: Array<{ id: string; name: string | null; email: string }>;
  deals: Array<{
    id: string;
    name: string;
    stage: string;
    valueEstimate: number | null;
    expectedClose: Date | null;
    startsAt: Date | null;
    endsAt: Date | null;
    link: string | null;
    notes: string | null;
    owner: { id: string; name: string | null; email: string } | null;
  }>;
};

const selectClassName = cn(
  "flex h-9 w-full rounded-md border border-input bg-transparent px-3 py-1 text-sm shadow-xs outline-none transition-colors",
  "focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50",
);

function stageLabel(stage: string) {
  return DEAL_STAGES.find((item) => item.value === stage)?.label ?? stage;
}

function formatValue(value: number | null) {
  if (value === null) {
    return null;
  }

  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    maximumFractionDigits: 0,
  }).format(value);
}

function dateInputValue(date: Date | null) {
  return date ? date.toISOString().slice(0, 10) : "";
}

function rangeLabel(startsAt: Date | null, endsAt: Date | null) {
  if (startsAt && endsAt) {
    return `${formatDate(startsAt)} → ${formatDate(endsAt)}`;
  }
  if (startsAt) return `Starts ${formatDate(startsAt)}`;
  if (endsAt) return `Ends ${formatDate(endsAt)}`;
  return null;
}

export function DealSection({ companyId, users, deals }: DealSectionProps) {
  return (
    <section className="space-y-6">
      <div>
        <h2 className="text-lg font-semibold">Competitions</h2>
        <p className="text-sm text-muted-foreground">
          Pitch competitions, accelerator programs, grants, and challenges this company is tied to.
        </p>
      </div>

      <div className="space-y-4">
        {deals.length === 0 ? (
          <div className="rounded-lg border border-dashed px-4 py-8 text-sm text-muted-foreground">
            No competitions yet.
          </div>
        ) : (
          deals.map((deal) => {
            const value = formatValue(deal.valueEstimate);
            const range = rangeLabel(deal.startsAt, deal.endsAt);
            return (
              <form
                key={deal.id}
                action={updateDealAction.bind(null, deal.id)}
                className="space-y-4 rounded-xl border bg-background p-4"
              >
                <div className="flex flex-wrap items-center justify-between gap-3">
                  <Badge variant="secondary">{stageLabel(deal.stage)}</Badge>
                  <div className="flex flex-wrap items-center gap-3 text-sm text-muted-foreground">
                    {range ? <span>{range}</span> : null}
                    {value ? <span>Prize {value}</span> : null}
                    {deal.expectedClose ? (
                      <span>Decision {formatDate(deal.expectedClose)}</span>
                    ) : null}
                    {deal.link ? (
                      <a
                        href={deal.link}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-foreground underline-offset-4 hover:underline"
                      >
                        Open page ↗
                      </a>
                    ) : null}
                  </div>
                </div>
                <div className="grid gap-4 md:grid-cols-2">
                  <div className="space-y-2 md:col-span-2">
                    <Label htmlFor={`deal-name-${deal.id}`}>Name</Label>
                    <Input id={`deal-name-${deal.id}`} name="name" defaultValue={deal.name} required />
                  </div>
                  <div className="space-y-2 md:col-span-2">
                    <Label htmlFor={`deal-link-${deal.id}`}>Link to competition</Label>
                    <Input
                      id={`deal-link-${deal.id}`}
                      name="link"
                      type="url"
                      defaultValue={deal.link ?? ""}
                      placeholder="https://"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor={`deal-stage-${deal.id}`}>Stage</Label>
                    <select
                      id={`deal-stage-${deal.id}`}
                      name="stage"
                      defaultValue={deal.stage}
                      className={selectClassName}
                    >
                      {DEAL_STAGES.map((stage) => (
                        <option key={stage.value} value={stage.value}>
                          {stage.label}
                        </option>
                      ))}
                    </select>
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor={`deal-ownerId-${deal.id}`}>Lead</Label>
                    <select
                      id={`deal-ownerId-${deal.id}`}
                      name="ownerId"
                      defaultValue={deal.owner?.id ?? ""}
                      className={selectClassName}
                    >
                      <option value="">Unassigned</option>
                      {users.map((user) => (
                        <option key={user.id} value={user.id}>
                          {user.name ?? user.email}
                        </option>
                      ))}
                    </select>
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor={`deal-startsAt-${deal.id}`}>Start date</Label>
                    <Input
                      id={`deal-startsAt-${deal.id}`}
                      name="startsAt"
                      type="date"
                      defaultValue={dateInputValue(deal.startsAt)}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor={`deal-endsAt-${deal.id}`}>End date</Label>
                    <Input
                      id={`deal-endsAt-${deal.id}`}
                      name="endsAt"
                      type="date"
                      defaultValue={dateInputValue(deal.endsAt)}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor={`deal-expectedClose-${deal.id}`}>Decision deadline</Label>
                    <Input
                      id={`deal-expectedClose-${deal.id}`}
                      name="expectedClose"
                      type="date"
                      defaultValue={dateInputValue(deal.expectedClose)}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor={`deal-valueEstimate-${deal.id}`}>Prize / value ($)</Label>
                    <Input
                      id={`deal-valueEstimate-${deal.id}`}
                      name="valueEstimate"
                      type="number"
                      min="0"
                      step="1000"
                      defaultValue={deal.valueEstimate ?? ""}
                    />
                  </div>
                  <div className="space-y-2 md:col-span-2">
                    <Label htmlFor={`deal-notes-${deal.id}`}>Notes</Label>
                    <Textarea id={`deal-notes-${deal.id}`} name="notes" defaultValue={deal.notes ?? ""} />
                  </div>
                </div>
                <Button type="submit" size="sm">
                  Save competition
                </Button>
              </form>
            );
          })
        )}
      </div>

      <div className="rounded-xl border bg-background p-4">
        <h3 className="font-medium">Add competition</h3>
        <form action={createDealAction.bind(null, companyId)} className="mt-4 grid gap-4 md:grid-cols-2">
          <div className="space-y-2 md:col-span-2">
            <Label htmlFor="new-deal-name">Name</Label>
            <Input id="new-deal-name" name="name" required placeholder="TechCrunch Disrupt Startup Battlefield" />
          </div>
          <div className="space-y-2 md:col-span-2">
            <Label htmlFor="new-deal-link">Link to competition</Label>
            <Input id="new-deal-link" name="link" type="url" placeholder="https://" />
          </div>
          <div className="space-y-2">
            <Label htmlFor="new-deal-stage">Stage</Label>
            <select id="new-deal-stage" name="stage" defaultValue="open" className={selectClassName}>
              {DEAL_STAGES.map((stage) => (
                <option key={stage.value} value={stage.value}>
                  {stage.label}
                </option>
              ))}
            </select>
          </div>
          <div className="space-y-2">
            <Label htmlFor="new-deal-ownerId">Lead</Label>
            <select id="new-deal-ownerId" name="ownerId" defaultValue="" className={selectClassName}>
              <option value="">Unassigned</option>
              {users.map((user) => (
                <option key={user.id} value={user.id}>
                  {user.name ?? user.email}
                </option>
              ))}
            </select>
          </div>
          <div className="space-y-2">
            <Label htmlFor="new-deal-startsAt">Start date</Label>
            <Input id="new-deal-startsAt" name="startsAt" type="date" />
          </div>
          <div className="space-y-2">
            <Label htmlFor="new-deal-endsAt">End date</Label>
            <Input id="new-deal-endsAt" name="endsAt" type="date" />
          </div>
          <div className="space-y-2">
            <Label htmlFor="new-deal-expectedClose">Decision deadline</Label>
            <Input id="new-deal-expectedClose" name="expectedClose" type="date" />
          </div>
          <div className="space-y-2">
            <Label htmlFor="new-deal-valueEstimate">Prize / value ($)</Label>
            <Input id="new-deal-valueEstimate" name="valueEstimate" type="number" min="0" step="1000" />
          </div>
          <div className="space-y-2 md:col-span-2">
            <Label htmlFor="new-deal-notes">Notes</Label>
            <Textarea
              id="new-deal-notes"
              name="notes"
              placeholder="Eligibility, submission requirements, contact at the program, etc."
            />
          </div>
          <div className="md:col-span-2">
            <Button type="submit">Add competition</Button>
          </div>
        </form>
      </div>
    </section>
  );
}
