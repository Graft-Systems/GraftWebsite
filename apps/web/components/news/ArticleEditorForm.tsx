"use client";

import { useState } from "react";
import Link from "next/link";
import type { NewsArticle } from "@/lib/newsApi";

type ArticleEditorFormProps = {
  initial?: Partial<NewsArticle>;
  submitLabel: string;
  onSubmit: (payload: {
    title: string;
    slug: string;
    excerpt: string;
    body: string;
    status: "draft" | "published";
  }) => Promise<void>;
  onDelete?: () => Promise<void>;
};

const inputClass =
  "mt-2 w-full border border-border/60 bg-background px-4 py-3 text-sm text-foreground outline-none transition-colors focus:border-amber/60";

export function ArticleEditorForm({
  initial,
  submitLabel,
  onSubmit,
  onDelete,
}: ArticleEditorFormProps) {
  const [title, setTitle] = useState(initial?.title ?? "");
  const [slug, setSlug] = useState(initial?.slug ?? "");
  const [excerpt, setExcerpt] = useState(initial?.excerpt ?? "");
  const [body, setBody] = useState(initial?.body ?? "");
  const [status, setStatus] = useState<"draft" | "published">(
    initial?.status ?? "draft",
  );
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    setError(null);
    try {
      await onSubmit({
        title: title.trim(),
        slug: slug.trim(),
        excerpt: excerpt.trim(),
        body: body.trim(),
        status,
      });
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not save article.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <form onSubmit={handleSubmit} className="max-w-2xl space-y-8">
      {error ? (
        <p className="border border-red-500/40 bg-red-500/10 px-4 py-3 text-sm text-red-200">
          {error}
        </p>
      ) : null}

      <label className="block">
        <span className="frame text-[0.62rem] text-foreground-muted">TITLE</span>
        <input
          className={inputClass}
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          required
          maxLength={300}
        />
      </label>

      <label className="block">
        <span className="frame text-[0.62rem] text-foreground-muted">
          SLUG (optional)
        </span>
        <input
          className={inputClass}
          value={slug}
          onChange={(e) => setSlug(e.target.value)}
          placeholder="auto-generated-from-title"
          maxLength={220}
        />
      </label>

      <label className="block">
        <span className="frame text-[0.62rem] text-foreground-muted">EXCERPT</span>
        <textarea
          className={`${inputClass} min-h-[80px] resize-y`}
          value={excerpt}
          onChange={(e) => setExcerpt(e.target.value)}
          maxLength={2000}
        />
      </label>

      <label className="block">
        <span className="frame text-[0.62rem] text-foreground-muted">BODY</span>
        <textarea
          className={`${inputClass} min-h-[280px] resize-y font-mono text-[0.85rem]`}
          value={body}
          onChange={(e) => setBody(e.target.value)}
          required
        />
        <p className="mt-2 text-xs text-foreground-muted">
          Separate paragraphs with a blank line.
        </p>
      </label>

      <label className="block">
        <span className="frame text-[0.62rem] text-foreground-muted">STATUS</span>
        <select
          className={inputClass}
          value={status}
          onChange={(e) => setStatus(e.target.value as "draft" | "published")}
        >
          <option value="draft">Draft</option>
          <option value="published">Published</option>
        </select>
      </label>

      <div className="flex flex-wrap items-center gap-4 pt-2">
        <button
          type="submit"
          disabled={busy}
          className="frame border border-amber/50 bg-amber/15 px-6 py-3 text-[0.68rem] font-semibold text-amber transition-colors hover:bg-amber/25 disabled:opacity-50"
        >
          {busy ? "Saving…" : submitLabel}
        </button>
        <Link
          href="/news/studio"
          className="frame text-[0.68rem] font-semibold text-foreground/70 hover:text-foreground"
        >
          Cancel
        </Link>
        {onDelete ? (
          <button
            type="button"
            disabled={busy}
            onClick={() => void onDelete()}
            className="frame ml-auto text-[0.68rem] font-semibold text-red-300/90 hover:text-red-200 disabled:opacity-50"
          >
            Delete article
          </button>
        ) : null}
      </div>
    </form>
  );
}
