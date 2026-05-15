"use client";

import { useRouter } from "next/navigation";
import { ArticleEditorForm } from "@/components/news/ArticleEditorForm";
import { formatNewsHttpError, useNewsroomMe } from "@/lib/newsApi";

export default function NewsStudioNewPage() {
  const router = useRouter();
  const { authedFetch } = useNewsroomMe();

  return (
    <ArticleEditorForm
      submitLabel="Create article"
      onSubmit={async (payload) => {
        const res = await authedFetch("/api/news/articles/manage", {
          method: "POST",
          body: JSON.stringify(payload),
        });
        if (!res.ok) {
          throw new Error(await formatNewsHttpError(res));
        }
        const article = (await res.json()) as { id: string };
        router.push(`/news/studio/${article.id}/edit`);
      }}
    />
  );
}
