/**
 * Top-nav "CRM" link, rendered only when the current Clerk user's email
 * is in the CRM_ADMIN_EMAILS allow-list. Non-admins (including signed-out
 * visitors) get `null`, so the link is not in the DOM at all.
 *
 * Server component on purpose:
 *   - CRM_ADMIN_EMAILS is a server-only env var; we don't want to leak
 *     the allow-list to the browser.
 *   - The check mirrors the gate in apps/web/lib/admin/auth-check.ts and
 *     apps/web/app/admin/layout.tsx, so visibility and access stay in sync.
 *
 * This is the "shown only to approved users" half of CRM access control.
 * Defense-in-depth: even if a non-admin guesses /admin, the layout-level
 * gate still redirects them to "/".
 */
import Link from "next/link";
import { currentUser } from "@clerk/nextjs/server";

export async function NavAdminLink() {
  const user = await currentUser();
  const email = user?.emailAddresses[0]?.emailAddress;
  if (!email) return null;

  const adminEmails =
    process.env.CRM_ADMIN_EMAILS?.split(",")
      .map((e) => e.trim())
      .filter(Boolean) ?? [];

  if (!adminEmails.includes(email)) return null;

  return (
    <li>
      <Link
        href="/admin"
        className="frame inline-flex items-center text-[0.7rem] font-semibold leading-none text-amber transition-colors hover:text-amber/80"
      >
        CRM
      </Link>
    </li>
  );
}
