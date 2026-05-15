"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useAuth } from "@clerk/nextjs";
import { NewsArticleCard } from "@/components/news/NewsArticleCard";
import type { NewsArticle } from "@/lib/newsApi";
import { useNewsroomMe } from "@/lib/newsApi";

export default function NewsroomPage() {
  const { isSignedIn, isLoaded } = useAuth();
  const { me } = useNewsroomMe();
  const [articles, setArticles] = useState<NewsArticle[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      setLoading(true);
      setError(null);
      try {
        const res = await fetch("/api/news/articles");
        if (!res.ok) {
          if (!cancelled) setError("Could not load articles.");
          return;
        }
        const data = (await res.json()) as { articles: NewsArticle[] };
        if (!cancelled) setArticles(data.articles ?? []);
      } catch {
        if (!cancelled) setError("Could not reach the newsroom.");
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  const showStudio =
    isLoaded && isSignedIn && (me?.can_publish || me?.can_manage_permissions);

  return (
    <main className="relative min-h-dvh bg-background pt-32 pb-24">
      <div className="mx-auto max-w-[1100px] px-6 lg:px-10">
        <div className="flex flex-col gap-6 border-b border-border/40 pb-10 sm:flex-row sm:items-end sm:justify-between">
          <div className="max-w-2xl">
            <span className="frame text-[0.72rem] font-semibold text-sage">
              NEWSROOM
            </span>
            <h1 className="display mt-5 text-display-lg text-foreground">
              From the field and the lab.
            </h1>
            <p className="mt-6 text-base leading-relaxed text-foreground/75 sm:text-lg">
              Updates on Graft products, vineyard technology, and what we are
              learning with partner wineries.
            </p>
          </div>
          {showStudio ? (
            <Link
              href="/news/studio"
              className="frame shrink-0 border border-border/60 px-5 py-3 text-[0.68rem] font-semibold text-foreground/90 transition-colors hover:border-amber/50 hover:text-amber"
            >
              Open studio →
            </Link>
          ) : null}
        </div>

        <div className="mt-16">
          {loading ? (
            <p className="text-sm text-foreground/60">Loading articles…</p>
          ) : error ? (
            <p className="text-sm text-red-300/90">{error}</p>
          ) : articles.length === 0 ? (
            <p className="text-sm text-foreground/60">
              No published articles yet. Check back soon.
            </p>
          ) : (
            <div className="grid gap-8 md:grid-cols-2">
              {articles.map((article) => (
                <NewsArticleCard key={article.id} article={article} />
              ))}
            </div>
          )}
        </div>
      </div>
    </main>
  );
}
