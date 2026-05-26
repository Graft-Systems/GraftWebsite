"use client";

import { useState, useTransition } from "react";

import { simulateWisprNoteAction } from "@/app/admin/actions/wispr";
import { Button } from "@/components/admin/ui/button";
import { Label } from "@/components/admin/ui/label";
import { Textarea } from "@/components/admin/ui/textarea";
import { VoiceRecorder } from "@/components/admin/voice/voice-recorder";

export function WisprCaptureForm() {
  const [transcript, setTranscript] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  function handleSubmit() {
    if (!transcript.trim()) {
      setError("Add or dictate a note before saving.");
      return;
    }
    setError(null);

    const form = new FormData();
    form.append("rawText", transcript.trim());

    startTransition(async () => {
      try {
        await simulateWisprNoteAction(form);
        setTranscript("");
      } catch (submitError) {
        setError(
          submitError instanceof Error
            ? submitError.message
            : "Could not save that note.",
        );
      }
    });
  }

  return (
    <div className="space-y-3">
      <VoiceRecorder
        onTranscript={(text) =>
          setTranscript((prev) => (prev.trim() ? `${prev.trim()} ${text}` : text))
        }
        hint="Dictate now to drop a note in the inbox. Audio is sent to Groq Whisper and not stored."
      />
      <div className="space-y-2">
        <Label htmlFor="wispr-capture-text">Note text</Label>
        <Textarea
          id="wispr-capture-text"
          value={transcript}
          onChange={(event) => setTranscript(event.target.value)}
          rows={5}
          placeholder="Speak or paste a note. AI will structure it and route it to a company on review."
        />
      </div>
      <div className="flex flex-wrap items-center gap-2">
        <Button type="button" onClick={handleSubmit} disabled={isPending} size="sm">
          {isPending ? "Saving…" : "Add to inbox"}
        </Button>
        {transcript.trim() ? (
          <Button type="button" variant="ghost" size="sm" onClick={() => setTranscript("")}>
            Clear
          </Button>
        ) : null}
      </div>
      {error ? <p className="text-sm text-destructive">{error}</p> : null}
    </div>
  );
}
