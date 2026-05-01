// @graft/ui
//
// Shared UI primitives, design tokens, and Tailwind base config consumed by
// apps/web (marketing + the Spray app shell) and apps/mobile (M2+).
//
// At M0-01 this package is a SKELETON. Real exports land per the spec:
//
// - shadcn/ui primitives (Button, Input, Dialog, Sheet, Tabs, Card, Table)
//   move here from apps/web/components/ui/* in M0-02 alongside the Spray
//   app shell work.
// - Brand design tokens (colors, typography, spacing, font CSS variables)
//   extract from apps/web/tailwind.config.ts to ./tokens/ in M0-02.
// - Tailwind base config (./tailwind.config.ts) extends in apps/web and
//   apps/mobile so spacing, color, and typography scales stay in sync.
//
// Until M0-02 lands, importing from @graft/ui is a no-op; do not depend on
// any specific export.

export {};
