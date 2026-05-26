"use client";

import { useEffect, useRef, useState } from "react";
import { ChevronDown, Plus } from "lucide-react";
import type { Membership } from "@/lib/sprayApi";
import { CreateSprayOrgForm } from "@/components/spray/CreateSprayOrgForm";

type AuthedFetch = (path: string, init?: RequestInit) => Promise<Response>;

export function OrgSwitcher({
  memberships,
  activeOrgId,
  onSwitch,
  authedFetch,
  onOrgCreated,
}: {
  memberships: Membership[];
  activeOrgId: string | null;
  onSwitch: (orgId: string) => void;
  authedFetch: AuthedFetch;
  onOrgCreated: () => void;
}) {
  const [open, setOpen] = useState(false);
  const [creating, setCreating] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    function onDown(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) {
        setOpen(false);
        setCreating(false);
      }
    }
    document.addEventListener("mousedown", onDown);
    return () => document.removeEventListener("mousedown", onDown);
  }, [open]);

  const active = memberships.find((m) => m.org.id === activeOrgId) ?? memberships[0];
  const label =
    memberships.length === 0
      ? "No organization"
      : (active?.org.name ?? "Organization");

  return (
    <div className="relative" ref={ref}>
      <button
        type="button"
        onClick={() => {
          setOpen((o) => !o);
          setCreating(false);
        }}
        className="flex items-center gap-2 rounded-md border border-border/40 bg-background/40 px-3 py-1.5 text-sm transition-colors hover:border-amber/60"
      >
        <span className="max-w-[160px] truncate">{label}</span>
        <ChevronDown className="h-3.5 w-3.5 shrink-0 text-foreground/60" />
      </button>
      {open && (
        <div className="absolute right-0 z-50 mt-2 w-64 rounded-md border border-border/40 bg-background p-1 shadow-lg">
          {memberships.length > 0 && (
            <ul className="mb-1">
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
          {!creating && (
            <button
              type="button"
              onClick={() => setCreating(true)}
              className="flex w-full items-center gap-2 rounded px-3 py-2 text-left text-sm text-foreground/60 transition-colors hover:bg-foreground/5 hover:text-amber"
            >
              <Plus className="h-3.5 w-3.5 shrink-0" />
              Create new organization
            </button>
          )}
          {creating && (
            <div className="border-t border-border/30 mt-1 pt-3 px-2 pb-2">
              <p className="mb-3 text-xs font-semibold uppercase tracking-wide text-foreground/50">New organization</p>
              <CreateSprayOrgForm
                authedFetch={authedFetch}
                submitLabel="Create"
                onCreated={() => {
                  setOpen(false);
                  setCreating(false);
                  onOrgCreated();
                }}
              />
            </div>
          )}
        </div>
      )}
    </div>
  );
}
