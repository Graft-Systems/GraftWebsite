"use client";

import { useCallback, useEffect, useState } from "react";
import Image from "next/image";
import Link from "next/link";
import { ChevronLeft, ChevronRight, LogOut } from "lucide-react";
import { SignOutButton } from "@clerk/nextjs";

import { DashboardSidebarNav } from "@/components/admin/dashboard/sidebar-nav";
import { Button } from "@/components/admin/ui/button";
import { cn } from "@/lib/admin/utils";

type DashboardSidebarProps = {
  userName: string;
  userEmail: string;
};

const SIDEBAR_COLLAPSED_KEY = "crm.sidebar.collapsed";

export function DashboardSidebar({
  userName,
  userEmail,
}: DashboardSidebarProps) {
  const [collapsed, setCollapsed] = useState(false);

  useEffect(() => {
    try {
      if (
        typeof window !== "undefined" &&
        window.localStorage.getItem(SIDEBAR_COLLAPSED_KEY) === "1"
      ) {
        setCollapsed(true);
      }
    } catch {
      /* ignore */
    }
  }, []);

  const toggle = useCallback(() => {
    setCollapsed((prev) => {
      const next = !prev;
      try {
        window.localStorage.setItem(SIDEBAR_COLLAPSED_KEY, next ? "1" : "0");
      } catch {
        /* ignore */
      }
      return next;
    });
  }, []);

  return (
    <aside
      className={cn(
        "flex shrink-0 flex-col border-r border-sidebar-border bg-sidebar text-sidebar-foreground shadow-[inset_-1px_0_0_rgba(255,255,255,0.06)] transition-[width] duration-200 ease-out",
        collapsed ? "w-[4.25rem]" : "w-60",
      )}
    >
      <div
        className={cn(
          "flex h-16 shrink-0 border-b border-sidebar-border",
          collapsed
            ? "flex-col items-center justify-center gap-1.5 px-1"
            : "flex-row items-center justify-between gap-2 px-3",
        )}
      >
        <Link
          href="/admin"
          title="CRM home"
          className={cn(
            "flex min-w-0 items-center gap-2 text-sidebar-foreground transition-colors hover:text-amber",
            collapsed ? "justify-center" : "min-w-0 flex-1",
          )}
        >
          <Image
            src="/brand/graft-mark.png"
            alt=""
            width={80}
            height={20}
            draggable={false}
            className="h-5 w-auto shrink-0"
            priority
          />
          {!collapsed && (
            <span className="frame truncate text-[0.85rem] font-semibold">
              GRAFT CRM
            </span>
          )}
        </Link>
        <button
          type="button"
          onClick={toggle}
          aria-expanded={!collapsed}
          aria-label={collapsed ? "Expand sidebar" : "Collapse sidebar"}
          className="flex h-8 w-8 shrink-0 items-center justify-center rounded-md border border-sidebar-border text-sidebar-foreground/60 transition-colors hover:border-amber/40 hover:bg-sidebar-accent hover:text-amber"
        >
          {collapsed ? (
            <ChevronRight className="h-4 w-4" aria-hidden />
          ) : (
            <ChevronLeft className="h-4 w-4" aria-hidden />
          )}
        </button>
      </div>

      <DashboardSidebarNav collapsed={collapsed} />

      <div className="border-t border-sidebar-border p-2">
        <Link
          href="/"
          title="Back to Graft Systems"
          className={cn(
            "block rounded-md py-2 text-xs text-sidebar-foreground/60 transition-colors hover:bg-sidebar-accent hover:text-amber",
            collapsed ? "px-2 text-center" : "px-3",
          )}
        >
          {collapsed ? (
            <span aria-hidden>&larr;</span>
          ) : (
            <>
              <span aria-hidden>&larr;</span>
              <span className="ml-1.5">Back to Graft Systems</span>
            </>
          )}
        </Link>
      </div>

      <div
        className={cn(
          "border-t border-sidebar-border",
          collapsed ? "p-2" : "px-4 py-4",
        )}
      >
        {collapsed ? (
          <SignOutButton>
            <button
              type="button"
              title={`Sign out ${userEmail}`}
              aria-label="Sign out"
              className="flex h-9 w-full items-center justify-center rounded-md border border-sidebar-border bg-transparent text-sidebar-foreground/70 transition-colors hover:bg-sidebar-accent hover:text-amber"
            >
              <LogOut className="h-4 w-4" aria-hidden />
            </button>
          </SignOutButton>
        ) : (
          <>
            <p className="truncate text-sm font-semibold text-sidebar-foreground">
              {userName}
            </p>
            <p className="mt-0.5 truncate text-xs text-sidebar-foreground/75">
              {userEmail}
            </p>
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
          </>
        )}
      </div>
    </aside>
  );
}
