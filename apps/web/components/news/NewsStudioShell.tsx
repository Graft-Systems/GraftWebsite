"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/utils";

const TABS = [
  { href: "/news/studio", label: "Articles", exact: true },
  { href: "/news/studio/permissions", label: "Permissions", exact: false },
];

export function NewsStudioShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();

  return (
    <div className="mx-auto max-w-[1100px] px-6 pb-24 pt-32 lg:px-10">
      <div className="flex flex-col gap-8 border-b border-border/40 pb-8 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <span className="frame text-[0.72rem] font-semibold text-sage">
            NEWSROOM STUDIO
          </span>
          <h1 className="display mt-3 text-3xl text-foreground">Editorial</h1>
          <p className="mt-2 max-w-lg text-sm text-foreground/70">
            Draft and publish articles for the public newsroom.
          </p>
        </div>
        <Link
          href="/news"
          className="frame text-[0.68rem] font-semibold text-foreground/80 hover:text-amber"
        >
          View public newsroom →
        </Link>
      </div>

      <nav className="mt-8 flex gap-6 border-b border-border/30">
        {TABS.map((tab) => {
          const active = tab.exact
            ? pathname === tab.href
            : pathname.startsWith(tab.href);
          return (
            <Link
              key={tab.href}
              href={tab.href}
              className={cn(
                "frame -mb-px border-b-2 pb-3 text-[0.68rem] font-semibold transition-colors",
                active
                  ? "border-amber text-foreground"
                  : "border-transparent text-foreground/60 hover:text-foreground",
              )}
            >
              {tab.label}
            </Link>
          );
        })}
      </nav>

      <div className="mt-10">{children}</div>
    </div>
  );
}
