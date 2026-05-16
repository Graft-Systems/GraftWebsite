"use client";

import { Loader2, Mic, Square } from "lucide-react";
import { useEffect, useRef, useState } from "react";

import { Button } from "@/components/admin/ui/button";
import { cn } from "@/lib/admin/utils";

type VoiceRecorderProps = {
  onTranscript: (newText: string) => void;
  className?: string;
  hint?: string;
};

type RecorderState = "idle" | "recording" | "transcribing" | "error";

function formatElapsed(ms: number) {
  const totalSeconds = Math.floor(ms / 1000);
  const minutes = Math.floor(totalSeconds / 60);
  const seconds = totalSeconds % 60;
  return `${minutes}:${seconds.toString().padStart(2, "0")}`;
}

function pickMimeType() {
  if (typeof MediaRecorder === "undefined") return undefined;
  const candidates = [
    "audio/webm;codecs=opus",
    "audio/webm",
    "audio/ogg;codecs=opus",
    "audio/mp4",
  ];
  return candidates.find((type) => MediaRecorder.isTypeSupported(type));
}

export function VoiceRecorder({ onTranscript, className, hint }: VoiceRecorderProps) {
  const recorderRef = useRef<MediaRecorder | null>(null);
  const chunksRef = useRef<Blob[]>([]);
  const streamRef = useRef<MediaStream | null>(null);
  const startedAtRef = useRef<number | null>(null);

  const [supported, setSupported] = useState(false);
  const [state, setState] = useState<RecorderState>("idle");
  const [elapsed, setElapsed] = useState(0);
  const [error, setError] = useState<string | null>(null);
  const [lastTranscript, setLastTranscript] = useState<string>("");
  const [lastModel, setLastModel] = useState<string>("");
  const [lastLatencyMs, setLastLatencyMs] = useState<number | null>(null);
  const [lastDurationMs, setLastDurationMs] = useState<number | null>(null);

  useEffect(() => {
    setSupported(
      typeof window !== "undefined" &&
        Boolean(navigator.mediaDevices?.getUserMedia) &&
        typeof MediaRecorder !== "undefined",
    );
  }, []);

  useEffect(() => {
    if (state !== "recording") return;
    const interval = window.setInterval(() => {
      if (startedAtRef.current !== null) {
        setElapsed(Date.now() - startedAtRef.current);
      }
    }, 250);
    return () => window.clearInterval(interval);
  }, [state]);

  useEffect(() => {
    return () => {
      stopTracks();
    };
  }, []);

  function stopTracks() {
    streamRef.current?.getTracks().forEach((track) => track.stop());
    streamRef.current = null;
  }

  async function transcribeBlob(blob: Blob, mimeType: string | undefined) {
    const form = new FormData();
    const extension = mimeType?.includes("mp4") ? "mp4" : mimeType?.includes("ogg") ? "ogg" : "webm";
    form.append("audio", blob, `recording.${extension}`);

    const start = performance.now();
    const response = await fetch("/api/transcribe", {
      method: "POST",
      body: form,
    });
    const latencyMs = Math.round(performance.now() - start);

    if (!response.ok) {
      const data = (await response.json().catch(() => null)) as { error?: string } | null;
      throw new Error(data?.error ?? `Transcription failed (${response.status}).`);
    }

    const data = (await response.json()) as { transcript?: string; model?: string };
    return {
      transcript: data.transcript?.trim() ?? "",
      model: data.model ?? "",
      latencyMs,
    };
  }

  async function handleStart() {
    setError(null);
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      streamRef.current = stream;

      const mimeType = pickMimeType();
      const recorder = mimeType ? new MediaRecorder(stream, { mimeType }) : new MediaRecorder(stream);
      recorderRef.current = recorder;
      chunksRef.current = [];

      recorder.ondataavailable = (event) => {
        if (event.data && event.data.size > 0) {
          chunksRef.current.push(event.data);
        }
      };

      recorder.onstop = async () => {
        const collectedMime = recorder.mimeType || mimeType;
        const blob = new Blob(chunksRef.current, { type: collectedMime || "audio/webm" });
        const audioDurationMs = startedAtRef.current ? Date.now() - startedAtRef.current : null;
        chunksRef.current = [];
        stopTracks();

        if (blob.size === 0) {
          setState("idle");
          return;
        }

        setState("transcribing");
        try {
          const { transcript, model, latencyMs } = await transcribeBlob(blob, collectedMime);
          if (transcript) {
            setLastTranscript(transcript);
            setLastModel(model);
            setLastLatencyMs(latencyMs);
            setLastDurationMs(audioDurationMs);
            onTranscript(transcript);
          }
          setState("idle");
        } catch (transcribeError) {
          setError(
            transcribeError instanceof Error
              ? transcribeError.message
              : "Could not transcribe that recording.",
          );
          setState("error");
        }
      };

      startedAtRef.current = Date.now();
      setElapsed(0);
      setState("recording");
      recorder.start();
    } catch (startError) {
      stopTracks();
      setError(
        startError instanceof Error
          ? startError.message
          : "Could not access the microphone.",
      );
      setState("error");
    }
  }

  function handleStop() {
    const recorder = recorderRef.current;
    if (recorder && recorder.state !== "inactive") {
      recorder.stop();
    }
  }

  function handleReset() {
    setLastTranscript("");
    setLastModel("");
    setLastLatencyMs(null);
    setLastDurationMs(null);
    setError(null);
    setState("idle");
  }

  if (!supported) {
    return (
      <div className={cn("rounded-lg border bg-muted/30 p-4 text-sm text-muted-foreground", className)}>
        Voice capture needs a microphone and a modern browser. Use paste instead, or try Chrome/Edge.
      </div>
    );
  }

  return (
    <div className={cn("space-y-3 rounded-lg border bg-muted/20 p-4", className)}>
      <div className="flex flex-wrap items-center gap-3">
        {state === "recording" ? (
          <Button type="button" onClick={handleStop} variant="destructive" size="sm">
            <Square className="size-4" />
            Stop
          </Button>
        ) : state === "transcribing" ? (
          <Button type="button" size="sm" disabled>
            <Loader2 className="size-4 animate-spin" />
            Transcribing
          </Button>
        ) : (
          <Button type="button" onClick={handleStart} size="sm">
            <Mic className="size-4" />
            {lastTranscript ? "Record another" : "Start recording"}
          </Button>
        )}

        {state === "recording" ? (
          <div className="flex items-center gap-2 text-sm font-medium">
            <span className="relative flex size-2.5">
              <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-red-500 opacity-75" />
              <span className="relative inline-flex size-2.5 rounded-full bg-red-500" />
            </span>
            Recording {formatElapsed(elapsed)}
          </div>
        ) : null}

        {state === "transcribing" ? (
          <p className="text-sm text-muted-foreground">Sending to Groq Whisper…</p>
        ) : null}

        {lastTranscript && state === "idle" ? (
          <Button type="button" onClick={handleReset} variant="ghost" size="sm">
            Dismiss
          </Button>
        ) : null}
      </div>

      {lastTranscript && state === "idle" ? (
        <div className="rounded-md border bg-background p-3 text-sm">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
              Last transcript
            </p>
            <div className="flex flex-wrap items-center gap-2 text-[10px] uppercase tracking-wide text-muted-foreground">
              {lastModel ? (
                <span className="rounded-full border bg-muted/60 px-2 py-0.5 font-mono">
                  Groq · {lastModel}
                </span>
              ) : null}
              {lastDurationMs !== null ? (
                <span className="rounded-full border bg-muted/40 px-2 py-0.5">
                  Audio {formatElapsed(lastDurationMs)}
                </span>
              ) : null}
              {lastLatencyMs !== null ? (
                <span className="rounded-full border bg-muted/40 px-2 py-0.5">
                  STT {lastLatencyMs}ms
                </span>
              ) : null}
            </div>
          </div>
          <p className="mt-2 whitespace-pre-wrap">{lastTranscript}</p>
        </div>
      ) : null}

      {state === "error" && error ? (
        <p className="text-sm text-destructive">{error}</p>
      ) : (
        <p className="text-xs text-muted-foreground">
          {hint ?? "Audio is sent to Groq Whisper Large v3 Turbo. Recordings are not stored."}
        </p>
      )}
    </div>
  );
}
