# Contributing

This monorepo houses the Graft Systems marketing site, the Django REST API, and the Graft Spray application (under construction on `graft-spray/main`).

## Two distinct workflows

### A. Marketing site + small fixes

- Branch from `main`.
- Branch name: `your-name/short-description` (e.g. `viraaj/fix-contact-copy`).
- Open a PR targeting `main`.
- Benson reviews and merges.

### B. Graft Spray work (M0 onwards)

- Branch from `graft-spray/main`, **not** from `main`.
- Branch name: `graft-spray/<milestone>/<feature>` (e.g. `graft-spray/m0/postgis-schema`).
- Open a PR targeting `graft-spray/main`.
- **Every Spray PR begins with a written plan in the PR description before any implementation code.** See [`docs/spec/CLAUDE_CODE_PLAN.md`](./docs/spec/CLAUDE_CODE_PLAN.md) section 4 (Claude Code Operating Rules) for the full workflow.
- `graft-spray/main` merges into `main` only at milestone closeouts (M1 web MVP launch, M2 iOS launch, etc.).

## Conventions

### Conventional Commits

Commit messages use [Conventional Commits](https://www.conventionalcommits.org/):

```
feat: add /api/spray/captures endpoint
fix: correct CORS allow-list for graftsystems.com
chore: bump pnpm to 9.12
docs: update CONTRIBUTING.md
test: add pytest cases for FRAC rotation
refactor: extract risk-index thresholds to settings
plan: draft M0-02 auth-identity PR
spec: amend section 12 to include SA-1
```

### Squash-merge

PRs squash-merge into their target branch. Each PR results in a single commit on the target. Within the PR branch, commit early and often; the squash collapses everything.

### No em-dashes

Em-dashes ( — ) are not used in commit messages, PR descriptions, code comments, or documentation. Use commas, parentheses, or restructure. En-dashes are fine for page ranges (522–531).

### File header attribution

Files authored or substantially modified by Claude Code carry:

```
Co-Authored-By: Claude Opus 4.7 (1M context) <noreply@anthropic.com>
```

in the commit trailer (not the file body).

## Running locally

See [`README.md`](./README.md) for the install + run flow.

For Spray-specific work, the M0-01 plan at [`docs/spec/_plans/M0-01-plan.md`](./docs/spec/_plans/M0-01-plan.md) documents the migration that produced this monorepo.

## Branch protection

`main` and `graft-spray/main` require:

- Pull request review (Benson approves).
- CI green (`.github/workflows/ci.yml`).

Force-push is blocked on both. Force-push on a feature branch is fine until the PR opens; once open, treat the branch as appendable-only.

## When in doubt

- Read [`docs/spec/Graft-Spray-App-Spec.pdf`](./docs/spec/Graft-Spray-App-Spec.pdf) for product decisions.
- Read [`docs/spec/CODEBASE_PLAN.md`](./docs/spec/CODEBASE_PLAN.md) for architectural decisions, risk register, and open questions.
- Read [`docs/spec/CLAUDE_CODE_PLAN.md`](./docs/spec/CLAUDE_CODE_PLAN.md) for the implementing-agent operating rules.
- Open a `spec-gap` issue if any of those documents is silent or contradictory; do not guess.

## Contact

graftsystems@gmail.com or Benson directly.
