import { upsertInvestorProfileAction } from "@/app/admin/actions/pipeline";
import { Badge } from "@/components/admin/ui/badge";
import { Button } from "@/components/admin/ui/button";
import { Input } from "@/components/admin/ui/input";
import { Label } from "@/components/admin/ui/label";
import { Textarea } from "@/components/admin/ui/textarea";
import { INVESTOR_STAGES } from "@/lib/admin/constants";
import { cn } from "@/lib/admin/utils";

type InvestorPanelProps = {
  companyId: string;
  profile: {
    fundName: string | null;
    checkSizeBand: string | null;
    thesisTags: string[];
    warmIntroSource: string | null;
    stage: string;
    nextStep: string | null;
    notes: string | null;
  } | null;
};

const selectClassName = cn(
  "flex h-9 w-full rounded-md border border-input bg-transparent px-3 py-1 text-sm shadow-xs outline-none transition-colors",
  "focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50",
);

function stageLabel(stage: string) {
  return INVESTOR_STAGES.find((item) => item.value === stage)?.label ?? stage;
}

export function InvestorPanel({ companyId, profile }: InvestorPanelProps) {
  const thesisTagsValue = profile?.thesisTags.join(", ") ?? "";

  return (
    <section className="space-y-4 rounded-xl border bg-background p-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h2 className="text-lg font-semibold">Investor profile</h2>
          <p className="text-sm text-muted-foreground">
            Fund context, thesis tags, and the next investor-specific step.
          </p>
        </div>
        {profile ? <Badge variant="secondary">{stageLabel(profile.stage)}</Badge> : null}
      </div>

      <form action={upsertInvestorProfileAction.bind(null, companyId)} className="grid gap-4 md:grid-cols-2">
        <div className="space-y-2">
          <Label htmlFor="investor-fundName">Fund name</Label>
          <Input
            id="investor-fundName"
            name="fundName"
            defaultValue={profile?.fundName ?? ""}
            placeholder="Northline Ventures"
          />
        </div>
        <div className="space-y-2">
          <Label htmlFor="investor-checkSizeBand">Check size band</Label>
          <Input
            id="investor-checkSizeBand"
            name="checkSizeBand"
            defaultValue={profile?.checkSizeBand ?? ""}
            placeholder="$250k-$1M"
          />
        </div>
        <div className="space-y-2">
          <Label htmlFor="investor-stage">Stage</Label>
          <select
            id="investor-stage"
            name="stage"
            defaultValue={profile?.stage ?? "prospecting"}
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
          <Label htmlFor="investor-warmIntroSource">Warm intro source</Label>
          <Input
            id="investor-warmIntroSource"
            name="warmIntroSource"
            defaultValue={profile?.warmIntroSource ?? ""}
          />
        </div>
        <div className="space-y-2 md:col-span-2">
          <Label htmlFor="investor-thesisTags">Thesis tags</Label>
          <Input
            id="investor-thesisTags"
            name="thesisTags"
            defaultValue={thesisTagsValue}
            placeholder="ai, industrial, b2b"
          />
        </div>
        <div className="space-y-2 md:col-span-2">
          <Label htmlFor="investor-nextStep">Next step</Label>
          <Input id="investor-nextStep" name="nextStep" defaultValue={profile?.nextStep ?? ""} />
        </div>
        <div className="space-y-2 md:col-span-2">
          <Label htmlFor="investor-notes">Notes</Label>
          <Textarea id="investor-notes" name="notes" defaultValue={profile?.notes ?? ""} />
        </div>
        <div className="md:col-span-2">
          <Button type="submit">{profile ? "Save investor profile" : "Add investor profile"}</Button>
        </div>
      </form>
    </section>
  );
}
