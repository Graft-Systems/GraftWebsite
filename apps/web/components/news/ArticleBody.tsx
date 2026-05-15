/** Renders article body as paragraphs (plain text, split on blank lines). */

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
      {paragraphs.map((paragraph, i) => (
        <p key={i} className="whitespace-pre-wrap">
          {paragraph}
        </p>
      ))}
    </div>
  );
}
