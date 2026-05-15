"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { ArticleEditorForm } from "@/components/news/ArticleEditorForm";
import {
  formatNewsHttpError,
  useNewsroomMe,
  type NewsArticle,
} from "@/lib/newsApi";

export default function NewsStudioEditPage() {
  const params = useParams();
  const router = useRouter();
  const id = typeof params.id === "string" ? params.id : "";
  const { authedFetch } = useNewsroomMe();
  const [article, setArticle] = useState<NewsArticle | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!id) return;
    let cancelled = false;
    (async () => {
      setLoading(true);
      setError(null);
      try {
        const res = await authedFetch(`/api/news/articles/manage/${id}`);
        if (!res.ok) {
          if (!cancelled) setError(await formatNewsHttpError(res));
          return;
        }
        if (!cancelled) setArticle((await res.json()) as NewsArticle);
      } catch (e) {
        if (!cancelled) {
          setError(e instanceof Error ? e.message : "Could not load article.");
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [authedFetch, id]);

  if (loading) {
    return <p className="text-sm text-foreground/60">Loading article…</p>;
  }

  if (error || !article) {
    return <p className="text-sm text-red-300/90">{error ?? "Not found."}</p>;
  }

  return (
    <ArticleEditorForm
      initial={article}
      submitLabel="Save changes"
      onSubmit={async (payload) => {
        const res = await authedFetch(`/api/news/articles/manage/${id}`, {
          method: "PATCH",
          body: JSON.stringify(payload),
        });
        if (!res.ok) {
          throw new Error(await formatNewsHttpError(res));
        }
        const updated = (await res.json()) as NewsArticle;
        setArticle(updated);
      }}
      onDelete={async () => {
        if (!confirm("Delete this article permanently?")) return;
        const res = await authedFetch(`/api/news/articles/manage/${id}`, {
          method: "DELETE",
        });
        if (!res.ok) {
          throw new Error(await formatNewsHttpError(res));
        }
        router.push("/news/studio");
      }}
    />
  );
}
