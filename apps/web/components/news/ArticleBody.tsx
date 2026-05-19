/** Renders article body (paragraphs + images with optional captions). */

import { parseNewsBody } from "@/lib/newsBody";
import { resolveMediaUrl } from "@/lib/resolveMediaUrl";

export function ArticleBody({ body }: { body: string }) {
  const blocks = parseNewsBody(body);

  if (blocks.length === 0) {
    return null;
  }

  return (
    <div className="space-y-5 text-base leading-relaxed text-foreground/85">
      {blocks.map((block, i) => {
        if (block.type === "image") {
          return (
            <figure key={i} className="my-8">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={resolveMediaUrl(block.url)}
                alt={block.alt}
                className="mx-auto block max-h-[600px] w-auto border border-border/40"
              />
              {block.caption ? (
                <figcaption className="mt-3 text-center text-sm italic text-foreground/60">
                  {block.caption}
                </figcaption>
              ) : null}
            </figure>
          );
        }

        return (
          <p key={i} className="whitespace-pre-wrap">
            {block.text}
          </p>
        );
      })}
    </div>
  );
}
