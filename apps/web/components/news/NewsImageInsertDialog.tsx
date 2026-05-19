"use client";

import { useState } from "react";

const inputClass =
  "mt-2 w-full border border-border/60 bg-background px-4 py-3 text-sm text-foreground outline-none transition-colors focus:border-amber/60";

export function NewsImageInsertDialog({
  defaultAlt,
  onConfirm,
  onClose,
}: {
  defaultAlt: string;
  onConfirm: (alt: string, caption: string) => void;
  onClose: () => void;
}) {
  const [alt, setAlt] = useState(defaultAlt);
  const [caption, setCaption] = useState("");

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="news-image-insert-title"
      onClick={onClose}
      className="fixed inset-0 z-50 flex items-center justify-center bg-background/80 px-4"
    >
      <div
        onClick={(e) => e.stopPropagation()}
        className="w-full max-w-md border border-border/40 bg-background p-6"
      >
        <h2
          id="news-image-insert-title"
          className="display text-xl text-foreground"
        >
          Image details
        </h2>
        <p className="mt-2 text-sm text-foreground/60">
          Alt text helps accessibility. The caption appears below the photo on
          the published article.
        </p>

        <div className="mt-6 space-y-5">
          <label className="block">
            <span className="frame text-[0.62rem] text-foreground-muted">
              ALT TEXT
            </span>
            <input
              className={inputClass}
              value={alt}
              onChange={(e) => setAlt(e.target.value)}
              required
              maxLength={300}
              autoFocus
            />
          </label>

          <label className="block">
            <span className="frame text-[0.62rem] text-foreground-muted">
              CAPTION (OPTIONAL)
            </span>
            <textarea
              className={`${inputClass} min-h-[72px] resize-y`}
              value={caption}
              onChange={(e) => setCaption(e.target.value)}
              maxLength={500}
              placeholder="Photo credit or description shown under the image"
            />
          </label>
        </div>

        <div className="mt-8 flex flex-wrap gap-3">
          <button
            type="button"
            onClick={() => onConfirm(alt, caption)}
            className="frame border border-amber/50 bg-amber/15 px-5 py-2.5 text-[0.68rem] font-semibold text-amber hover:bg-amber/25"
          >
            INSERT IMAGE
          </button>
          <button
            type="button"
            onClick={onClose}
            className="frame px-5 py-2.5 text-[0.68rem] font-semibold text-foreground/70 hover:text-foreground"
          >
            CANCEL
          </button>
        </div>
      </div>
    </div>
  );
}
