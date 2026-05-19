import Link from "next/link";
import type { NewsArticle } from "@/lib/newsApi";
import { formatArticleDate } from "@/lib/newsApi";
import { resolveMediaUrl } from "@/lib/resolveMediaUrl";

type NewsArticleCardProps = {
  article: NewsArticle;
  featured?: boolean;
};

export function NewsArticleCard({ article, featured }: NewsArticleCardProps) {
  const date = formatArticleDate(article.published_at ?? article.created_at);
  const byline = article.author.name?.trim() || article.author.email;

  // Attempt to find the first image in the body to use as a preview
  const imageMatch = article.body.match(/!\[.*?\]\((.*?)\)/);
  const previewImage = imageMatch ? imageMatch[1] : null;

  if (featured) {
    return (
      <article className="group relative flex flex-col gap-8 overflow-hidden border border-border/40 bg-surface/10 p-1 lg:flex-row lg:items-center">
        {previewImage && (
          <div className="relative aspect-video w-full overflow-hidden border-b border-border/40 lg:aspect-[4/3] lg:w-1/2 lg:border-b-0 lg:border-r">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={resolveMediaUrl(previewImage)}
              alt={article.title}
              className="h-full w-full object-cover transition-transform duration-700 group-hover:scale-105"
            />
            <div className="absolute inset-0 bg-burgundy/10 mix-blend-multiply" />
          </div>
        )}
        <div className={`flex flex-col p-8 lg:p-12 ${previewImage ? "lg:w-1/2" : "w-full"}`}>
          <div className="flex items-center gap-3">
            <span className="frame text-[0.62rem] font-bold tracking-widest text-sage">
              FEATURED
            </span>
            <span className="h-px w-8 bg-border/60" />
            <time className="frame text-[0.62rem] text-foreground-muted">
              {date}
            </time>
          </div>

          <h2 className="mt-6 display text-3xl leading-tight text-foreground transition-colors group-hover:text-amber sm:text-4xl lg:text-5xl">
            <Link href={`/news/${article.slug}`} className="outline-none">
              {article.title}
            </Link>
          </h2>

          {article.excerpt && (
            <p className="mt-6 line-clamp-3 text-lg leading-relaxed text-foreground/75">
              {article.excerpt}
            </p>
          )}

          <div className="mt-10 flex items-center justify-between border-t border-border/40 pt-6">
            <p className="frame text-[0.62rem] uppercase tracking-wider text-foreground-muted">
              By <span className="text-foreground">{byline}</span>
            </p>
            <Link
              href={`/news/${article.slug}`}
              className="frame group/btn flex items-center gap-2 text-[0.68rem] font-bold text-amber"
            >
              READ ARTICLE
              <span className="transition-transform group-hover/btn:translate-x-1">
                →
              </span>
            </Link>
          </div>
        </div>
      </article>
    );
  }

  return (
    <article className="group flex flex-col border border-border/30 bg-surface/5 transition-all hover:border-border/60 hover:bg-surface/10">
      {previewImage && (
        <div className="relative aspect-[16/9] overflow-hidden border-b border-border/30">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={resolveMediaUrl(previewImage)}
            alt={article.title}
            className="h-full w-full object-cover transition-transform duration-500 group-hover:scale-105"
          />
          <div className="absolute inset-0 bg-burgundy/5 mix-blend-multiply" />
        </div>
      )}
      <div className="flex flex-1 flex-col p-6 lg:p-8">
        <time className="frame text-[0.62rem] tracking-wider text-foreground-muted">
          {date}
        </time>
        <h2 className="mt-4 display text-2xl leading-snug text-foreground transition-colors group-hover:text-amber">
          <Link href={`/news/${article.slug}`} className="outline-none">
            {article.title}
          </Link>
        </h2>
        {article.excerpt && (
          <p className="mt-4 line-clamp-2 text-sm leading-relaxed text-foreground/70">
            {article.excerpt}
          </p>
        )}
        <div className="mt-auto pt-8">
          <p className="frame text-[0.62rem] uppercase tracking-tighter text-foreground-muted">
            {byline}
          </p>
        </div>
      </div>
    </article>
  );
}
