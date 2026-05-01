# @graft/ui

Shared UI primitives, brand design tokens, and Tailwind base configuration consumed by `apps/web` and `apps/mobile`.

## Status

**M0-01:** skeleton only. The package is wired into the workspace so future PRs can publish exports through it, but no real components or tokens land here yet.

## What lives here when populated

| Path | Lands in milestone | Contents |
|---|---|---|
| `src/components/` | M0-02 | shadcn/ui primitives (Button, Input, Dialog, Sheet, Tabs, Card, Table) extracted from `apps/web/components/ui/*` when the Spray app shell needs them |
| `src/tokens/` | M0-02 | Brand design tokens (colors, typography scale, spacing scale, font CSS variables) extracted from `apps/web/tailwind.config.ts` |
| `tailwind.config.ts` | M0-02 | Base Tailwind config that `apps/web/tailwind.config.ts` and `apps/mobile/tailwind.config.ts` extend |

## Why now (M0-01) vs. later (M0-02)

M0-01 is the structural restructure. Hoisting actual files out of `apps/web/` could break Vercel previews mid-flight; M0-02 (Account & identity, plus the start of the Spray app shell) is when the Spray surface needs shared primitives, so the extraction lands cleanly there with consumers in place.

## Consumers

- `apps/web` (Next.js marketing site + Spray app shell)
- `apps/mobile` (React Native + Expo, M2+)
