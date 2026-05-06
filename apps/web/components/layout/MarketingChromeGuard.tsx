/**
 * Hides the marketing nav and footer when the visitor is inside the
 * Spray app shell (M0-02a step 4).
 *
 * Auth pages (/sign-in, /sign-up) are rendered by Clerk inside the
 * marketing layout — they keep the chrome. Only the authenticated
 * Spray surface (/spray/dashboard, /spray/onboarding,
 * /spray/post-login, etc — i.e. /spray/<anything> EXCEPT the bare
 * /spray landing) opts out.
 *
 * Server-side default: chrome renders. Hydration only flips it off
 * when the pathname matches. Avoids SEO and first-paint regressions.
 */
"use client";

import { usePathname } from "next/navigation";

export function MarketingChromeGuard({
  children,
}: {
  children: React.ReactNode;
}) {
  const pathname = usePathname() ?? "";

  // /spray (exact) keeps the marketing chrome. Anything deeper under
  // /spray/* uses the Spray app shell instead.
  const insideSprayApp =
    pathname === "/spray/post-login" ||
    /^\/spray\/.+/.test(pathname);

  if (insideSprayApp) return null;
  return <>{children}</>;
}
