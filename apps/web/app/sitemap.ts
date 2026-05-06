/**
 * Sitemap (M0-02a step 8).
 *
 * Marketing routes only. Authenticated /spray/(app)/* routes export
 * their own `metadata: { robots: { index: false } }` so search
 * engines never reach them. /spray (the marketing landing) is
 * deliberately included.
 */
import type { MetadataRoute } from "next";

const BASE = "https://graftsystems.com";

export default function sitemap(): MetadataRoute.Sitemap {
  const lastModified = new Date();
  return [
    { url: `${BASE}/`, priority: 1.0, lastModified, changeFrequency: "monthly" },
    { url: `${BASE}/about`, priority: 0.6, lastModified, changeFrequency: "yearly" },
    { url: `${BASE}/tool`, priority: 0.6, lastModified, changeFrequency: "monthly" },
    { url: `${BASE}/spray`, priority: 0.9, lastModified, changeFrequency: "monthly" },
    { url: `${BASE}/contact`, priority: 0.4, lastModified, changeFrequency: "yearly" },
  ];
}
