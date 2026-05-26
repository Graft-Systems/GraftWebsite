"use client";

import { useState } from "react";
import { ChevronDown } from "lucide-react";
import type { Membership } from "@/lib/sprayApi";

export function OrgSwitcher({
  memberships,
  activeOrgId,
  onSwitch,
}: {
  memberships: Membership[];
  activeOrgId: string | null;
  onSwitch: (orgId: string) => void;
}) {
  const [open, setOpen] = useState(false);

  const active = memberships.find((m) => m.org.id === activeOrgId) ?? memberships[0];
  const label =
    memberships.length === 0
      ? "No organization"
      : (active?.org.name ?? "Organization");

  return (
    <div className="relative">
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        className="flex items-center gap-2 rounded-md border border-border/40 bg-background/40 px-3 py-1.5 text-sm transition-colors hover:border-amber/60"
      >
        <span className="max-w-[160px] truncate">{label}</span>
        {memberships.length > 1 && (
          <ChevronDown className="h-3.5 w-3.5 shrink-0 text-foreground/60" />
        )}
      </button>
      {open && memberships.length > 1 && (
        <ul className="absolute right-0 z-50 mt-2 w-56 rounded-md border border-border/40 bg-background p-1 shadow-lg">
          {memberships.map((m) => (
            <li key={m.org.id}>
              <button
                type="button"
                className={`block w-full rounded px-3 py-2 text-left text-sm transition-colors hover:bg-foreground/5 ${
                  m.org.id === activeOrgId ? "text-amber" : ""
                }`}
                onClick={() => {
                  onSwitch(m.org.id);
                  setOpen(false);
                }}
              >
                <span className="block truncate">{m.org.name}</span>
                <span className="text-xs text-foreground/50">{m.role}</span>
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
