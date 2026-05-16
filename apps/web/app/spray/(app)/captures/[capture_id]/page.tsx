/**
 * Capture detail — image preview, notes, metadata (M1-09 pilot shell).
 */
"use client";

import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import { useCallback, useEffect, useState } from "react";
import { useActiveOrg } from "@/lib/sprayApi";

type CaptureDetail = {
  id: string;
  block_id: string;
  block_name?: string;
  vineyard_name?: string;
  kind: string;
  size_bytes: number | null;
  mime_type: string;
  taken_at: string | null;
  uploaded_at: string | null;
  status: string;
  notes: string;
  download_url: string | null;
  created_at: string;
};

function formatCaptureWhen(iso: string | null): string {
  if (!iso) return "—";
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return iso;
  return d.toLocaleString(undefined, {
    dateStyle: "medium",
    timeStyle: "short",
  });
}

export default function CaptureDetailPage() {
  const params = useParams<{ capture_id: string }>();
  const captureId = params.capture_id;
  const router = useRouter();
  const { org, loading: orgLoading, authedFetch } = useActiveOrg();
  const [capture, setCapture] = useState<CaptureDetail | null>(null);
  const [notesDraft, setNotesDraft] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [notesError, setNotesError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [savingNotes, setSavingNotes] = useState(false);

  const load = useCallback(async () => {
    if (!org || !captureId) return;
    setError(null);
    const res = await authedFetch(
      `/api/spray/orgs/${org.id}/captures/${captureId}`,
    );
    if (!res.ok) {
      setError(`Could not load capture (${res.status}).`);
      setCapture(null);
      return;
    }
    const data = (await res.json()) as CaptureDetail;
    setCapture(data);
    setNotesDraft(data.notes ?? "");
  }, [authedFetch, org, captureId]);

  useEffect(() => {
    if (!orgLoading && org) void load();
  }, [org, orgLoading, load]);

  async function saveNotes() {
    if (!org || !captureId || !capture) return;
    const trimmed = notesDraft.trim();
    if (trimmed === (capture.notes ?? "").trim()) return;
    setSavingNotes(true);
    setNotesError(null);
    try {
      const res = await authedFetch(
        `/api/spray/orgs/${org.id}/captures/${captureId}`,
        {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ notes: trimmed }),
        },
      );
      if (!res.ok) {
        setNotesError(`Could not save notes (${res.status}).`);
        return;
      }
      const updated = (await res.json()) as CaptureDetail;
      setCapture(updated);
      setNotesDraft(updated.notes ?? "");
    } finally {
      setSavingNotes(false);
    }
  }

  async function archive() {
    if (!org || !captureId) return;
    if (!confirm("Archive this capture? It will disappear from lists.")) return;
    setBusy(true);
    try {
      const res = await authedFetch(
        `/api/spray/orgs/${org.id}/captures/${captureId}`,
        { method: "DELETE" },
      );
      if (!res.ok) {
        setError(`Archive failed (${res.status}).`);
        return;
      }
      router.push("/spray/captures");
    } finally {
      setBusy(false);
    }
  }

  const notesDirty =
    capture != null && notesDraft.trim() !== (capture.notes ?? "").trim();

  return (
    <div className="mx-auto max-w-4xl pb-24 md:pb-0">
      <Link
        href="/spray/captures"
        className="frame text-xs font-semibold text-foreground/60 transition-colors hover:text-amber"
      >
        ← Captures
      </Link>

      {error && (
        <p className="mt-4 rounded-md border border-red-500/50 bg-red-500/10 p-3 text-sm text-red-300">
          {error}
        </p>
      )}

      {!org && !orgLoading && (
        <p className="mt-8 text-sm text-foreground/60">Sign in and join an org to view captures.</p>
      )}

      {org && !capture && !error && (
        <div className="mt-8 h-48 animate-pulse rounded-md border border-border/40 bg-foreground/5" />
      )}

      {capture && (
        <article className="mt-6 space-y-6">
          <header>
            <h1 className="font-display text-2xl">Capture</h1>
            <p className="mt-1 text-sm text-foreground/60">
              {capture.vineyard_name && capture.block_name
                ? `${capture.vineyard_name} · ${capture.block_name}`
                : `Block ${capture.block_id.slice(0, 8)}…`}
            </p>
          </header>

          {capture.download_url ? (
            /* eslint-disable-next-line @next/next/no-img-element */
            <img
              src={capture.download_url}
              alt=""
              className="max-h-[70vh] w-auto rounded-md border border-border/40"
            />
          ) : (
            <p className="text-sm text-foreground/50">No preview URL for this status.</p>
          )}

          <section className="rounded-xl border border-border/40 bg-background/20 p-4">
            <h2 className="text-sm font-semibold text-foreground/80">Notes</h2>
            <p className="mt-1 text-xs text-foreground/50">
              Field observations for this capture — visible to your team.
            </p>
            <textarea
              value={notesDraft}
              onChange={(e) => setNotesDraft(e.target.value)}
              placeholder="e.g. powdery mildew on upper canopy, north-facing rows…"
              className="mt-3 min-h-28 w-full rounded-md border border-border/40 bg-background/60 px-3 py-2 text-sm text-foreground placeholder:text-foreground/35"
            />
            {notesError && (
              <p className="mt-2 text-xs text-red-300">{notesError}</p>
            )}
            <div className="mt-3 flex flex-wrap gap-3">
              <button
                type="button"
                disabled={savingNotes || !notesDirty}
                onClick={() => void saveNotes()}
                className="rounded-md bg-amber px-4 py-2 frame text-xs font-semibold text-background transition-colors hover:bg-amber/90 disabled:opacity-40"
              >
                {savingNotes ? "Saving…" : "Save notes"}
              </button>
            </div>
          </section>

          <dl className="grid gap-4 border-t border-border/30 pt-4 text-sm text-foreground/70 md:grid-cols-2">
            <div>
              <dt className="text-foreground/50">Status</dt>
              <dd className="mt-0.5 capitalize">{capture.status}</dd>
            </div>
            <div>
              <dt className="text-foreground/50">Kind</dt>
              <dd className="mt-0.5 capitalize">{capture.kind}</dd>
            </div>
            <div>
              <dt className="text-foreground/50">Uploaded</dt>
              <dd className="mt-0.5">{formatCaptureWhen(capture.uploaded_at ?? capture.created_at)}</dd>
            </div>
            {capture.taken_at && (
              <div>
                <dt className="text-foreground/50">Taken</dt>
                <dd className="mt-0.5">{formatCaptureWhen(capture.taken_at)}</dd>
              </div>
            )}
          </dl>

          <div className="flex flex-wrap gap-3 border-t border-border/30 pt-4">
            <button
              type="button"
              disabled={busy}
              onClick={() => void archive()}
              className="rounded-md border border-red-500/40 px-4 py-2 frame text-xs font-semibold text-red-300 transition-colors hover:border-red-500 disabled:opacity-40"
            >
              Delete
            </button>
          </div>
        </article>
      )}
    </div>
  );
}
