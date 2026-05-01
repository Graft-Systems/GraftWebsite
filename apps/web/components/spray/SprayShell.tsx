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

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  LayoutDashboard,
  Map,
  CloudSun,
  ClipboardList,
  Settings as SettingsIcon,
} from "lucide-react";
import { UserButton } from "@clerk/nextjs";
import { OrgSwitcher } from "@/components/spray/OrgSwitcher";
import { cn } from "@/lib/utils";

const NAV = [
  { href: "/spray/dashboard", label: "Dashboard", icon: LayoutDashboard },
  { href: "/spray/vineyards", label: "Vineyards", icon: Map },
  { href: "/spray/forecasts", label: "Forecasts", icon: CloudSun },
  { href: "/spray/spray-records", label: "Spray records", icon: ClipboardList },
  { href: "/spray/settings", label: "Settings", icon: SettingsIcon },
];

export function SprayShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();

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

        <main className="flex-1 overflow-auto p-6">{children}</main>
      </div>
    </div>
  );
}
