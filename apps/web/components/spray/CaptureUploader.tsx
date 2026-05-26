/**
 * CaptureUploader — drag-drop / file-pick photo upload (M1-09 step 8).
 *
 * Per-file flow:
 *   1. POST /captures/init -> {capture, upload: {url, fields}}
 *   2. POST upload.url with FormData (file + signed fields) -> S3 returns 204
 *   3. POST /captures/<id>/finalize -> Capture in `uploaded` state
 *
 * No ML inference at M1-09; uploads sit in the bucket until M1-10 wires
 * the cloud classifier.
 */
"use client";

import { useState, useRef, type ChangeEvent, type DragEvent } from "react";
import { useAuth } from "@clerk/nextjs";

const ACCEPTED = "image/jpeg,image/heic,image/heif";
const MAX_BYTES = 25 * 1024 * 1024;

export type UploadedCapture = {
  id: string;
  block_id: string;
  kind: string;
  status: string;
  download_url: string | null;
};

type Item = {
  file: File;
  progress: number;
  state: "queued" | "init" | "putting" | "finalizing" | "done" | "error";
  error?: string;
  capture?: UploadedCapture;
};

type Props = {
  orgId: string;
  blockId: string;
  onCaptureUploaded: (c: UploadedCapture) => void;
};

export function CaptureUploader({ orgId, blockId, onCaptureUploaded }: Props) {
  const { getToken } = useAuth();
  const [items, setItems] = useState<Item[]>([]);
  const [dragOver, setDragOver] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  async function authedFetch(path: string, init?: RequestInit) {
    const token = await getToken();
    return fetch(path, {
      ...init,
      headers: {
        ...(init?.headers ?? {}),
        Authorization: `Bearer ${token}`,
      },
    });
  }

  async function uploadOne(idx: number, file: File) {
    function update(patch: Partial<Item>) {
      setItems((prev) => prev.map((it, i) => (i === idx ? { ...it, ...patch } : it)));
    }

    if (file.size > MAX_BYTES) {
      update({ state: "error", error: "file > 25 MB" });
      return;
    }

    update({ state: "init" });
    const initRes = await authedFetch(
      `/api/spray/orgs/${orgId}/blocks/${blockId}/captures/init`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          kind: "photo",
          mime_type: file.type || "image/jpeg",
          size_bytes: file.size,
        }),
      }
    );
    if (!initRes.ok) {
      const errJson = await initRes.json().catch(() => ({}));
      update({
        state: "error",
        error: `init failed: ${errJson.detail || initRes.status}`,
      });
      return;
    }
    const { capture, upload } = await initRes.json();

    update({ state: "putting" });
    const fd = new FormData();
    // S3 requires the file field to be LAST in the form data
    for (const [k, v] of Object.entries(upload.fields)) {
      fd.append(k, v as string);
    }
    fd.append("file", file);

    const putRes = await new Promise<{ ok: boolean; status: number; detail?: string }>(
      (resolve) => {
        const xhr = new XMLHttpRequest();
        xhr.upload.addEventListener("progress", (e) => {
          if (e.lengthComputable) {
            update({ progress: Math.round((e.loaded / e.total) * 100) });
          }
        });
        xhr.addEventListener("load", () => {
          if (xhr.status >= 200 && xhr.status < 300) {
            resolve({ ok: true, status: xhr.status });
          } else {
            let detail = "";
            try {
              // Try to parse error from local_upload or S3
              detail = xhr.responseText.slice(0, 100);
            } catch {
              /* ignore */
            }
            resolve({ ok: false, status: xhr.status, detail });
          }
        });
        xhr.addEventListener("error", () => resolve({ ok: false, status: 0 }));
        xhr.open("POST", upload.url);
        xhr.send(fd);
      },
    );
    if (!putRes.ok) {
      update({
        state: "error",
        error: `upload failed (${putRes.status}) ${putRes.detail || ""}`,
      });
      return;
    }

    update({ state: "finalizing", progress: 100 });
    const finRes = await authedFetch(`/api/spray/orgs/${orgId}/captures/${capture.id}/finalize`, {
      method: "POST",
    });
    if (!finRes.ok) {
      const errJson = await finRes.json().catch(() => ({}));
      update({
        state: "error",
        error: `finalize failed: ${errJson.detail || finRes.status}`,
      });
      return;
    }
    const final: UploadedCapture = await finRes.json();
    update({ state: "done", capture: final });
    onCaptureUploaded(final);
  }

  function ingest(files: FileList | File[]) {
    const list = Array.from(files).slice(0, 10); // up to 10 per spec §8.5
    const start = items.length;
    setItems((prev) => [
      ...prev,
      ...list.map<Item>((f) => ({ file: f, progress: 0, state: "queued" })),
    ]);
    list.forEach((f, i) => uploadOne(start + i, f));
  }

  return (
    <div className="mt-6">
      <label
        onDragOver={(e: DragEvent<HTMLLabelElement>) => {
          e.preventDefault();
          setDragOver(true);
        }}
        onDragLeave={() => setDragOver(false)}
        onDrop={(e: DragEvent<HTMLLabelElement>) => {
          e.preventDefault();
          setDragOver(false);
          if (e.dataTransfer?.files?.length) ingest(e.dataTransfer.files);
        }}
        className={`block cursor-pointer rounded-md border-2 border-dashed p-5 text-center text-xs transition-colors ${
          dragOver
            ? "border-amber bg-amber/10 text-amber"
            : "border-border/60 text-foreground/60 hover:border-amber/60 hover:text-amber"
        }`}
      >
        <span className="frame font-semibold uppercase tracking-wider">
          Drop photos or click to upload
        </span>
        <p className="mt-2 text-[0.65rem] text-foreground/50">
          JPEG / HEIC. Max 25 MB. Up to 10 at once.
        </p>
        <input
          ref={fileInputRef}
          type="file"
          multiple
          accept={ACCEPTED}
          className="hidden"
          onChange={(e: ChangeEvent<HTMLInputElement>) => {
            if (e.target.files) ingest(e.target.files);
            e.target.value = "";
          }}
        />
      </label>

      {items.length > 0 && (
        <ul className="mt-3 space-y-2">
          {items.map((it, i) => (
            <li
              key={i}
              className="flex items-center justify-between rounded-md border border-border/40 bg-background/40 px-3 py-2 text-xs"
            >
              <span className="truncate">{it.file.name}</span>
              <span className="ml-3 shrink-0 text-foreground/50">
                {it.state === "error"
                  ? `❌ ${it.error}`
                  : it.state === "done"
                    ? "✓ uploaded"
                    : it.state === "putting"
                      ? `${it.progress}%`
                      : it.state}
              </span>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
