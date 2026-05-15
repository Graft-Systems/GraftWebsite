/**
 * Clerk middleware (M0-02 step 8).
 *
 * Marketing routes (/, /about, /contact, /tool) stay public so the public
 * site keeps working even when auth fails. The Spray app routes (/spray,
 * /onboarding) are protected and redirect to /sign-in when the caller is
 * not authenticated.
 */
import { clerkMiddleware, createRouteMatcher } from "@clerk/nextjs/server";

/**
 * Protected routes — Clerk middleware redirects unauth'd visitors to
 * /sign-in. The /spray landing is intentionally NOT protected (it is
 * the public marketing page); only deeper /spray/<anything> requires
 * a session.
 */
const isProtectedRoute = createRouteMatcher([
  "/news/studio(.*)",
  "/spray/dashboard(.*)",
  "/spray/onboarding(.*)",
  "/spray/post-login(.*)",
  "/spray/vineyards(.*)",
  "/spray/captures(.*)",
  "/spray/integrations(.*)",
  "/spray/forecasts(.*)",
  "/spray/spray-records(.*)",
  "/spray/settings(.*)",
]);

export default clerkMiddleware(async (auth, req) => {
  if (isProtectedRoute(req)) {
    await auth.protect();
  }
});

export const config = {
  matcher: [
    // Skip Next internals and all static files unless found in search params.
    "/((?!_next|[^?]*\\.(?:html?|css|js(?!on)|jpe?g|webp|png|gif|svg|ttf|woff2?|ico|csv|docx?|xlsx?|zip|webmanifest)).*)",
    // Always run for API routes.
    "/(api|trpc)(.*)",
  ],
};
