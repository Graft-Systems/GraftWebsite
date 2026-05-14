/**
 * Spray app shell — sidebar + topbar + main content area (M0-02a step 4).
 *
 * Renders the dense, utility-first chrome described in spec §21.5.
 * Marketing nav and footer are suppressed via <MarketingChromeGuard />
 * in the root layout.
 *
 * NOT for use outside `apps/web/app/spray/(app)/**`. Marketing pages
 * must continue to use the root layout's <Nav /> and <Footer />.
 */
"use client";

import type { ReactNode } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  LayoutDashboard,
  Map,
  CloudSun,
  ClipboardList,
  ImageIcon,
  Cable,
  Settings as SettingsIcon,
} from "lucide-react";
import { UserButton, useAuth } from "@clerk/nextjs";
import { OrgSwitcher } from "@/components/spray/OrgSwitcher";
import { CreateSprayOrgForm } from "@/components/spray/CreateSprayOrgForm";
import { useActiveOrg } from "@/lib/sprayApi";
import { cn } from "@/lib/utils";

const NAV = [
  { href: "/spray/dashboard", label: "Dashboard", icon: LayoutDashboard },
  { href: "/spray/vineyards", label: "Vineyards", icon: Map },
  { href: "/spray/integrations", label: "Integrations", icon: Cable },
  { href: "/spray/captures", label: "Captures", icon: ImageIcon },
  { href: "/spray/forecasts", label: "Forecasts", icon: CloudSun },
  { href: "/spray/spray-records", label: "Spray records", icon: ClipboardList },
  { href: "/spray/settings", label: "Settings", icon: SettingsIcon },
];

export function SprayShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const { isSignedIn } = useAuth();
  const { org, loading, error, needsOrg, reload, authedFetch } = useActiveOrg();

  const skipOrgGate =
    pathname === "/spray/onboarding" ||
    pathname?.startsWith("/spray/onboarding/");

  let mainBody: ReactNode = children;
  if (isSignedIn && !skipOrgGate) {
    if (loading) {
      mainBody = (
        <div className="flex min-h-[50vh] flex-col items-center justify-center gap-3 text-center">
          <p className="text-sm text-foreground/60">Loading your Spray workspace…</p>
        </div>
      );
    } else if (error) {
      mainBody = (
        <div className="mx-auto max-w-lg rounded-lg border border-red-500/30 bg-red-500/5 p-6 md:p-8">
          <h1 className="font-display text-2xl text-red-100">Spray is unavailable</h1>
          <p className="mt-3 text-sm text-foreground/70 whitespace-pre-wrap">{error}</p>
          <button
            type="button"
            onClick={() => void reload()}
            className="mt-6 rounded-md bg-amber px-4 py-2 frame text-xs font-semibold text-background hover:bg-amber/90"
          >
            Try again
          </button>
          <p className="mt-4 text-xs text-foreground/50">
            If you just created your profile, the API may still be syncing. Wait a few
            seconds and retry, or open{" "}
            <Link href="/spray/onboarding" className="text-amber hover:underline">
              onboarding
            </Link>
            .
          </p>
        </div>
      );
    } else if (needsOrg && !org) {
      mainBody = (
        <div className="mx-auto max-w-lg rounded-lg border border-amber/40 bg-background/60 p-6 md:p-8">
          <p className="frame text-xs font-semibold uppercase tracking-wider text-amber">
            Organization required
          </p>
          <h1 className="mt-2 font-display text-2xl">Create your winery workspace</h1>
          <p className="mt-3 text-sm text-foreground/70">
            Your account is active, but you are not in a Spray organization yet. Without
            one, vineyard and sensor data cannot load and the API will return errors. Create
            an organization below (same as onboarding), then continue to the dashboard.
          </p>
          <div className="mt-8">
            <CreateSprayOrgForm
              authedFetch={authedFetch}
              onCreated={() => void reload()}
            />
          </div>
        </div>
      );
    }
  }

  return (
    <div className="flex min-h-screen bg-background text-foreground">
      <aside className="hidden w-60 shrink-0 border-r border-border/40 bg-background/60 md:flex md:flex-col">
        <Link
          href="/spray"
          className="flex h-16 items-center gap-2.5 border-b border-border/40 px-5 text-foreground transition-colors hover:text-amber"
        >
          <img
            src="/brand/graft-mark.png"
            alt=""
            aria-hidden
            draggable={false}
            className="h-5 w-auto"
          />
          <span className="frame text-[0.85rem] font-semibold">GRAFT SPRAY</span>
        </Link>

        <nav className="flex flex-1 flex-col gap-1 p-3">
          {NAV.map((item) => {
            const Icon = item.icon;
            const active =
              pathname === item.href ||
              (item.href !== "/spray/dashboard" &&
                pathname?.startsWith(item.href));
            return (
              <Link
                key={item.href}
                href={item.href}
                className={cn(
                  "flex items-center gap-3 rounded-md px-3 py-2 text-sm transition-colors",
                  active
                    ? "bg-amber/10 text-amber"
                    : "text-foreground/70 hover:bg-foreground/5 hover:text-foreground"
                )}
              >
                <Icon className="h-4 w-4" />
                {item.label}
              </Link>
            );
          })}
        </nav>

        <div className="border-t border-border/40 p-3">
          <Link
            href="/"
            target="_blank"
            rel="noopener noreferrer"
            className="block px-3 py-2 text-xs text-foreground/50 transition-colors hover:text-amber"
          >
            ← Back to Graft Systems
          </Link>
        </div>
      </aside>

      <div className="flex min-w-0 flex-1 flex-col">
        <header className="sticky top-0 z-30 flex h-16 items-center justify-between border-b border-border/40 bg-background/85 px-5 backdrop-blur">
          <div className="flex items-center gap-3">
            <span className="font-display text-lg">
              {NAV.find((n) => pathname?.startsWith(n.href))?.label ?? "Graft Spray"}
            </span>
          </div>
          <div className="flex items-center gap-4">
            <OrgSwitcher />
            <UserButton
              appearance={{ variables: { colorPrimary: "#c08a3e" } }}
              userProfileMode="modal"
            />
          </div>
        </header>

        <main className="flex-1 overflow-auto p-4 md:p-6">{mainBody}</main>
      </div>
      <nav className="fixed inset-x-0 bottom-0 z-40 grid grid-cols-5 border-t border-border/40 bg-background/95 px-2 py-2 backdrop-blur md:hidden">
        {NAV.filter((item) =>
          [
            "/spray/dashboard",
            "/spray/vineyards",
            "/spray/integrations",
            "/spray/forecasts",
            "/spray/spray-records",
          ].includes(item.href),
        ).map((item) => {
          const Icon = item.icon;
          const active =
            pathname === item.href ||
            (item.href !== "/spray/dashboard" && pathname?.startsWith(item.href));
          return (
            <Link
              key={item.href}
              href={item.href}
              className={cn(
                "flex min-h-12 flex-col items-center justify-center gap-1 rounded-md px-1 text-[0.65rem]",
                active ? "bg-amber/10 text-amber" : "text-foreground/60",
              )}
            >
              <Icon className="h-4 w-4" />
              <span className="truncate">{item.label.replace(" records", "")}</span>
            </Link>
          );
        })}
      </nav>
    </div>
  );
}
