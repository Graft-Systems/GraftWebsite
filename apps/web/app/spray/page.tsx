/**
 * /spray marketing landing page (M0-02a step 3).
 *
 * Public, server-rendered, indexed by search engines. Logged-in
 * visitors see the same hero copy with the CTA swapped to "Open
 * dashboard" via the small client-side <SprayLandingCTA /> component.
 */
import type { Metadata } from "next";
import { SprayLandingCTA } from "@/components/spray/SprayLandingCTA";

export const metadata: Metadata = {
  title: "Graft Spray — Spray smarter, not more",
  description:
    "Yield-aware spray planning for the modern vineyard. Forecasts, capture, and benchmarks built around your blocks.",
  alternates: { canonical: "https://graftsystems.com/spray" },
};

const VALUE_PROPS = [
  {
    title: "Know your yield before harvest",
    body:
      "Photo capture plus a probabilistic weight model returns a distribution per block, not a single number. Plan for what is likely, not what is possible.",
  },
  {
    title: "Spray smarter, not more",
    body:
      "Risk forecasts blend on-vineyard weather with regional indices. You only spray when the model says it pays.",
  },
  {
    title: "Build your vineyard's data backbone",
    body:
      "Every capture, spray record, and forecast lands in your data lake. Your vineyard learns from itself, season after season.",
  },
];


export default function SprayLandingPage() {
  return (
    <main className="mx-auto max-w-5xl px-6 py-32">
      <section className="text-center">
        <p className="frame text-xs font-semibold uppercase tracking-[0.3em] text-amber/80">
          Graft Spray
        </p>
        <h1 className="mt-4 font-display text-5xl leading-tight md:text-6xl">
          Spray smarter, not more.
        </h1>
        <p className="mx-auto mt-6 max-w-2xl text-lg text-foreground/70">
          Yield-aware spray planning for the modern vineyard. Forecasts, capture, and benchmarks
          built around your blocks, not someone else's calendar.
        </p>
        <div className="mt-10 flex flex-col items-center justify-center gap-3 md:flex-row md:gap-6">
          <SprayLandingCTA />
        </div>
      </section>

      <section className="mt-32 grid gap-8 md:grid-cols-3">
        {VALUE_PROPS.map((p) => (
          <div
            key={p.title}
            className="rounded-md border border-border/40 bg-background/40 p-6"
          >
            <h2 className="font-display text-xl">{p.title}</h2>
            <p className="mt-3 text-sm text-foreground/70">{p.body}</p>
          </div>
        ))}
      </section>

      <section className="mt-32 text-center text-sm text-foreground/60">
        <p>
          Graft Spray launches in beta to a small cohort of Napa and Sonoma growers in 2026.
          Sign up to claim early access.
        </p>
      </section>
    </main>
  );
}
