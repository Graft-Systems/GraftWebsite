import { describe, expect, it } from "vitest";
import { formatImageBlock, parseNewsBody } from "@/lib/newsBody";

describe("parseNewsBody", () => {
  it("parses plain paragraphs", () => {
    const blocks = parseNewsBody("Hello.\n\nSecond paragraph.");
    expect(blocks).toEqual([
      { type: "paragraph", text: "Hello." },
      { type: "paragraph", text: "Second paragraph." },
    ]);
  });

  it("parses image without caption", () => {
    const blocks = parseNewsBody("![alt text](/media/news_uploads/a.jpg)");
    expect(blocks).toEqual([
      {
        type: "image",
        alt: "alt text",
        url: "/media/news_uploads/a.jpg",
      },
    ]);
  });

  it("parses image with following caption line", () => {
    const body = [
      "![Workers](/media/news_uploads/a.jpg)",
      "::caption:: Workers in Block 7 at harvest.",
    ].join("\n\n");

    const blocks = parseNewsBody(body);
    expect(blocks).toEqual([
      {
        type: "image",
        alt: "Workers",
        url: "/media/news_uploads/a.jpg",
        caption: "Workers in Block 7 at harvest.",
      },
    ]);
  });

  it("leaves legacy articles with image-only blocks working", () => {
    const body = [
      "Intro text.",
      "![1778708352689.jpg](/media/news_uploads/2026/05/18/x.jpg)",
      "Outro.",
    ].join("\n\n");

    const blocks = parseNewsBody(body);
    expect(blocks).toHaveLength(3);
    expect(blocks[1]).toMatchObject({
      type: "image",
      alt: "1778708352689.jpg",
    });
  });
});

describe("formatImageBlock", () => {
  it("formats image only", () => {
    const chunk = formatImageBlock({
      alt: "Grapes",
      url: "/media/news_uploads/x.jpg",
    });
    expect(chunk).toContain("![Grapes](/media/news_uploads/x.jpg)");
    expect(chunk).not.toContain("::caption::");
  });

  it("formats image with caption", () => {
    const chunk = formatImageBlock({
      alt: "Grapes",
      url: "/media/news_uploads/x.jpg",
      caption: "Cabernet block 3.",
    });
    expect(parseNewsBody(`before${chunk}after`)).toEqual([
      { type: "paragraph", text: "before" },
      {
        type: "image",
        alt: "Grapes",
        url: "/media/news_uploads/x.jpg",
        caption: "Cabernet block 3.",
      },
      { type: "paragraph", text: "after" },
    ]);
  });
});
