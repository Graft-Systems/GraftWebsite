"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useParams } from "next/navigation";
import { ArticleBody } from "@/components/news/ArticleBody";
import type { NewsArticle } from "@/lib/newsApi";
import { formatArticleDate } from "@/lib/newsApi";

export default function NewsArticlePage() {
  const params = useParams();
  const slug = typeof params.slug === "string" ? params.slug : "";
  const [article, setArticle] = useState<NewsArticle | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!slug) return;
    let cancelled = false;
    (async () => {
      setLoading(true);
      setError(null);
      try {
        const res = await fetch(`/api/news/articles/${encodeURIComponent(slug)}`);
        if (res.status === 404) {
          if (!cancelled) setError("Article not found.");
          return;
        }
        if (!res.ok) {
          if (!cancelled) setError("Could not load this article.");
          return;
        }
        if (!cancelled) setArticle((await res.json()) as NewsArticle);
      } catch {
        if (!cancelled) setError("Could not reach the newsroom.");
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [slug]);

  if (loading) {
    return (
      <main className="min-h-dvh bg-background pt-32 pb-24">
        <p className="mx-auto max-w-3xl px-6 text-sm text-foreground/60 lg:px-10">
          Loading…
        </p>
      </main>
    );
  }

  if (error || !article) {
    return (
      <main className="min-h-dvh bg-background pt-32 pb-24">
        <div className="mx-auto max-w-3xl px-6 lg:px-10">
          <p className="text-sm text-red-300/90">{error ?? "Not found."}</p>
          <Link
            href="/news"
            className="frame mt-6 inline-block text-[0.68rem] font-semibold text-amber"
          >
            ← Back to newsroom
          </Link>
        </div>
      </main>
    );
  }

  const date = formatArticleDate(article.published_at ?? article.created_at);
  const byline = article.author.name?.trim() || article.author.email;

  return (
    <main className="relative min-h-dvh bg-background pt-32 pb-32">
      {/* Background Decor */}
      <div className="pointer-events-none absolute inset-0 overflow-hidden opacity-10">
        <div className="absolute top-[10%] right-[10%] h-[50%] w-[50%] rounded-full bg-burgundy/10 blur-[120px]" />
      </div>

      <article className="relative mx-auto max-w-4xl px-6 lg:px-10">
        <header className="mb-16 border-b border-border/30 pb-16 lg:mb-24 lg:pb-24">
          <Link
            href="/news"
            className="frame group inline-flex items-center gap-2 text-[0.68rem] font-bold tracking-widest text-foreground/60 transition-colors hover:text-amber"
          >
            <span className="transition-transform group-hover:-translate-x-1">
              ←
            </span>
            BACK TO CHRONICLE
          </Link>

          <div className="mt-16 flex items-center gap-3">
            <time className="frame text-[0.62rem] tracking-[0.15em] text-sage">
              {date.toUpperCase()}
            </time>
            <span className="h-px w-8 bg-border/40" />
            <span className="frame text-[0.62rem] tracking-[0.15em] text-foreground-muted">
              FIELD NOTES
            </span>
          </div>

          <h1 className="display mt-8 text-display-lg leading-[1.1] text-foreground sm:text-display-xl">
            {article.title}
          </h1>

          <div className="mt-12 flex items-center gap-4">
            <div className="h-10 w-10 overflow-hidden rounded-full border border-border/40 bg-surface/20">
              <div className="flex h-full w-full items-center justify-center text-[0.6rem] font-bold text-foreground/40">
                {article.author.name?.[0]?.toUpperCase() ?? "G"}
              </div>
            </div>
            <div>
              <p className="frame text-[0.62rem] font-bold tracking-widest text-foreground">
                {byline.toUpperCase()}
              </p>
              <p className="frame mt-0.5 text-[0.55rem] tracking-wider text-foreground-muted">
                GRAFT SYSTEMS CONTRIBUTOR
              </p>
            </div>
          </div>
        </header>

        {article.excerpt && (
          <div className="mb-16">
            <p className="display text-xl leading-relaxed text-foreground/90 sm:text-2xl">
              {article.excerpt}
            </p>
          </div>
        )}

        <div className="prose prose-invert max-w-none">
          <ArticleBody body={article.body} />
        </div>

        <footer className="mt-24 border-t border-border/30 pt-16 text-center">
          <div className="inline-block rounded-full border border-border/40 px-6 py-2">
            <p className="frame text-[0.55rem] font-bold tracking-[0.2em] text-foreground-muted">
              END OF DISPATCH
            </p>
          </div>
          <div className="mt-12">
            <Link
              href="/news"
              className="frame text-[0.68rem] font-bold tracking-widest text-amber hover:text-amber-300"
            >
              RETURN TO NEWSROOM
            </Link>
          </div>
        </footer>
      </article>
    </main>
  );
}
