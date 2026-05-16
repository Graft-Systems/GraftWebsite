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

  const showStudio = isLoaded && isSignedIn && Boolean(me?.can_publish);

  const [featured, ...others] = articles;

  return (
    <main className="relative min-h-dvh bg-background pt-28 pb-24">
      {/* Background Decor */}
      <div className="pointer-events-none absolute inset-0 overflow-hidden opacity-20">
        <div className="absolute -top-[10%] -left-[5%] h-[40%] w-[40%] rounded-full bg-burgundy/20 blur-[120px]" />
        <div className="absolute top-[20%] -right-[5%] h-[30%] w-[30%] rounded-full bg-amber/10 blur-[100px]" />
      </div>

      <div className="relative mx-auto max-w-[1200px] px-6 lg:px-10">
        {/* Header Section */}
        <header className="border-b border-border/30 pb-10 lg:pb-12">
          <div className="flex flex-col gap-8 lg:flex-row lg:items-end lg:justify-between lg:gap-10">
            <div className="text-center lg:text-left">
              <div className="inline-flex items-center gap-4">
                <span className="h-px w-6 bg-burgundy/40" />
                <span className="frame text-[0.72rem] font-bold tracking-[0.2em] text-sage">
                  THE GRAFT CHRONICLE
                </span>
                <span className="h-px w-6 bg-burgundy/40" />
              </div>
              <h1 className="display mt-5 text-display-xl text-foreground">
                Stories from the <span className="italic text-burgundy">Soil.</span>
              </h1>
              <p className="mt-4 max-w-2xl text-base leading-relaxed text-foreground/70 lg:text-lg">
                Insights on precision viticulture, field observations, and the
                evolution of the digital vineyard.
              </p>
            </div>

            {showStudio ? (
              <div className="flex shrink-0 justify-center lg:justify-end lg:pb-1">
                <Link
                  href="/news/studio"
                  className="frame border border-border/60 px-8 py-3 text-[0.68rem] font-bold tracking-widest text-foreground/90 transition-all hover:border-amber/50 hover:bg-amber/5 hover:text-amber"
                >
                  ACCESS STUDIO
                </Link>
              </div>
            ) : null}
          </div>
        </header>

        <div className="mt-12 lg:mt-16">
          {loading ? (
            <div className="flex flex-col items-center justify-center py-20">
              <div className="h-8 w-8 animate-spin rounded-full border-2 border-amber/20 border-t-amber" />
              <p className="mt-4 frame text-[0.62rem] tracking-widest text-foreground/40">
                GATHERING UPDATES
              </p>
            </div>
          ) : error ? (
            <p className="text-center text-sm text-red-300/90">{error}</p>
          ) : articles.length === 0 ? (
            <p className="py-20 text-center text-sm italic text-foreground/60">
              The archive is currently quiet. Check back soon.
            </p>
          ) : (
            <div className="space-y-32">
              {/* Featured Section */}
              <section>
                <div className="mb-10 flex items-center gap-4">
                  <h2 className="frame text-[0.68rem] font-bold tracking-widest text-foreground">
                    LATEST FEATURE
                  </h2>
                  <div className="h-px flex-1 bg-border/20" />
                </div>
                <NewsArticleCard article={featured} featured />
              </section>

              {/* Grid Section */}
              {others.length > 0 && (
                <section>
                  <div className="mb-12 flex items-center gap-4">
                    <h2 className="frame text-[0.68rem] font-bold tracking-widest text-foreground">
                      ARCHIVE & INSIGHTS
                    </h2>
                    <div className="h-px flex-1 bg-border/20" />
                  </div>
                  <div className="grid gap-12 sm:grid-cols-2 lg:grid-cols-3">
                    {others.map((article) => (
                      <NewsArticleCard key={article.id} article={article} />
                    ))}
                  </div>
                </section>
              )}
            </div>
          )}
        </div>
      </div>
    </main>
  );
}
