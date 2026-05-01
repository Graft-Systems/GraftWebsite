/**
 * Post-login router (M0-02a step 6).
 *
 * Server component that branches the user based on Org membership:
 *   no Org  -> /spray/onboarding
 *   any Org -> /spray/dashboard
 *
 * Falls through to /spray/onboarding when the API is unreachable
 * (e.g. Render still on pre-M0-closeout codebase) so the flow does
 * not dead-end.
 */
import { redirect } from "next/navigation";
import { auth } from "@clerk/nextjs/server";

const BACKEND_URL = process.env.BACKEND_URL ?? "http://127.0.0.1:8080";

export default async function PostLoginPage() {
  const { userId, getToken } = await auth();
  if (!userId) {
    redirect("/sign-in?redirect_url=/spray/post-login");
  }

  let hasOrg = false;
  try {
    const token = await getToken();
    const res = await fetch(`${BACKEND_URL}/api/spray/orgs/me`, {
      headers: token ? { Authorization: `Bearer ${token}` } : {},
      cache: "no-store",
    });
    if (res.ok) {
      const json = (await res.json()) as { memberships?: unknown[] };
      hasOrg = Array.isArray(json.memberships) && json.memberships.length > 0;
    }
  } catch {
    // Render not yet on M0 codebase; fall through to onboarding.
  }

  redirect(hasOrg ? "/spray/dashboard" : "/spray/onboarding");
}
