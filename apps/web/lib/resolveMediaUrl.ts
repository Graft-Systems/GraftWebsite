/** Normalize API media URLs for same-origin loading via Next.js /media rewrite. */

export function resolveMediaUrl(imageUrl?: string): string {
  if (!imageUrl) return "";

  if (typeof window !== "undefined") {
    try {
      const parsed = new URL(imageUrl, window.location.origin);
      if (parsed.pathname.startsWith("/media/")) {
        return `${parsed.pathname}${parsed.search}`;
      }
    } catch {
      /* keep relative paths as-is */
    }
    if (imageUrl.startsWith("/")) return imageUrl;
  }

  if (/^https?:\/\//i.test(imageUrl)) return imageUrl;

  if (!imageUrl.startsWith("/")) return imageUrl;

  const serverBase =
    process.env.BACKEND_URL?.trim() ??
    process.env.NEXT_PUBLIC_BACKEND_URL?.trim() ??
    "";
  return serverBase ? `${serverBase.replace(/\/+$/, "")}${imageUrl}` : imageUrl;
}
