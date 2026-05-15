/**
 * Capture detail — metadata, preview, archive (M1-09 pilot shell).
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
  download_url: string | null;
  created_at: string;
};

export default function CaptureDetailPage() {
  const params = useParams<{ capture_id: string }>();
  const captureId = params.capture_id;
  const router = useRouter();
  const { org, loading: orgLoading, authedFetch } = useActiveOrg();
  const [capture, setCapture] = useState<CaptureDetail | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

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
    setCapture((await res.json()) as CaptureDetail);
  }, [authedFetch, org, captureId]);

  useEffect(() => {
    if (!orgLoading && org) void load();
  }, [org, orgLoading, load]);

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
        <article className="mt-6 space-y-4">
          <header>
            <h1 className="font-display text-2xl">Capture</h1>
            <p className="mt-1 text-sm text-foreground/60">
              {capture.vineyard_name && capture.block_name
                ? `${capture.vineyard_name} · ${capture.block_name}`
                : `Block ${capture.block_id.slice(0, 8)}…`}
            </p>
          </header>

          <dl className="grid gap-2 text-sm text-foreground/70 md:grid-cols-2">
            <div>
              <dt className="text-foreground/50">Status</dt>
              <dd>{capture.status}</dd>
            </div>
            <div>
              <dt className="text-foreground/50">Kind</dt>
              <dd>{capture.kind}</dd>
            </div>
            <div>
              <dt className="text-foreground/50">Uploaded</dt>
              <dd>{capture.uploaded_at ?? capture.created_at}</dd>
            </div>
            <div>
              <dt className="text-foreground/50">Analysis</dt>
              <dd>
                {capture.status === "uploaded"
                  ? "Photo received. Analysis results appear in your block's recommendation once processed."
                  : "Awaiting upload — no analysis available yet."}
              </dd>
            </div>
          </dl>

          {capture.download_url ? (
            /* eslint-disable-next-line @next/next/no-img-element */
            <img
              src={capture.download_url}
              alt=""
              className="mt-4 max-h-[70vh] w-auto rounded-md border border-border/40"
            />
          ) : (
            <p className="mt-4 text-sm text-foreground/50">No preview URL for this status.</p>
          )}

          <div className="flex flex-wrap gap-3">
            <button
              type="button"
              disabled={busy}
              onClick={() => void archive()}
              className="rounded-md border border-red-500/40 px-4 py-2 frame text-xs font-semibold text-red-300 transition-colors hover:border-red-500 disabled:opacity-40"
            >
              Archive
            </button>
          </div>
        </article>
      )}
    </div>
  );
}
