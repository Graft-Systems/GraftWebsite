# Claude Agent Team Lead Workflow

This repo is set up for a Codex-led, Claude-agent workflow:

1. Codex acts as team lead and final integrator.
2. Claude Code agents do bounded implementation, review, or QA tasks.
3. Each agent gets its own git worktree.
4. Agents do not commit unless explicitly told.
5. Codex reviews diffs, resolves integration issues, verifies, and owns the final commit or PR.

## Default Roles

- `planner`: turn a goal into an implementation plan, risks, and file ownership.
- `api`: implement bounded Django/API changes under `services/api`.
- `worker`: implement bounded Celery/background-worker changes under `services/worker`.
- `web`: implement bounded frontend changes under `apps/web`.
- `reviewer`: inspect a diff for bugs, regressions, and missing tests.
- `qa`: run tests and smoke-test local or deployed behavior.

## Launching An Agent

Use:

```bash
scripts/claude-agent planner "Plan the implementation for ..."
scripts/claude-agent api "Implement only the API slice ..."
scripts/claude-agent worker "Implement only the worker slice ..."
scripts/claude-agent web "Implement only the web slice ..."
scripts/claude-agent reviewer "Review the current branch against origin/graft-spray/main ..."
scripts/claude-agent qa "Run tests and smoke-test ..."
```

The script creates a Claude Code session with:

- `--worktree`, so the agent works away from the main checkout.
- `--name`, so sessions are easy to resume.
- `--permission-mode acceptEdits`, so edits can be made without prompting for every file.
- a gstack bootstrap instruction.

## Team Lead Rules

- Break work into non-overlapping ownership whenever possible.
- Give every agent a narrow prompt with a clear stop condition.
- Tell agents not to commit by default.
- Inspect every agent diff before merging, copying, or committing changes.
- Run local verification after integration.
- Commit only the final reviewed state.

