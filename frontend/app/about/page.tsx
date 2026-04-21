import type { Metadata } from "next";
import { AboutHero } from "@/components/about/AboutHero";
import { AboutOrigin } from "@/components/about/AboutOrigin";
import { AboutTimeline } from "@/components/about/AboutTimeline";
import { AboutTeam } from "@/components/about/AboutTeam";

export const metadata: Metadata = {
  title: "About — Graft Systems",
  description:
    "Why Graft exists, where it's going, and who's building it.",
};

export default function AboutPage() {
  return (
    <main className="relative">
      <AboutHero />
      <AboutOrigin />
      <AboutTimeline />
      <AboutTeam />
    </main>
  );
}
