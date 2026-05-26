"use client";

import { GraftLogo } from "@/components/admin/brand/graft-logo";
import { DashboardSidebarNav } from "@/components/admin/dashboard/sidebar-nav";
import { Button } from "@/components/admin/ui/button";
import { Separator } from "@/components/admin/ui/separator";
import { SignOutButton } from "@clerk/nextjs";

type DashboardSidebarProps = {
  userName: string;
  userEmail: string;
};

export function DashboardSidebar({
  userName,
  userEmail,
}: DashboardSidebarProps) {
  return (
    <aside className="flex w-64 shrink-0 flex-col border-r border-sidebar-border bg-sidebar text-sidebar-foreground shadow-[inset_-1px_0_0_rgba(255,255,255,0.06)]">
      <div className="px-5 py-6">
        <GraftLogo onDark />
        <p className="mt-4 text-sm leading-snug text-sidebar-foreground/80">
          People, conversations, and next steps.
        </p>
      </div>
      <Separator className="bg-sidebar-border" />
      <DashboardSidebarNav />
      <div className="border-t border-sidebar-border px-4 py-4">
        <p className="text-sm font-semibold text-sidebar-foreground">{userName}</p>
        <p className="mt-0.5 text-xs text-sidebar-foreground/75">{userEmail}</p>
        <div className="mt-3">
          <SignOutButton>
            <Button
              variant="outline"
              size="sm"
              className="w-full border-sidebar-border bg-transparent text-sidebar-foreground hover:bg-sidebar-accent hover:text-sidebar-accent-foreground"
            >
              Sign out
            </Button>
          </SignOutButton>
        </div>
      </div>
    </aside>
  );
}
