/**
 * Org switcher dropdown (M0-02a step 4).
 *
 * Pulls the caller's Orgs from GET /api/spray/orgs/me. Renders
 * "Personal" as a placeholder when the API is unreachable (Render
 * still on pre-M0-closeout codebase) so the shell does not crash.
 *
 * Real org switching wires up in M0-03 once Vineyards exist.
 */
"use client";

import { useEffect, useState } from "react";
import { useAuth } from "@clerk/nextjs";
import { ChevronDown } from "lucide-react";

type Membership = {
  id: string;
  role: string;
  org: { id: string; name: string };
};

export function OrgSwitcher() {
  const { getToken, isSignedIn } = useAuth();
  const [memberships, setMemberships] = useState<Membership[] | null>(null);
  const [open, setOpen] = useState(false);

  useEffect(() => {
    let cancelled = false;
    async function load() {
      if (!isSignedIn) return;
      try {
        const token = await getToken();
        const res = await fetch("/api/spray/orgs/me", {
          headers: { Authorization: `Bearer ${token}` },
        });
        if (!res.ok) return;
        const json = await res.json();
        if (!cancelled) setMemberships(json.memberships ?? []);
      } catch {
        // Render API not yet on M0-02 codebase; stay in placeholder mode.
      }
    }
    load();
    return () => {
      cancelled = true;
    };
  }, [isSignedIn, getToken]);

  const active = memberships?.[0];
  const label = active?.org.name ?? "Personal";

  return (
    <div className="relative">
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        className="flex items-center gap-2 rounded-md border border-border/40 bg-background/40 px-3 py-1.5 text-sm transition-colors hover:border-amber/60"
      >
        <span className="max-w-[160px] truncate">{label}</span>
        <ChevronDown className="h-3.5 w-3.5 text-foreground/60" />
      </button>
      {open && memberships && memberships.length > 1 && (
        <ul className="absolute right-0 mt-2 w-56 rounded-md border border-border/40 bg-background p-1 shadow-lg">
          {memberships.map((m) => (
            <li key={m.id}>
              <button
                type="button"
                className="block w-full rounded px-3 py-2 text-left text-sm hover:bg-foreground/5"
                onClick={() => setOpen(false)}
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
