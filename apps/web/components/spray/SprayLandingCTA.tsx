/**
 * Auth-aware CTA for the /spray marketing landing (M0-02a step 3).
 *
 * Signed-out: primary "Sign up" + secondary "Log in".
 * Signed-in: primary "Open dashboard".
 */
"use client";

import Link from "next/link";
import { useAuth } from "@clerk/nextjs";

export function SprayLandingCTA() {
  const { isLoaded, isSignedIn } = useAuth();

  if (!isLoaded) {
    return (
      <div className="h-12 w-40 animate-pulse rounded-md bg-foreground/10" />
    );
  }

  if (isSignedIn) {
    return (
      <Link
        href="/spray/dashboard"
        className="rounded-md bg-amber px-6 py-3 frame text-sm font-semibold text-background transition-colors hover:bg-amber/90"
      >
        Open dashboard
      </Link>
    );
  }

  return (
    <>
      <Link
        href="/sign-up?redirect_url=/spray/post-login"
        className="rounded-md bg-amber px-6 py-3 frame text-sm font-semibold text-background transition-colors hover:bg-amber/90"
      >
        Sign up for early access
      </Link>
      <Link
        href="/sign-in?redirect_url=/spray/post-login"
        className="rounded-md border border-border/60 px-6 py-3 frame text-sm font-semibold text-foreground transition-colors hover:border-amber hover:text-amber"
      >
        Log in
      </Link>
    </>
  );
}
