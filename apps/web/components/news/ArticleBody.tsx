/** Renders article body as paragraphs (plain text, supports embedded images ![alt](url)). */

export function ArticleBody({ body }: { body: string }) {
  const paragraphs = body
    .trim()
    .split(/\n\n+/)
    .map((p) => p.trim())
    .filter(Boolean);

  if (paragraphs.length === 0) {
    return null;
  }

  return (
    <div className="space-y-5 text-base leading-relaxed text-foreground/85">
      {paragraphs.map((paragraph, i) => {
        // Simple regex for ![alt](url)
        const imageMatch = paragraph.match(/^!\[(.*?)\]\((.*?)\)$/);
        if (imageMatch) {
          const [, alt, url] = imageMatch;
          return (
            <div key={i} className="my-8">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={url}
                alt={alt}
                className="mx-auto block max-h-[600px] w-auto border border-border/40"
              />
            </div>
          );
        }

        return (
          <p key={i} className="whitespace-pre-wrap">
            {paragraph}
          </p>
        );
      })}
    </div>
  );
}
