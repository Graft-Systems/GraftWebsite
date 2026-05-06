/**
 * Spray dashboard placeholder (M0-02a step 4).
 *
 * Real widgets (vineyards list, recent forecasts, capture queue) light
 * up across M1-09 onward. M0-02a renders an empty-state welcome with
 * cards announcing what is coming next.
 */
"use client";

import { useUser } from "@clerk/nextjs";

const PLACEHOLDERS = [
  {
    title: "Vineyards",
    body: "Map and polygon-draw your blocks. Lights up at M0-05.",
  },
  {
    title: "Forecasts",
    body: "Risk indices per block, live and forecasted. Lights up at M1-07 / M1-08.",
  },
  {
    title: "Captures",
    body: "Photo + video capture for the grape-weight model. Lights up at M1-09.",
  },
];

export default function SprayDashboardPage() {
  const { user } = useUser();
  const greeting = user?.firstName ? `Welcome back, ${user.firstName}.` : "Welcome back.";

  return (
    <div className="mx-auto max-w-5xl">
      <h1 className="font-display text-3xl">{greeting}</h1>
      <p className="mt-2 text-foreground/60">
        This is the Spray dashboard. The working surface lights up over the next few
        milestones; for now, here is what is on the way.
      </p>

      <div className="mt-10 grid gap-4 md:grid-cols-3">
        {PLACEHOLDERS.map((p) => (
          <div
            key={p.title}
            className="rounded-md border border-border/40 bg-background/40 p-5"
          >
            <h2 className="frame text-xs font-semibold uppercase tracking-wider text-foreground/60">
              {p.title}
            </h2>
            <p className="mt-3 text-sm text-foreground/70">{p.body}</p>
          </div>
        ))}
      </div>
    </div>
  );
}
