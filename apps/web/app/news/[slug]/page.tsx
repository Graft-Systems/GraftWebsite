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
    <main className="relative min-h-dvh bg-background pt-32 pb-24">
      <article className="mx-auto max-w-3xl px-6 lg:px-10">
        <Link
          href="/news"
          className="frame text-[0.68rem] font-semibold text-foreground/70 hover:text-amber"
        >
          ← Newsroom
        </Link>
        <time className="frame mt-10 block text-[0.62rem] text-foreground-muted">
          {date}
        </time>
        <h1 className="display mt-4 text-display-md leading-tight text-foreground">
          {article.title}
        </h1>
        <p className="mt-4 frame text-[0.62rem] text-foreground-muted">By {byline}</p>
        {article.excerpt ? (
          <p className="mt-8 text-lg leading-relaxed text-foreground/80">
            {article.excerpt}
          </p>
        ) : null}
        <div className="mt-12 border-t border-border/40 pt-12">
          <ArticleBody body={article.body} />
        </div>
      </article>
    </main>
  );
}
