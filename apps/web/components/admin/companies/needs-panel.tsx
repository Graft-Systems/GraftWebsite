import { updateCompanyNeedsAction } from "@/app/admin/actions/work";
import { Button } from "@/components/admin/ui/button";
import { Textarea } from "@/components/admin/ui/textarea";
import { summarizeText } from "@/lib/admin/crm";

type NeedsPanelProps = {
  companyId: string;
  needs: string | null;
  compact?: boolean;
};

export function NeedsPanel({ companyId, needs, compact = false }: NeedsPanelProps) {
  if (compact) {
    return (
      <p className="text-xs text-muted-foreground">
        {summarizeText(needs, 100) || "No needs captured yet."}
      </p>
    );
  }

  return (
    <section className="rounded-xl border bg-background p-6">
      <div className="space-y-1">
        <h2 className="text-lg font-semibold">Needs / priorities</h2>
        <p className="text-sm text-muted-foreground">
          Capture what this organization cares about right now.
        </p>
      </div>
      <form action={updateCompanyNeedsAction.bind(null, companyId)} className="mt-4 space-y-4">
        <Textarea
          id="needs"
          name="needs"
          defaultValue={needs ?? ""}
          placeholder="Problems they care about, constraints, timing."
          rows={6}
        />
        <Button type="submit" size="sm">
          Save needs
        </Button>
      </form>
    </section>
  );
}
