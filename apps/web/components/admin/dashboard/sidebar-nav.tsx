"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  CalendarDays,
  Inbox,
  Landmark,
  Mic,
  PieChart,
  Settings2,
  Trophy,
  UserCog,
  Users,
} from "lucide-react";

import { Separator } from "@/components/admin/ui/separator";
import { cn } from "@/lib/admin/utils";

// NOTE: keep collapsed-aware rendering in sync with DashboardSidebar.
const primaryNav = [
  { href: "/admin/people", label: "People", icon: UserCog },
  { href: "/admin/companies", label: "Companies", icon: Users },
  { href: "/admin/deals", label: "Competitions", icon: Trophy },
  { href: "/admin/investors", label: "Investors", icon: Landmark },
  { href: "/admin/runway", label: "Capital", icon: PieChart },
] as const;

const workNav = [
  { href: "/admin/inbox", label: "Follow-ups", icon: Inbox },
  { href: "/admin/meetings", label: "Meetings", icon: CalendarDays },
  { href: "/admin/wispr", label: "Voice notes", icon: Mic },
  { href: "/admin/settings", label: "Settings", icon: Settings2 },
] as const;

function NavLinks({
  entries,
  collapsed,
}: {
  entries: readonly { href: string; label: string; icon: typeof Users }[];
  collapsed: boolean;
}) {
  const pathname = usePathname();

  return (
    <>
      {entries.map(({ href, label, icon: Icon }) => {
        const active =
          pathname === href ||
          (href !== "/" && pathname.startsWith(`${href}/`));

        return (
          <Link
            key={href}
            href={href}
            title={collapsed ? label : undefined}
            className={cn(
              "flex items-center rounded-lg text-sm font-medium transition-colors outline-none focus-visible:ring-2 focus-visible:ring-sidebar-ring focus-visible:ring-offset-2 focus-visible:ring-offset-sidebar",
              collapsed ? "justify-center px-2 py-2.5" : "gap-2 px-3 py-2.5",
              active
                ? "bg-amber/10 text-amber"
                : "text-sidebar-foreground/85 hover:bg-sidebar-accent/70 hover:text-sidebar-foreground",
            )}
          >
            <Icon className="size-4 shrink-0 opacity-95" aria-hidden />
            {!collapsed && <span className="truncate">{label}</span>}
          </Link>
        );
      })}
    </>
  );
}

export function DashboardSidebarNav({
  collapsed = false,
}: {
  collapsed?: boolean;
}) {
  return (
    <nav
      className={cn(
        "flex flex-1 flex-col gap-1 py-4",
        collapsed ? "px-2" : "px-4",
      )}
    >
      <NavLinks entries={primaryNav} collapsed={collapsed} />
      <Separator className="my-3 bg-sidebar-border" />
      <NavLinks entries={workNav} collapsed={collapsed} />
    </nav>
  );
}
