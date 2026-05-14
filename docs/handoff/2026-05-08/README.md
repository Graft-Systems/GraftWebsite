# Graft Spray Handoff - 2026-05-08

This folder is a teammate-ready snapshot of where Graft Spray stands as of 2026-05-08, intended for a developer continuing work on the main branch. Read top to bottom, then dip into spec + plans as needed.

## Read order (about 30 min total)

1. [`01-current-state.md`](./01-current-state.md) - what's built, what's deployed live, what's broken right now.
2. [`02-credentials-and-env.md`](./02-credentials-and-env.md) - every env var + API key needed across local dev, Render, Vercel.
3. [`03-local-dev.md`](./03-local-dev.md) - clone, install, run the full stack on your laptop.
4. [`04-roadmap-and-deferred.md`](./04-roadmap-and-deferred.md) - what PRs are queued, what's been intentionally deferred, what risks are tracked.
5. [`05-codebase-map.md`](./05-codebase-map.md) - where the important files live + the key abstractions to know before changing anything.
6. [`06-workflow-rules.md`](./06-workflow-rules.md) - branching, commits, PR conventions, the no-em-dashes rule, plan-first protocol.
7. [`07-customer-context.md`](./07-customer-context.md) - the SA-2 pivot rationale, the five winery conversations, who matters and why.

## Top-level references (already in the repo)

- [`docs/spec/Graft-Spray-App-Spec.md`](../../spec/Graft-Spray-App-Spec.md) - the canonical product + technical spec (~80 pages).
- [`docs/spec/CODEBASE_PLAN.md`](../../spec/CODEBASE_PLAN.md) - repo inventory, milestones, risks, open questions.
- [`docs/spec/_plans/`](../../spec/_plans/) - one plan markdown per shipped PR.
- [`CHANGELOG.md`](../../../CHANGELOG.md) - squash-merge log; every PR has an entry.
- [`docs/runbooks/`](../../runbooks/) - operational runbooks (S3 buckets, Postgres + PostGIS, weather adapter, data lake).
- [`docs/research/`](../../research/) - the "living brain" research dossier (7 categories, 405 sources).

## How to reach Benson while you're working

- Email: bensonjklein@gmail.com
- The branch model lets you work on `graft-spray/main` directly only for tiny fixes; anything bigger goes on a feature branch with a plan file in `docs/spec/_plans/`. Details in `06-workflow-rules.md`.
