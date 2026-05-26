"use client";

import Link from "next/link";
import { useState, useTransition } from "react";

import { createGoogleScheduledMeetingAction } from "@/app/admin/actions/calendar";
import { Button, buttonVariants } from "@/components/admin/ui/button";
import { Input } from "@/components/admin/ui/input";
import { Label } from "@/components/admin/ui/label";
import { Textarea } from "@/components/admin/ui/textarea";
import { cn } from "@/lib/admin/utils";

type GoogleScheduleMeetingFormProps = {
  currentUserId: string;
  teammates: Array<{ id: string; name: string | null; email: string }>;
  companies: Array<{ id: string; name: string }>;
  googleConnected: boolean;
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

export function GoogleScheduleMeetingForm({
  currentUserId,
  teammates,
  companies,
  googleConnected,
}: GoogleScheduleMeetingFormProps) {
  const invitees = teammates.filter((u) => u.id !== currentUserId);
  const [open, setOpen] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  function onSubmit(formData: FormData) {
    setError(null);
    startTransition(async () => {
      try {
        await createGoogleScheduledMeetingAction(formData);
        setOpen(false);
      } catch (cause) {
        setError(cause instanceof Error ? cause.message : "Could not create meeting.");
      }
    });
  }

  if (!googleConnected) {
    return (
      <div className="rounded-xl border border-dashed bg-muted/30 p-4">
        <p className="text-sm font-medium">Schedule with Google Calendar</p>
        <p className="mt-1 text-xs text-muted-foreground">
          Connect Google in Settings to create meetings and send calendar invites to teammates. Invites use
          each person&apos;s login email — they should match their Google account to appear on their calendar.
        </p>
        <Link
          href="/admin/settings"
          className={buttonVariants({ variant: "outline", size: "sm", className: "mt-3 inline-flex" })}
        >
          Open Settings
        </Link>
      </div>
    );
  }

  if (invitees.length === 0) {
    return (
      <div className="rounded-xl border border-dashed bg-muted/30 p-4">
        <p className="text-sm font-medium">Schedule with Google Calendar</p>
        <p className="mt-1 text-xs text-muted-foreground">
          Add teammates to this workspace to invite them to Google Calendar meetings.
        </p>
      </div>
    );
  }

  if (!open) {
    return (
      <div className="flex flex-col gap-3 rounded-xl border bg-background p-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <p className="text-sm font-medium">Schedule with Google Calendar</p>
          <p className="text-xs text-muted-foreground">
            Creates the event on your Google calendar and emails invites to teammates you select.
          </p>
        </div>
        <Button type="button" onClick={() => setOpen(true)}>
          New Google meeting
        </Button>
      </div>
    );
  }

  return (
    <form action={onSubmit} className="space-y-4 rounded-xl border bg-background p-4">
      <div className="flex items-center justify-between gap-2">
        <h3 className="text-sm font-semibold">Google Calendar meeting</h3>
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
          <Label htmlFor="gcal-title">Title</Label>
          <Input id="gcal-title" name="title" required placeholder="Weekly sync" />
        </div>

        <div className="space-y-2">
          <Label htmlFor="gcal-startsAt">Starts</Label>
          <Input
            id="gcal-startsAt"
            name="startsAt"
            type="datetime-local"
            defaultValue={defaultStart()}
            required
          />
        </div>
        <div className="space-y-2">
          <Label htmlFor="gcal-endsAt">Ends</Label>
          <Input id="gcal-endsAt" name="endsAt" type="datetime-local" />
        </div>

        <div className="space-y-2 md:col-span-2">
          <Label>Invite teammates</Label>
          <p className="text-xs text-muted-foreground">
            Checked people receive a Google Calendar invitation at their workspace email.
          </p>
          <ul className="mt-2 max-h-40 space-y-2 overflow-y-auto rounded-md border p-3">
            {invitees.map((person) => (
              <li key={person.id} className="flex items-center gap-2 text-sm">
                <input
                  type="checkbox"
                  id={`gcal-inv-${person.id}`}
                  name="attendeeIds"
                  value={person.id}
                  className="size-4 rounded border-input"
                />
                <label htmlFor={`gcal-inv-${person.id}`} className="cursor-pointer">
                  {person.name ?? person.email}
                  <span className="ml-1 text-muted-foreground">({person.email})</span>
                </label>
              </li>
            ))}
          </ul>
        </div>

        <div className="space-y-2">
          <Label htmlFor="gcal-location">Location</Label>
          <Input id="gcal-location" name="location" placeholder="Conference room / Zoom" />
        </div>
        <div className="space-y-2">
          <Label htmlFor="gcal-meetingUrl">Meeting link</Label>
          <Input id="gcal-meetingUrl" name="meetingUrl" type="url" placeholder="https://" />
        </div>

        <div className="space-y-2 md:col-span-2">
          <Label htmlFor="gcal-companyId">Link to company (optional)</Label>
          <select id="gcal-companyId" name="companyId" defaultValue="" className={selectClass}>
            <option value="">Don&apos;t link yet</option>
            {companies.map((company) => (
              <option key={company.id} value={company.id}>
                {company.name}
              </option>
            ))}
          </select>
        </div>

        <div className="space-y-2 md:col-span-2">
          <Label htmlFor="gcal-description">Description</Label>
          <Textarea id="gcal-description" name="description" rows={3} placeholder="Agenda, prep links…" />
        </div>
      </div>

      {error ? <p className="text-sm text-destructive">{error}</p> : null}

      <div className="flex justify-end">
        <Button type="submit" disabled={pending}>
          {pending ? "Sending invites…" : "Create meeting & send invites"}
        </Button>
      </div>
    </form>
  );
}
