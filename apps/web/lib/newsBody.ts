/** Parse and format news article body (paragraphs + images with optional captions). */

export type NewsParagraphBlock = {
  type: "paragraph";
  text: string;
};

export type NewsImageBlock = {
  type: "image";
  alt: string;
  url: string;
  caption?: string;
};

export type NewsBlock = NewsParagraphBlock | NewsImageBlock;

const IMAGE_RE = /^!\[(.*?)\]\((.*?)\)$/;
const CAPTION_RE = /^::caption::\s*(.+)$/;

export function parseNewsBody(body: string): NewsBlock[] {
  const paragraphs = body
    .trim()
    .split(/\n\n+/)
    .map((p) => p.trim())
    .filter(Boolean);

  const blocks: NewsBlock[] = [];

  for (let i = 0; i < paragraphs.length; i += 1) {
    const paragraph = paragraphs[i];
    const imageMatch = paragraph.match(IMAGE_RE);
    if (imageMatch) {
      let caption: string | undefined;
      const next = paragraphs[i + 1];
      const captionMatch = next?.match(CAPTION_RE);
      if (captionMatch) {
        caption = captionMatch[1].trim();
        i += 1;
      }
      blocks.push({
        type: "image",
        alt: imageMatch[1],
        url: imageMatch[2],
        caption,
      });
      continue;
    }

    blocks.push({ type: "paragraph", text: paragraph });
  }

  return blocks;
}

export function formatImageBlock({
  alt,
  url,
  caption,
}: {
  alt: string;
  url: string;
  caption?: string;
}): string {
  const trimmedAlt = alt.trim() || "Image";
  const imageLine = `![${trimmedAlt}](${url})`;
  const trimmedCaption = caption?.trim();
  if (!trimmedCaption) {
    return `\n\n${imageLine}\n\n`;
  }
  return `\n\n${imageLine}\n\n::caption:: ${trimmedCaption}\n\n`;
}
