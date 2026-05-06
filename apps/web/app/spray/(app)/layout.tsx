/**
 * Authenticated Spray app shell layout (M0-02a step 4).
 *
 * Wraps every /spray/(app)/* route with a sidebar + topbar working-tool
 * shell. The marketing nav and footer are suppressed by
 * <MarketingChromeGuard /> in the root layout, which checks the
 * pathname and hides those elements when we are inside this group.
 */
import type { Metadata } from "next";
import { SprayShell } from "@/components/spray/SprayShell";

export const metadata: Metadata = {
  // Authenticated surface; keep search engines out.
  robots: { index: false, follow: false },
};

export default function SprayAppLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return <SprayShell>{children}</SprayShell>;
}
