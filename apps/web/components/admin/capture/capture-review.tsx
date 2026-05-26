"use client";

import { useMemo, useState } from "react";

import { applyCaptureReviewAction } from "@/app/admin/actions/capture";
import type { CaptureSource, StructuredCapture } from "@/lib/admin/ai/types";
import { Badge } from "@/components/admin/ui/badge";
import { Button } from "@/components/admin/ui/button";
import { Input } from "@/components/admin/ui/input";
import { Label } from "@/components/admin/ui/label";
import { Textarea } from "@/components/admin/ui/textarea";
import { INTERACTION_TYPES } from "@/lib/admin/constants";
import { cn } from "@/lib/admin/utils";

type ReviewTask = {
  title: string;
  description?: string;
  dueInDays?: number;
  selected: boolean;
};

type CaptureReviewProps = {
  companyId: string;
  source: CaptureSource;
  transcript: string;
  structured: StructuredCapture;
  contacts: Array<{ id: string; name: string }>;
  onBack: () => void;
};

const selectClassName = cn(
  "flex h-9 w-full rounded-md border border-input bg-transparent px-3 py-1 text-sm shadow-xs outline-none transition-colors",
  "focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50",
);

export function CaptureReview({
  companyId,
  source,
  transcript,
  structured,
  contacts,
  onBack,
}: CaptureReviewProps) {
  const defaultOccurredAt = new Date().toISOString().slice(0, 16);
  const [summary, setSummary] = useState(structured.summary);
  const [needsBullets, setNeedsBullets] = useState(structured.needsBullets.join("\n"));
  const [tagHints, setTagHints] = useState(structured.tagHints.join(", "));
  const [interactionType, setInteractionType] = useState(structured.interactionType);
  const [tasks, setTasks] = useState<ReviewTask[]>(
    structured.suggestedTasks.map((task) => ({
      title: task.title,
      description: task.description,
      dueInDays: task.dueInDays ?? 3,
      selected: true,
    })),
  );

  const tasksPayload = useMemo(
    () =>
      JSON.stringify(
        tasks.map((task) => ({
          title: task.title,
          description: task.description,
          dueInDays: task.dueInDays,
          selected: task.selected,
        })),
      ),
    [tasks],
  );

  return (
    <div className="space-y-4 rounded-xl border bg-background p-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h3 className="font-medium">Review before saving</h3>
          <p className="text-sm text-muted-foreground">
            Edit the AI draft, then save the interaction and any follow-up tasks.
          </p>
        </div>
        <Badge variant="outline">
          {structured.provider === "groq" ? "Groq draft" : "Offline draft"}
        </Badge>
      </div>

      <form action={applyCaptureReviewAction.bind(null, companyId)} className="grid gap-4 md:grid-cols-2">
        <input type="hidden" name="source" value={source} />
        <input type="hidden" name="transcript" value={transcript} />
        <input type="hidden" name="tasksPayload" value={tasksPayload} />
        <input type="hidden" name="stageHint" value={structured.stageHint ?? ""} />

        <div className="space-y-2">
          <Label htmlFor="capture-type">Interaction type</Label>
          <select
            id="capture-type"
            name="type"
            value={interactionType}
            onChange={(event) => setInteractionType(event.target.value)}
            className={selectClassName}
          >
            {INTERACTION_TYPES.map((type) => (
              <option key={type.value} value={type.value}>
                {type.label}
              </option>
            ))}
          </select>
        </div>
        <div className="space-y-2">
          <Label htmlFor="capture-occurredAt">When</Label>
          <Input
            id="capture-occurredAt"
            name="occurredAt"
            type="datetime-local"
            defaultValue={defaultOccurredAt}
            required
          />
        </div>
        <div className="space-y-2 md:col-span-2">
          <Label htmlFor="capture-contactId">Contact</Label>
          <select id="capture-contactId" name="contactId" defaultValue="" className={selectClassName}>
            <option value="">No specific contact</option>
            {contacts.map((contact) => (
              <option key={contact.id} value={contact.id}>
                {contact.name}
              </option>
            ))}
          </select>
        </div>
        <div className="space-y-2 md:col-span-2">
          <Label htmlFor="capture-summary">Summary</Label>
          <Textarea
            id="capture-summary"
            name="summary"
            value={summary}
            onChange={(event) => setSummary(event.target.value)}
            rows={4}
            required
          />
        </div>
        <div className="space-y-2 md:col-span-2">
          <Label htmlFor="capture-needsBullets">Needs bullets</Label>
          <Textarea
            id="capture-needsBullets"
            name="needsBullets"
            value={needsBullets}
            onChange={(event) => setNeedsBullets(event.target.value)}
            rows={4}
          />
          <label className="flex items-center gap-2 text-sm text-muted-foreground">
            <input type="checkbox" name="applyNeeds" />
            Apply needs bullets to the company record
          </label>
        </div>
        <div className="space-y-2 md:col-span-2">
          <Label htmlFor="capture-tagHints">Tag hints</Label>
          <Input
            id="capture-tagHints"
            name="tagHints"
            value={tagHints}
            onChange={(event) => setTagHints(event.target.value)}
            placeholder="healthcare, warm-intro"
          />
          <label className="flex items-center gap-2 text-sm text-muted-foreground">
            <input type="checkbox" name="applyTags" />
            Merge tag hints onto the company
          </label>
          {structured.stageHint ? (
            <p className="text-xs text-muted-foreground">
              Suggested stage: <span className="font-medium">{structured.stageHint}</span>
            </p>
          ) : null}
        </div>

        <div className="space-y-3 md:col-span-2">
          <Label>Suggested follow-up tasks</Label>
          {tasks.length === 0 ? (
            <p className="text-sm text-muted-foreground">No follow-up tasks suggested.</p>
          ) : (
            tasks.map((task, index) => (
              <div key={`${task.title}-${index}`} className="rounded-lg border p-3">
                <label className="flex items-start gap-3">
                  <input
                    type="checkbox"
                    checked={task.selected}
                    onChange={(event) => {
                      const next = [...tasks];
                      next[index] = { ...task, selected: event.target.checked };
                      setTasks(next);
                    }}
                    className="mt-1"
                  />
                  <div className="grid flex-1 gap-3 md:grid-cols-2">
                    <div className="space-y-2 md:col-span-2">
                      <Label htmlFor={`capture-task-title-${index}`}>Title</Label>
                      <Input
                        id={`capture-task-title-${index}`}
                        value={task.title}
                        onChange={(event) => {
                          const next = [...tasks];
                          next[index] = { ...task, title: event.target.value };
                          setTasks(next);
                        }}
                      />
                    </div>
                    <div className="space-y-2 md:col-span-2">
                      <Label htmlFor={`capture-task-description-${index}`}>Description</Label>
                      <Textarea
                        id={`capture-task-description-${index}`}
                        value={task.description ?? ""}
                        onChange={(event) => {
                          const next = [...tasks];
                          next[index] = { ...task, description: event.target.value };
                          setTasks(next);
                        }}
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor={`capture-task-due-${index}`}>Due in days</Label>
                      <Input
                        id={`capture-task-due-${index}`}
                        type="number"
                        min="0"
                        value={task.dueInDays ?? 3}
                        onChange={(event) => {
                          const next = [...tasks];
                          next[index] = {
                            ...task,
                            dueInDays: Number(event.target.value) || 0,
                          };
                          setTasks(next);
                        }}
                      />
                    </div>
                  </div>
                </label>
              </div>
            ))
          )}
        </div>

        <details className="md:col-span-2">
          <summary className="cursor-pointer text-sm font-medium">Transcript</summary>
          <p className="mt-2 whitespace-pre-wrap text-sm text-muted-foreground">{transcript}</p>
        </details>

        <div className="flex flex-wrap gap-2 md:col-span-2">
          <Button type="submit">Save interaction</Button>
          <Button type="button" variant="outline" onClick={onBack}>
            Back
          </Button>
        </div>
      </form>
    </div>
  );
}
