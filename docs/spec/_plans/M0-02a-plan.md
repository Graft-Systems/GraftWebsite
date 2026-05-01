# M0-02a Plan — Website Integration (`/spray` nav + app shell)

**Status:** PLAN ONLY. No implementation in this commit. Implementation begins after Benson approves.
**Branch:** `graft-spray/m0/website-integration`
**PR target:** `graft-spray/main`
**Depends on:** M0-02 (PR #6) merged. M0-02 stood up Clerk auth, the `(spray)/onboarding` stub, and the auth-aware nav. This PR replaces the stub with the real app shell and adds the marketing landing.
**Spec section reference:** [`Graft-Spray-App-Spec.md` §21](../Graft-Spray-App-Spec.md), [`CODEBASE_PLAN.md` §6 PR #2a](../CODEBASE_PLAN.md). Open Question Q5 (subpath routing) RESOLVED.
**Estimated diff size:** Medium (~1,000 LoC frontend, no backend changes).
**Estimated effort:** 4 to 6 hours of implementation work, all frontend, no Render or env-var changes.

---

## 1. Goal

After this PR lands, the marketing site has a first-class "Spray" entry that behaves like a real product offering:

- A new top-level **Spray** link in the marketing nav, positioned right of "Tool" and before "Contact".
- `graftsystems.com/spray` is a marketing landing page (public, indexed, SSR'd) with hero copy, three-bullet value prop, and a primary CTA.
- Clicking the CTA (or the nav link, if the user is already logged in) drops them into the authenticated Spray app shell.
- The authenticated app shell at `/spray/dashboard` looks and feels like a working tool (left sidebar, top bar with org switcher and user menu), distinct from the marketing chrome.
- Post-login routing branches: brand-new user with no Org → `/spray/onboarding`; existing user → `/spray/dashboard`.
- Logout returns to `/spray` (the marketing landing), not the homepage.
- SEO: `/spray` is in the sitemap and indexed; `/spray/dashboard/*` and other authenticated routes are `noindex`.

This PR does NOT yet wire any real Spray feature (vineyard creation, weather feeds, capture flow). The dashboard is a placeholder that says "Welcome back, [name]" with empty-state cards. The full feature surface lights up across M0-03 through M1-15.

## 2. Decisions locked from spec

| Topic | Resolution | Source |
|---|---|---|
| Routing model | Option A subpath: `graftsystems.com/spray/*` via App Router parallel route groups | §21.3 |
| Authenticated app surface lives at | `apps/web/app/spray/(app)/...` (real folder for `/spray` prefix, parens group for shared layout) | This plan §4.1 |
| Marketing landing lives at | `apps/web/app/spray/page.tsx` | This plan §4.1 |
| Existing onboarding stub at `app/(spray)/onboarding/` | Move to `app/spray/(app)/onboarding/` (new URL: `/spray/onboarding`) | This plan §4.4 |
| App shell composition | Persistent left sidebar + top bar with org switcher + user menu | §7, §21.5 |
| Code-splitting | Dynamic-import the app-shell sidebar so marketing bundles do not pull it in | §21.6 |
| Nav placement of "Spray" link | Right of "Tool", left of "Contact" | §21.2 |
| Logout destination | `/spray` (marketing landing), not `/` | §21.4 |
| Brand-tokens consumer | Deferred to M0-04 alongside `packages/ui` shadcn extraction; M0-02a uses Tailwind classes inline | §21.7 step 7 vs M0-04 scope |
| Lighthouse parity | Marketing routes must remain inside the same bundle they were in pre-PR; no new heavy imports introduced into marketing layout | §21.6 |

## 3. Pre-flight checklist

These get captured / confirmed before merge:

- [ ] Vercel preview deploy renders `/spray` and `/spray/dashboard` cleanly (manual verify).
- [ ] Marketing routes (`/`, `/about`, `/tool`, `/contact`) unchanged visually and in network waterfall.
- [ ] Clerk middleware still protects `/spray/dashboard/*` and `/spray/onboarding`; redirects unauth'd visitors to `/sign-in?redirect_url=/spray/dashboard`.
- [ ] Logout from inside the app shell returns to `/spray` landing (not homepage).
- [ ] `pnpm --filter @graft/web build` passes locally and in CI.
- [ ] `pnpm --filter @graft/web lint` passes (rule sets remain `continue-on-error: true` in CI per M0-01 stance, but local should be clean).
- [ ] CHANGELOG.md updated with M0-02a entry.
- [ ] CODEBASE_PLAN.md PR #2a row flipped to ready-for-merge.
- [ ] No new R-risks introduced; or if any, logged in CODEBASE_PLAN.md §11.

## 4. Implementation steps

### Step 1: Plan PR (THIS COMMIT)

This file is the only change. PR opens immediately, base `graft-spray/main`, marked Draft. Benson approves, then steps 2-10 land as separate commits on the same branch.

### Step 2: Restructure auth route group

The M0-02 onboarding stub lives at `apps/web/app/(spray)/onboarding/page.tsx` which produces the URL `/onboarding` (parens make `(spray)` a layout-only group with no path segment). The spec calls for `/spray/onboarding` and `/spray/dashboard`. To get both the URL prefix AND a shared app-shell layout, we use a real folder `spray/` with a nested parens group `(app)/`:

```
apps/web/app/
  spray/
    page.tsx                  → /spray            (marketing landing, public)
    (app)/
      layout.tsx              → app shell wrapper (sidebar + topbar)
      dashboard/page.tsx      → /spray/dashboard  (auth required)
      onboarding/page.tsx     → /spray/onboarding (auth required, moved from (spray)/onboarding)
```

The old `(spray)/` directory (parens group) is removed.

### Step 3: Marketing landing at `/spray`

`apps/web/app/spray/page.tsx`:

- Server component (renders SSR for SEO).
- Sections: hero with brand-amber accent, three-bullet value prop ("Know your yield before harvest", "Spray smarter, not more", "Build your vineyard's data backbone"), primary "Sign up" CTA, secondary "Log in" link.
- CTA links to `/sign-up?redirect_url=/spray/dashboard`. Logged-in visitors that land on `/spray` see the same marketing copy with the CTA swapped to "Open dashboard" via a small client component that reads `useUser()`.
- No marketing footer-cut needed: existing `<Footer />` from `apps/web/app/layout.tsx` already renders.
- Uses existing typography and color tokens from `apps/web/app/globals.css` and `tailwind.config.ts`. No new design tokens.

### Step 4: App shell layout

`apps/web/app/spray/(app)/layout.tsx`:

- Marked `"use client"` because it reads `useUser()` and renders the `<UserButton>`.
- Replaces `<Nav />` and `<Footer />` (which come from the root `app/layout.tsx`) by virtue of the route group's own layout taking over the rendered tree below it. The root layout still wraps the whole tree with `<ClerkProvider>` and font variables; the marketing chrome is suppressed inside `(app)/` via a layout-level CSS scope class on the body.
- Composition:
  - Left sidebar (240px wide on desktop, drawer on mobile): logo at top (links back to `/spray`), nav items "Dashboard", "Vineyards", "Forecasts", "Spray records", "Settings" (most are placeholders for now, link to `/spray/dashboard` until their pages exist in later milestones).
  - Top bar: page title (left), org switcher dropdown (center-right), `<UserButton>` (right). Org switcher is a placeholder showing the caller's first Org name with a chevron; the dropdown lists all Orgs from `GET /api/spray/orgs/me`. Clicking another Org calls a `setActiveOrg` stub that updates an `X-Org-Id` cookie (for now). Real switching wires up in M0-03 once Vineyards exist.
  - Main content area: the page-level `children`.
- Replaces `<Nav />` from the root layout? Cleanest path: the root `app/layout.tsx` keeps rendering `<Nav />` and `<Footer />`, and the `(app)/layout.tsx` wraps its children in a div that uses CSS `position: fixed` + a portal-like z-index to overlay the marketing chrome. **Simpler alternative (preferred):** root layout reads the pathname via a small client component and conditionally renders marketing chrome only when the path does NOT start with `/spray/dashboard`, `/spray/onboarding`, or any other authenticated `/spray/(app)/*` route. We use this approach. The root layout becomes route-aware via a `<MarketingChromeGuard>` child that wraps `<Nav />` and `<Footer />`.

### Step 5: Add "Spray" link to nav

`apps/web/components/layout/Nav.tsx` already has the auth-aware right side from M0-02. Add a new `LINKS` entry between "Tool" and "Contact":

```ts
const LINKS = [
  { href: "/", label: "Home" },
  { href: "/about", label: "About" },
  { href: "/tool", label: "Tool" },
  { href: "/spray", label: "Spray" },
  { href: "/contact", label: "Contact" },
];
```

When the user is signed in, the "Spray" `<Link>` `href` resolves to `/spray/dashboard` (so a one-click deep-link). When signed out, it stays `/spray` (marketing landing). Achieved via a small inline conditional using the `isSignedIn` boolean already pulled from `useAuth()`.

### Step 6: Post-login router

When a user finishes the Clerk sign-in or sign-up flow, Clerk redirects them to `forceRedirectUrl` (currently `/onboarding` from M0-02). Update both `/sign-in` and `/sign-up` pages to send users to a new server route `/spray/post-login`:

`apps/web/app/spray/post-login/page.tsx`:

- Server component. Reads `auth()` from `@clerk/nextjs/server`.
- Calls `GET /api/spray/orgs/me` server-side using the user's session token.
- If response is empty → `redirect("/spray/onboarding")`.
- If response has at least one Org → `redirect("/spray/dashboard")`.
- If the API call fails (Render still on old codebase pre-M0-closeout) → fall through to `/spray/onboarding` so the flow does not dead-end. This degrades gracefully until the spray app deploys to Render at milestone closeout.

### Step 7: Logout destination

The `<UserButton>` from `@clerk/nextjs` accepts an `afterSignOutUrl` prop. Set it to `/spray` everywhere the button renders (root nav and app-shell topbar). Spec §21.4.

### Step 8: SEO

`apps/web/app/sitemap.ts` (new file, server-side):

```ts
import type { MetadataRoute } from "next";

export default function sitemap(): MetadataRoute.Sitemap {
  const base = "https://graftsystems.com";
  return [
    { url: `${base}/`, priority: 1.0 },
    { url: `${base}/about`, priority: 0.6 },
    { url: `${base}/tool`, priority: 0.6 },
    { url: `${base}/contact`, priority: 0.4 },
    { url: `${base}/spray`, priority: 0.9 },
  ];
}
```

`apps/web/app/spray/(app)/layout.tsx` exports `metadata: { robots: "noindex, nofollow" }` so authenticated pages stay out of search indexes. Spec §21.7 step 8.

### Step 9: Code-split guard

The app-shell sidebar component imports nothing heavy at M0-02a (icons from `lucide-react` already in deps), so no explicit `dynamic()` import is needed yet. We add an ESLint-style rule (just a doc note in the file header) that future Spray-only components must NOT be imported by anything outside `app/spray/(app)/**`. Actual enforcement lands in M0-04 alongside `packages/ui`.

### Step 10: Tests

`apps/web/__tests__/` (new):

- `nav.test.tsx` — Vitest + React Testing Library. Renders `<Nav />` in three states (signed-out, signed-in-without-org-load, signed-in-with-orgs). Asserts the "Spray" link target switches between `/spray` and `/spray/dashboard`.
- `marketing-chrome-guard.test.tsx` — Vitest. Renders `<MarketingChromeGuard>` with mocked `usePathname()` returning each of `/`, `/spray`, `/spray/dashboard`, `/spray/onboarding`. Asserts marketing chrome shows for the first two and hides for the latter two.
- `post-login.test.tsx` — Vitest. Mocks `auth()` and the `/api/spray/orgs/me` fetch. Asserts the redirect target switches based on org count.

Vitest is not yet wired into `apps/web` (M0-01 left it for "future expansion"). This step adds:
- `apps/web/package.json` devDeps: `vitest`, `@testing-library/react`, `@testing-library/jest-dom`, `jsdom`.
- `apps/web/vitest.config.ts` (jsdom env, jest-dom setup).
- `apps/web/package.json` scripts: `"test": "vitest run"`, `"test:watch": "vitest"`.
- The `pnpm turbo run test` step in CI already exists from M0-01 with `continue-on-error: true`. After this step, drop the `continue-on-error` for the test step (third hard requirement after build and Django check).

### Step 11: Verification before merge

- [ ] `pnpm --filter @graft/web test` all green locally.
- [ ] `pnpm --filter @graft/web build` succeeds.
- [ ] `pnpm --filter @graft/web lint && pnpm --filter @graft/web type-check` clean.
- [ ] Manual E2E on Vercel preview:
  - [ ] Logged-out visitor: `/` shows existing nav with "Spray" link; click → `/spray` landing renders; click CTA → Clerk sign-up; complete signup → lands on `/spray/onboarding` (new user) or `/spray/dashboard` (existing user, if test account has an Org).
  - [ ] Logged-in visitor: `/spray` shows landing with "Open dashboard" CTA; click → `/spray/dashboard` shows app shell; nav "Spray" link goes directly to dashboard.
  - [ ] App shell: sidebar nav items render (placeholders OK), org switcher renders the user's Org name, `<UserButton>` works, sign-out returns to `/spray`.
  - [ ] Marketing routes (`/`, `/about`, `/tool`, `/contact`) unchanged.
- [ ] Lighthouse Performance score on `/` not worse than pre-PR baseline by more than 2 points (measured via Vercel's Lighthouse CI add-on if configured, else manual via Chrome DevTools).
- [ ] CHANGELOG.md updated.
- [ ] CODEBASE_PLAN.md acceptance row updated.

## 5. Rollback plan

If anything breaks after merge:

- **R1 — `/spray/*` routes 500.** Revert the squash-merge commit; marketing nav loses the Spray link, no other regressions.
- **R2 — Marketing pages render with app shell or vice versa.** Likely a `MarketingChromeGuard` bug. Hotfix: hard-code marketing chrome to render always; ship a follow-up to gate it correctly.
- **R3 — Clerk redirect loops.** Likely the `/spray/post-login` server component failing to read the API. Fall-through to `/spray/onboarding` is built into Step 6 to prevent loops; if loops still occur, point `forceRedirectUrl` back to `/onboarding` on `/sign-in` and `/sign-up` pages as a hotfix.
- **R4 — Vercel build fails on the new sitemap.ts.** Delete the file; sitemap is non-blocking SEO sugar.

## 6. Risks introduced

| ID | Risk | Likelihood | Impact | Mitigation |
|---|---|---|---|---|
| **R26** (NEW) | `MarketingChromeGuard` swallowing nav on marketing routes due to client-side hydration mismatch | Low | Medium | Component runs on the client only; uses `usePathname()`; falls back to showing chrome on SSR (default) so SEO and first-paint are unaffected. |
| **R27** (NEW) | Org switcher fetch (`GET /api/spray/orgs/me`) fails because Render still serves pre-M0 codebase | Medium | Low | App shell renders with "Personal" placeholder when API fails; matches the planned behavior in Step 6 §post-login degradation. Lights up at M0 closeout. |
| **R28** (NEW) | Lighthouse regression on marketing `/` due to inadvertent import of app-shell code into the root layout | Low | Medium | Sidebar imports stay scoped to `app/spray/(app)/`. CI bundle-size check would catch this in M0-04; for now, a manual Chrome DevTools check on the preview deploy. |

## 7. Out of scope (deferred)

- Real dashboard widgets (vineyards list, recent forecasts) — M1-09 onward.
- `packages/ui` shadcn extraction with brand tokens — M0-04.
- Org switcher actually changes the active org — M0-03 (depends on multi-tenant data model going live).
- Mobile app shell parity — M2.
- Lighthouse CI as a hard gate — future infra task.
- Bundle-size budget enforcement — M0-04.

## 8. Effort estimate

| Step | Effort |
|---|---|
| 1 plan | 0 (this file) |
| 2 restructure routes | 0.5h |
| 3 marketing landing | 1h |
| 4 app shell | 1.5h |
| 5 nav | 0.25h |
| 6 post-login router | 0.5h |
| 7 logout destination | 0.1h |
| 8 SEO | 0.25h |
| 9 code-split guard | 0.1h |
| 10 tests + Vitest setup | 1h |
| 11 verification | 0.75h |
| **Total** | **~6h** |

## 9. Open questions for Benson

None blocking. Proceed unless you flag one of:

1. Sidebar nav item names: I have "Dashboard", "Vineyards", "Forecasts", "Spray records", "Settings". Spec §8 lists the must-have feature surface. I picked names that map cleanly. Tell me if you want different labels.
2. Org switcher placement: top bar center-right is convention, but you may prefer top-left next to the logo. Default is center-right.
3. Logged-in visitor on `/spray`: spec §21.2 says "routes directly to the authenticated app shell." I am giving them the marketing page with a swapped CTA instead, because forcing a redirect to `/spray/dashboard` makes the URL `/spray` essentially unreachable for logged-in users (which feels wrong). Tell me if you want strict redirect behavior instead.

If silent on all three, I default per the plan above.
