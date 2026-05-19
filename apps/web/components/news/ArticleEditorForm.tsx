"use client";

import { useRef, useState } from "react";
import Link from "next/link";
import { NewsImageInsertDialog } from "@/components/news/NewsImageInsertDialog";
import { formatImageBlock } from "@/lib/newsBody";
import { type NewsArticle, useNewsImageUpload } from "@/lib/newsApi";

type ArticleEditorFormProps = {
  initial?: Partial<NewsArticle>;
  submitLabel: string;
  onSubmit: (payload: {
    title: string;
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
  const [excerpt, setExcerpt] = useState(initial?.excerpt ?? "");
  const [body, setBody] = useState(initial?.body ?? "");
  const [status, setStatus] = useState<"draft" | "published">(
    initial?.status ?? "draft",
  );
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [uploading, setUploading] = useState(false);
  const [pendingImage, setPendingImage] = useState<{
    url: string;
    defaultAlt: string;
  } | null>(null);

  const fileInputRef = useRef<HTMLInputElement>(null);
  const uploadImage = useNewsImageUpload();

  async function handleImageUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;

    setUploading(true);
    setError(null);
    try {
      const { image } = await uploadImage(file);
      const baseName = file.name.replace(/\.[^.]+$/, "") || "Image";
      setPendingImage({ url: image, defaultAlt: baseName });
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not upload image.");
    } finally {
      setUploading(false);
      if (fileInputRef.current) fileInputRef.current.value = "";
    }
  }

  function handleImageInsertConfirm(alt: string, caption: string) {
    if (!pendingImage) return;
    setBody(
      (prev) =>
        prev +
        formatImageBlock({
          alt,
          url: pendingImage.url,
          caption: caption || undefined,
        }),
    );
    setPendingImage(null);
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    setError(null);
    try {
      await onSubmit({
        title: title.trim(),
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
    <>
      {pendingImage ? (
        <NewsImageInsertDialog
          defaultAlt={pendingImage.defaultAlt}
          onConfirm={handleImageInsertConfirm}
          onClose={() => setPendingImage(null)}
        />
      ) : null}
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
        <div className="mt-2 flex items-center justify-between">
          <p className="text-xs text-foreground-muted">
            Separate paragraphs with a blank line. Image captions appear on the
            line after the photo as{" "}
            <span className="font-mono text-foreground/50">::caption:: …</span>.
          </p>
          <button
            type="button"
            disabled={uploading || busy}
            onClick={() => fileInputRef.current?.click()}
            className="frame text-[0.62rem] font-semibold text-amber hover:text-amber-300 disabled:opacity-50"
          >
            {uploading ? "UPLOADING..." : "INSERT IMAGE"}
          </button>
          <input
            type="file"
            ref={fileInputRef}
            onChange={handleImageUpload}
            accept="image/*"
            className="hidden"
          />
        </div>
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
    </>
  );
}
