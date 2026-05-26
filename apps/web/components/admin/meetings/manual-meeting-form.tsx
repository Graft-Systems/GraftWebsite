"use client";

import { useState, useTransition } from "react";

import { createManualMeetingAction } from "@/app/admin/actions/calendar";
import { Button } from "@/components/admin/ui/button";
import { Input } from "@/components/admin/ui/input";
import { Label } from "@/components/admin/ui/label";
import { Textarea } from "@/components/admin/ui/textarea";
import { cn } from "@/lib/admin/utils";

type ManualMeetingFormProps = {
  companies: Array<{ id: string; name: string }>;
};

const selectClass = cn(
  "flex h-9 w-full rounded-md border border-input bg-background px-3 py-1 text-sm shadow-xs outline-none transition-colors",
  "focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50",
);

function defaultStart() {
  const d = new Date();
  d.setMinutes(0, 0, 0);
  d.setHours(d.getHours() + 1);
  const offset = d.getTimezoneOffset() * 60_000;
  return new Date(d.getTime() - offset).toISOString().slice(0, 16);
}

export function ManualMeetingForm({ companies }: ManualMeetingFormProps) {
  const [open, setOpen] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  function onSubmit(formData: FormData) {
    setError(null);
    startTransition(async () => {
      try {
        await createManualMeetingAction(formData);
        setOpen(false);
      } catch (cause) {
        setError(cause instanceof Error ? cause.message : "Could not save meeting.");
      }
    });
  }

  if (!open) {
    return (
      <div className="flex items-center justify-between rounded-xl border bg-background p-4">
        <div>
          <p className="text-sm font-medium">Add a meeting manually</p>
          <p className="text-xs text-muted-foreground">
            Use this when you haven&apos;t hooked up a calendar yet.
          </p>
        </div>
        <Button type="button" variant="outline" onClick={() => setOpen(true)}>
          New meeting
        </Button>
      </div>
    );
  }

  return (
    <form action={onSubmit} className="space-y-4 rounded-xl border bg-background p-4">
      <div className="flex items-center justify-between">
        <h3 className="text-sm font-semibold">Log a meeting manually</h3>
        <Button
          type="button"
          variant="ghost"
          size="sm"
          onClick={() => {
            setOpen(false);
            setError(null);
          }}
        >
          Cancel
        </Button>
      </div>

      <div className="grid gap-4 md:grid-cols-2">
        <div className="space-y-2 md:col-span-2">
          <Label htmlFor="manual-meeting-title">Title</Label>
          <Input
            id="manual-meeting-title"
            name="title"
            required
            placeholder="Intro call with Northwind"
          />
        </div>

        <div className="space-y-2">
          <Label htmlFor="manual-meeting-startsAt">Starts</Label>
          <Input
            id="manual-meeting-startsAt"
            name="startsAt"
            type="datetime-local"
            defaultValue={defaultStart()}
            required
          />
        </div>
        <div className="space-y-2">
          <Label htmlFor="manual-meeting-endsAt">Ends</Label>
          <Input id="manual-meeting-endsAt" name="endsAt" type="datetime-local" />
        </div>

        <div className="space-y-2 md:col-span-2">
          <Label htmlFor="manual-meeting-attendees">Attendees</Label>
          <Textarea
            id="manual-meeting-attendees"
            name="attendees"
            rows={3}
            placeholder={"One per line — e.g.\nElena Marchetti <elena@northwind.example>\nsarah@acme.example"}
          />
        </div>

        <div className="space-y-2">
          <Label htmlFor="manual-meeting-location">Location</Label>
          <Input id="manual-meeting-location" name="location" placeholder="Office / Zoom / etc." />
        </div>
        <div className="space-y-2">
          <Label htmlFor="manual-meeting-meetingUrl">Meeting link</Label>
          <Input id="manual-meeting-meetingUrl" name="meetingUrl" type="url" placeholder="https://" />
        </div>

        <div className="space-y-2 md:col-span-2">
          <Label htmlFor="manual-meeting-companyId">Link to company (optional)</Label>
          <select
            id="manual-meeting-companyId"
            name="companyId"
            defaultValue=""
            className={selectClass}
          >
            <option value="">Don&apos;t link yet</option>
            {companies.map((company) => (
              <option key={company.id} value={company.id}>
                {company.name}
              </option>
            ))}
          </select>
        </div>

        <div className="space-y-2 md:col-span-2">
          <Label htmlFor="manual-meeting-description">Notes / agenda</Label>
          <Textarea id="manual-meeting-description" name="description" rows={3} />
        </div>
      </div>

      {error ? <p className="text-sm text-destructive">{error}</p> : null}

      <div className="flex justify-end">
        <Button type="submit" disabled={pending}>
          {pending ? "Saving…" : "Save meeting"}
        </Button>
      </div>
    </form>
  );
}
