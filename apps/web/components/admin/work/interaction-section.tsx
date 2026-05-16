import { createInteractionAction } from "@/app/admin/actions/work";
import { CapturePanel } from "@/components/admin/capture/capture-panel";
import { Badge } from "@/components/admin/ui/badge";
import { Button } from "@/components/admin/ui/button";
import { Input } from "@/components/admin/ui/input";
import { Label } from "@/components/admin/ui/label";
import { Textarea } from "@/components/admin/ui/textarea";
import { INTERACTION_TYPES } from "@/lib/admin/constants";
import { formatDateTime, interactionSourceLabel, interactionTypeLabel, parseTags } from "@/lib/admin/crm";
import { cn } from "@/lib/admin/utils";

type InteractionSectionProps = {
  companyId: string;
  contacts: Array<{ id: string; name: string }>;
  interactions: Array<{
    id: string;
    type: string;
    source: string;
    occurredAt: Date;
    notes: string | null;
    transcript: string | null;
    aiSummary: string | null;
    aiNeeds: unknown;
    aiStageHint: string | null;
    aiTagHints: unknown;
    contact: { id: string; name: string } | null;
    createdBy: { name: string | null; email: string };
  }>;
};

const selectClassName = cn(
  "flex h-9 w-full rounded-md border border-input bg-transparent px-3 py-1 text-sm shadow-xs outline-none transition-colors",
  "focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50",
);

export function InteractionSection({
  companyId,
  contacts,
  interactions,
}: InteractionSectionProps) {
  const defaultOccurredAt = new Date().toISOString().slice(0, 16);

  return (
    <section className="space-y-6">
      <div>
        <h2 className="text-lg font-semibold">Interactions</h2>
        <p className="text-sm text-muted-foreground">
          Log calls and meetings manually, or capture voice and pasted notes with AI review.
        </p>
      </div>

      <CapturePanel companyId={companyId} contacts={contacts} />

      <div className="space-y-3">
        {interactions.length === 0 ? (
          <div className="rounded-lg border border-dashed px-4 py-8 text-sm text-muted-foreground">
            No interactions logged yet.
          </div>
        ) : (
          interactions.map((interaction) => {
            const needs = parseTags(interaction.aiNeeds);
            const tagHints = parseTags(interaction.aiTagHints);

            return (
              <article key={interaction.id} className="rounded-xl border bg-background p-4">
                <div className="flex flex-wrap items-center gap-2">
                  <Badge variant="secondary">{interactionTypeLabel(interaction.type)}</Badge>
                  {interaction.source !== "manual" ? (
                    <Badge variant="outline">{interactionSourceLabel(interaction.source)}</Badge>
                  ) : null}
                  <span className="text-sm text-muted-foreground">
                    {formatDateTime(interaction.occurredAt)}
                  </span>
                  {interaction.contact ? (
                    <span className="text-sm text-muted-foreground">
                      with {interaction.contact.name}
                    </span>
                  ) : null}
                </div>
                <p className="mt-3 whitespace-pre-wrap text-sm leading-6">
                  {interaction.notes || interaction.aiSummary || "No notes added."}
                </p>
                {needs.length > 0 ? (
                  <ul className="mt-3 list-disc space-y-1 pl-5 text-sm text-muted-foreground">
                    {needs.map((item) => (
                      <li key={item}>{item}</li>
                    ))}
                  </ul>
                ) : null}
                {interaction.aiStageHint || tagHints.length > 0 ? (
                  <div className="mt-3 flex flex-wrap gap-2">
                    {interaction.aiStageHint ? (
                      <Badge variant="outline">Stage hint: {interaction.aiStageHint}</Badge>
                    ) : null}
                    {tagHints.map((tag) => (
                      <Badge key={tag} variant="outline">
                        {tag}
                      </Badge>
                    ))}
                  </div>
                ) : null}
                {interaction.transcript ? (
                  <details className="mt-3">
                    <summary className="cursor-pointer text-sm font-medium">Transcript</summary>
                    <p className="mt-2 whitespace-pre-wrap text-sm text-muted-foreground">
                      {interaction.transcript}
                    </p>
                  </details>
                ) : null}
                <p className="mt-3 text-xs text-muted-foreground">
                  Logged by {interaction.createdBy.name ?? interaction.createdBy.email}
                </p>
              </article>
            );
          })
        )}
      </div>

      <div className="rounded-xl border bg-background p-4">
        <h3 className="font-medium">Log interaction manually</h3>
        <form action={createInteractionAction.bind(null, companyId)} className="mt-4 grid gap-4 md:grid-cols-2">
          <div className="space-y-2">
            <Label htmlFor="interaction-type">Type</Label>
            <select id="interaction-type" name="type" defaultValue="call" className={selectClassName}>
              {INTERACTION_TYPES.map((type) => (
                <option key={type.value} value={type.value}>
                  {type.label}
                </option>
              ))}
            </select>
          </div>
          <div className="space-y-2">
            <Label htmlFor="interaction-occurredAt">When</Label>
            <Input
              id="interaction-occurredAt"
              name="occurredAt"
              type="datetime-local"
              defaultValue={defaultOccurredAt}
              required
            />
          </div>
          <div className="space-y-2 md:col-span-2">
            <Label htmlFor="interaction-contactId">Contact</Label>
            <select id="interaction-contactId" name="contactId" defaultValue="" className={selectClassName}>
              <option value="">No specific contact</option>
              {contacts.map((contact) => (
                <option key={contact.id} value={contact.id}>
                  {contact.name}
                </option>
              ))}
            </select>
          </div>
          <div className="space-y-2 md:col-span-2">
            <Label htmlFor="interaction-notes">Notes</Label>
            <Textarea
              id="interaction-notes"
              name="notes"
              placeholder="What happened, what they asked for, and what comes next."
            />
          </div>
          <div className="md:col-span-2">
            <Button type="submit">Save interaction</Button>
          </div>
        </form>
      </div>
    </section>
  );
}
