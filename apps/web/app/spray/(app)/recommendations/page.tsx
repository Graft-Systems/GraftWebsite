/**
 * /spray/recommendations placeholder (M1.5 PR-C).
 *
 * Real verdict UI lands in PR-F (recommendation card + LLM brief).
 * This page exists so the sidebar nav has a target and we can
 * smoke-test the verdict endpoints from the browser.
 */
"use client";

import Link from "next/link";

export default function RecommendationsPage() {
  return (
    <div className="mx-auto max-w-3xl">
      <h1 className="font-display text-3xl">Recommendations</h1>
      <p className="mt-3 text-foreground/70">
        The aggregation engine is live. Verdicts are computed hourly during
        the growing season for every active block. The grower-facing card
        with cited drivers and the LLM-authored daily brief lands in the
        next milestone (PR-F).
      </p>

      <section className="mt-10 rounded-md border border-border/40 bg-background/40 p-6">
        <h2 className="frame text-xs font-semibold uppercase tracking-wider text-foreground/60">
          What you can do today
        </h2>
        <ul className="mt-4 space-y-3 text-sm text-foreground/80">
          <li>
            Open a vineyard, then a block, and the API will surface the
            latest BlockVerdict via{" "}
            <code className="rounded bg-foreground/10 px-1 py-0.5 text-xs">
              GET /api/spray/orgs/&lt;org&gt;/blocks/&lt;block&gt;/verdicts/latest
            </code>
            .
          </li>
          <li>
            History (last 30 days) at{" "}
            <code className="rounded bg-foreground/10 px-1 py-0.5 text-xs">
              GET /api/spray/orgs/&lt;org&gt;/blocks/&lt;block&gt;/verdicts?since=YYYY-MM-DD
            </code>
            .
          </li>
        </ul>
      </section>

      <p className="mt-8 text-sm text-foreground/60">
        <Link href="/spray/vineyards" className="text-amber hover:underline">
          ← Back to vineyards
        </Link>
      </p>
    </div>
  );
}
