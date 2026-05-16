"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import {
  formatArticleDate,
  formatNewsHttpError,
  useNewsroomMe,
  type NewsArticle,
} from "@/lib/newsApi";

export default function NewsStudioPage() {
  const { me, authedFetch } = useNewsroomMe();
  const [articles, setArticles] = useState<NewsArticle[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!me?.can_publish) {
      setLoading(false);
      return;
    }
    let cancelled = false;
    (async () => {
      setLoading(true);
      setError(null);
      try {
        const res = await authedFetch("/api/news/articles/manage");
        if (!res.ok) {
          if (!cancelled) setError(await formatNewsHttpError(res));
          return;
        }
        const data = (await res.json()) as { articles: NewsArticle[] };
        if (!cancelled) setArticles(data.articles ?? []);
      } catch (e) {
        if (!cancelled) {
          setError(e instanceof Error ? e.message : "Could not load articles.");
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [authedFetch, me?.can_publish]);

  if (!me?.can_publish) {
    return (
      <p className="text-sm text-foreground/70">
        You can manage publisher permissions but do not have publish access.
        {me?.can_manage_permissions ? (
          <>
            {" "}
            <Link href="/news/studio/permissions" className="text-amber hover:underline">
              Go to permissions
            </Link>
            .
          </>
        ) : null}
      </p>
    );
  }

  return (
    <div>
      <div className="mb-8 flex items-center justify-between gap-4">
        <p className="text-sm text-foreground/70">
          All drafts and published posts.
        </p>
        <Link
          href="/news/studio/new"
          className="frame shrink-0 border border-amber/50 bg-amber/15 px-5 py-2.5 text-[0.68rem] font-semibold text-amber hover:bg-amber/25"
        >
          New article
        </Link>
      </div>

      {loading ? (
        <p className="text-sm text-foreground/60">Loading…</p>
      ) : error ? (
        <p className="text-sm text-red-300/90">{error}</p>
      ) : articles.length === 0 ? (
        <p className="text-sm text-foreground/60">No articles yet.</p>
      ) : (
        <ul className="divide-y divide-border/40 border border-border/40">
          {articles.map((article) => (
            <li key={article.id}>
              <Link
                href={`/news/studio/${article.id}/edit`}
                className="flex flex-col gap-2 px-5 py-4 transition-colors hover:bg-surface/40 sm:flex-row sm:items-center sm:justify-between"
              >
                <div>
                  <p className="font-medium text-foreground">{article.title}</p>
                </div>
                <div className="flex items-center gap-4 text-xs">
                  <span
                    className={`frame rounded-sm px-2 py-0.5 uppercase tracking-wider ${
                      article.status === "published"
                        ? "bg-sage/15 text-sage"
                        : "bg-foreground/10 text-foreground/70"
                    }`}
                  >
                    {article.status}
                  </span>
                  <span className="text-foreground-muted">
                    {formatArticleDate(article.updated_at)}
                  </span>
                </div>
              </Link>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
