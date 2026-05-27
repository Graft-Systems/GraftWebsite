/**
 * Hides the marketing nav and footer when the visitor is inside an
 * authenticated app shell — Spray (M0-02a step 4) or CRM (/admin/*).
 *
 * Auth pages (/sign-in, /sign-up) are rendered by Clerk inside the
 * marketing layout — they keep the chrome. The Spray app surface
 * (/spray/dashboard, /spray/onboarding, /spray/post-login, etc —
 * i.e. /spray/<anything> EXCEPT the bare /spray landing) and the
 * entire CRM (/admin and /admin/*) opt out so they render with only
 * their own dashboard sidebars.
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
  // /spray/* uses the Spray app shell instead. /admin is the CRM and
  // is admin-gated, so it never shows marketing chrome.
  const insideAppShell =
    pathname === "/spray/post-login" ||
    /^\/spray\/.+/.test(pathname) ||
    pathname === "/admin" ||
    /^\/admin\/.+/.test(pathname);

  if (insideAppShell) return null;
  return <>{children}</>;
}
