import Link from "next/link";
import type { NewsArticle } from "@/lib/newsApi";
import { formatArticleDate } from "@/lib/newsApi";

export function NewsArticleCard({ article }: { article: NewsArticle }) {
  const date = formatArticleDate(article.published_at ?? article.created_at);
  const byline = article.author.name?.trim() || article.author.email;

  return (
    <article className="group border border-border/50 bg-surface/30 p-8 transition-colors hover:border-border">
      <time className="frame text-[0.62rem] text-foreground-muted">{date}</time>
      <h2 className="mt-4 text-xl font-semibold leading-snug text-foreground transition-colors group-hover:text-amber">
        <Link href={`/news/${article.slug}`} className="outline-offset-4">
          {article.title}
        </Link>
      </h2>
      {article.excerpt ? (
        <p className="mt-3 text-sm leading-relaxed text-foreground/70">
          {article.excerpt}
        </p>
      ) : null}
      <p className="mt-6 frame text-[0.62rem] text-foreground-muted">By {byline}</p>
    </article>
  );
}
