# CLAUDE.md

> Claude Code specific instructions. Shared rules live in `docs/internal/agent-entry.md`.
> **If this file diverges from `docs/internal/agent-entry.md`, the shared doc wins.**

---

## Read First

Same order as `AGENTS.md` — for large tasks also read:
- `docs/internal/agent-entry.md` (canonical rules)
- `docs/internal/orchestrator-workflow.md` (planning + execution model)
- `docs/internal/boundaries.md` (what requires approval)
- `docs/internal/dependency-layers.md` (layer model)
- `docs/progress.md` (milestones + tasks)

Codex and Claude share the same architecture, state model, and command surface.
This file is only a thin Claude-specific tool adapter.

---

## Claude Code Tool Usage

Prefer dedicated tools over bash equivalents:

| Task | Use This | Not This |
|------|----------|----------|
| Read a file | `Read` tool | `cat`, `head`, `tail` |
| Edit a file | `Edit` tool (targeted) | `sed`, `awk` |
| Create a file | `Write` tool | `echo >`, `cat <<EOF` |
| Search files | `Glob` tool | `find`, `ls` |
| Search content | `Grep` tool | `grep`, `rg` |
| Complex search | `Agent` (Explore) | multiple greps |

Use `Bash` only for actual shell operations (running scripts, git commands, etc.).

---

## Task Tracking

For multi-step work, use `TodoWrite` to track progress:
- Create todos at the start of a session
- Mark `in_progress` before starting each task
- Mark `completed` immediately when done
- Keep at most 1 task `in_progress` at a time

---

## Commit Conventions

```
type(scope): description

Types: feat, fix, docs, refactor, test, chore, harness
```

When committing:
1. Stage specific files (not `git add -A` or `git add .`)
2. Use a HEREDOC for multi-line commit messages
3. Never skip hooks (`--no-verify`)

---

## Skills (Progressive Disclosure)

Load a skill when you need detailed guidance on a specific task type. They live in `skills/` and are loaded on demand — not pre-loaded into every session. The repo-owned trigger map lives in `harness/skills/registry.json`.

| Skill | When to Load |
|-------|-------------|
| `skills/research/SKILL.md` | Before working in an unfamiliar area |
| `skills/implementation/SKILL.md` | When implementing a new feature |
| `skills/testing/SKILL.md` | When writing or improving tests |
| `skills/code-review/SKILL.md` | When reviewing a PR or validating changes |
| `skills/deployment/SKILL.md` | Before opening a PR or deploying |

---

## Available Scripts

| Script | Purpose |
|--------|---------|
| `bun run harness:init -- <name>` | Initialize with project name |
| `bun run harness:doctor` | Health check |
| `bun run harness:discover` | Ask and persist PRD/architecture discovery state |
| `bun run harness:evaluate --task <id>` | Run the task-level evaluator and persist evaluation / handoff artifacts |
| `bun run harness:validate` | Full validation |
| `bun run harness:plan` | Sync milestones/tasks from PRD + architecture |
| `bun run harness:orchestrate` | Show next task and suggested skills |
| `bun run harness:parallel-dispatch -- --apply` | Preview or allocate milestone worktrees |
| `bun run harness:merge-milestone -- M1` | Merge a milestone worktree back to main |
| `bun run harness:install-hooks` | Install git hooks |
| `bun run harness:lint` | Run all linters (layers, file size, naming, forbidden, doc freshness) |
| `bun run harness:structural` | Run structural tests (required files, architecture, doc links, runtime) |
| `bun run harness:entropy` | Run entropy scans (drift, orphans, consistency) |
| `bun run build` | Build all workspaces |
| `bun run lint` | Lint all workspaces |
| `bun run typecheck` | Type-check all workspaces |
| `bun run test` | Test all workspaces |

---

## Hooks (Back-Pressure)

`hooks/pre-stop.sh` runs automatically before the agent session ends (configured in `.claude/settings.json`). It should enforce the same validation policy as Codex-side handoff: health + linters + structural tests + entropy review.

**Do not bypass hooks. Fix the underlying issue.**

---

## When You're Stuck

1. Read the relevant ADR in `docs/decisions/` — the decision may already be made
2. Check `docs/architecture.md` for module boundaries
3. Check `docs/progress.md` for the current milestone and task
4. Load `skills/research/SKILL.md` if the area is unfamiliar
5. If a pattern isn't documented, **document it before implementing**
6. If scope is unclear, do less and ask

---

## Validation Requirement

Run `bun run harness:validate` before every handoff.
If it fails, fix the issue — do not hand off a broken state.

---

*Canonical rules: `docs/internal/agent-entry.md`*
*Orchestration detail: `docs/internal/orchestrator-workflow.md`*
