/**
 * Clerk middleware (M0-02 step 8).
 *
 * Marketing routes (/, /about, /contact, /tool) stay public so the public
 * site keeps working even when auth fails. The Spray app routes (/spray,
 * /onboarding) are protected and redirect to /sign-in when the caller is
 * not authenticated.
 */
import { clerkMiddleware, createRouteMatcher } from "@clerk/nextjs/server";

const isProtectedRoute = createRouteMatcher([
  "/spray(.*)",
  "/onboarding(.*)",
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
