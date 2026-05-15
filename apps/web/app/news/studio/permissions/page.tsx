"use client";

import { FormEvent, useEffect, useState } from "react";
import {
  formatNewsHttpError,
  useNewsroomMe,
  type NewsroomPublisher,
} from "@/lib/newsApi";

export default function NewsStudioPermissionsPage() {
  const { me, authedFetch, reload } = useNewsroomMe();
  const [publishers, setPublishers] = useState<NewsroomPublisher[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [email, setEmail] = useState("");
  const [canManage, setCanManage] = useState(false);
  const [busy, setBusy] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);

  const loadPublishers = async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await authedFetch("/api/news/publishers");
      if (!res.ok) {
        setError(await formatNewsHttpError(res));
        return;
      }
      const data = (await res.json()) as { publishers: NewsroomPublisher[] };
      setPublishers(data.publishers ?? []);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Could not load publishers.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (me?.can_manage_permissions) {
      void loadPublishers();
    } else {
      setLoading(false);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [me?.can_manage_permissions]);

  async function handleGrant(e: FormEvent) {
    e.preventDefault();
    setBusy(true);
    setFormError(null);
    try {
      const res = await authedFetch("/api/news/publishers", {
        method: "POST",
        body: JSON.stringify({
          email: email.trim(),
          can_publish: true,
          can_manage_permissions: canManage,
        }),
      });
      if (!res.ok) {
        setFormError(await formatNewsHttpError(res));
        return;
      }
      setEmail("");
      setCanManage(false);
      await loadPublishers();
      await reload();
    } catch (err) {
      setFormError(err instanceof Error ? err.message : "Could not grant access.");
    } finally {
      setBusy(false);
    }
  }

  async function handleRevoke(accessId: string) {
    if (!confirm("Revoke this user's newsroom access?")) return;
    const res = await authedFetch(`/api/news/publishers/${accessId}`, {
      method: "DELETE",
    });
    if (!res.ok) {
      alert(await formatNewsHttpError(res));
      return;
    }
    await loadPublishers();
    await reload();
  }

  if (!me?.can_manage_permissions) {
    return (
      <p className="text-sm text-foreground/70">
        You do not have permission to manage newsroom publishers.
      </p>
    );
  }

  return (
    <div className="max-w-2xl space-y-12">
      <section>
        <h2 className="text-lg font-semibold text-foreground">Grant access</h2>
        <p className="mt-2 text-sm text-foreground/70">
          The person must have signed in to Graft at least once so we can match
          their Clerk account by email.
        </p>
        <form onSubmit={handleGrant} className="mt-6 space-y-4">
          {formError ? (
            <p className="border border-red-500/40 bg-red-500/10 px-4 py-3 text-sm text-red-200">
              {formError}
            </p>
          ) : null}
          <label className="block">
            <span className="frame text-[0.62rem] text-foreground-muted">EMAIL</span>
            <input
              type="email"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="mt-2 w-full border border-border/60 bg-background px-4 py-3 text-sm text-foreground outline-none focus:border-amber/60"
              placeholder="colleague@winery.com"
            />
          </label>
          <label className="flex items-center gap-3 text-sm text-foreground/80">
            <input
              type="checkbox"
              checked={canManage}
              onChange={(e) => setCanManage(e.target.checked)}
              className="size-4 accent-amber"
            />
            Can manage permissions (grant access for others)
          </label>
          <button
            type="submit"
            disabled={busy}
            className="frame border border-amber/50 bg-amber/15 px-6 py-3 text-[0.68rem] font-semibold text-amber hover:bg-amber/25 disabled:opacity-50"
          >
            {busy ? "Granting…" : "Grant publish access"}
          </button>
        </form>
      </section>

      <section>
        <h2 className="text-lg font-semibold text-foreground">Publishers</h2>
        {loading ? (
          <p className="mt-4 text-sm text-foreground/60">Loading…</p>
        ) : error ? (
          <p className="mt-4 text-sm text-red-300/90">{error}</p>
        ) : publishers.length === 0 ? (
          <p className="mt-4 text-sm text-foreground/60">No publishers yet.</p>
        ) : (
          <ul className="mt-6 divide-y divide-border/40 border border-border/40">
            {publishers.map((row) => (
              <li
                key={row.id}
                className="flex flex-col gap-3 px-5 py-4 sm:flex-row sm:items-center sm:justify-between"
              >
                <div>
                  <p className="font-medium text-foreground">
                    {row.user.name || row.user.email}
                  </p>
                  <p className="text-xs text-foreground-muted">{row.user.email}</p>
                  <p className="mt-2 text-xs text-foreground/60">
                    {row.can_manage_permissions
                      ? "Publish + manage permissions"
                      : "Publish only"}
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => void handleRevoke(row.id)}
                  className="frame shrink-0 text-[0.68rem] font-semibold text-red-300/90 hover:text-red-200"
                >
                  Revoke
                </button>
              </li>
            ))}
          </ul>
        )}
      </section>

      {me.is_bootstrap_admin ? (
        <p className="text-xs text-foreground-muted">
          You are a bootstrap newsroom admin (via NEWSROOM_ADMIN_CLERK_IDS). You
          can manage permissions without a database row.
        </p>
      ) : null}
    </div>
  );
}
