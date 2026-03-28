# AGENTS.md

> This file is the universal agent entry point. It is a **routing document** — not a rules dump.
> Read the sections below in order, then navigate to the deeper sources of truth.
>
> **If this file diverges from `docs/internal/agent-entry.md`, the shared doc wins.**

---

## Read First

For **small tasks** (single file, single concern):
1. This file
2. `docs/internal/agent-entry.md`

For **medium tasks** (cross-file, one layer):
1. This file
2. `docs/internal/agent-entry.md`
3. `docs/architecture.md`
4. `docs/progress.md`

For **large tasks** (new feature, cross-layer):
1. This file
2. `docs/internal/agent-entry.md`
3. `docs/product.md` + `docs/architecture.md`
4. `docs/progress.md`
5. `docs/internal/orchestrator-workflow.md`
6. `docs/internal/dependency-layers.md`
7. `docs/internal/boundaries.md`

---

## Project Context

| Document | Purpose |
|----------|---------|
| `docs/product.md` | What we're building and why |
| `docs/architecture.md` | How the system is structured |
| `docs/progress.md` | Milestones, tasks, and worktree dispatch status |
| `docs/glossary.md` | Shared terminology |
| `docs/decisions/` | Architecture Decision Records (ADRs) |

---

## Critical Rules (inline summary)

Full rules live in `docs/internal/agent-entry.md`. These 6 are non-negotiable:

1. **Follow the dependency layer order** — see `harness/rules/dependency-layers.json`
   `Types → Config → Repo → Service → Runtime → UI`
   Each layer may only import from layers below it inside a workspace.

2. **Keep files under 500 lines** — see `harness/rules/file-size-limits.json`
   Split files that approach this limit into focused modules.

3. **Run validation before handing off** — `bun run harness:validate`
   If it fails, fix it. Do not leave the harness in a broken state.

4. **Use conventional commits** — `type(scope): description`
   Types: `feat`, `fix`, `docs`, `refactor`, `test`, `chore`, `harness`

5. **No backwards-compat code** — no `_old` suffixes, no dead exports, no TODO stubs
   If something is unused, delete it.

6. **Repository is the single source of truth** — decisions in Slack/chat are invisible to agents
   Anything important must be written into `docs/`.

---

## Three-Tier Boundaries

### ALWAYS DO
- Run `bun run harness:validate` before any handoff
- Run `bun run harness:evaluate --task <id>` before considering an active task done
- Follow the dependency layer order in all new code
- Update `docs/` when making architectural decisions
- Use conventional commit format

### ASK FIRST
- Adding a new external dependency (package/library)
- Creating a new top-level directory
- Modifying files in `harness/rules/` (changing the golden rules)
- Changing CI/CD workflow files

### NEVER DO
- Skip or bypass validation
- Break the dependency layer order
- Commit secrets, API keys, or credentials
- Modify `.git/` directly
- Write backwards-compat shims for removed code

---

## Validation

```bash
bun run harness:validate
```

This runs: health check → linters → structural tests → entropy scans.
All must pass before a PR is ready.

Quick individual checks:
```bash
bun run harness:doctor
bun run harness:lint
bun run harness:structural
bun run harness:entropy
```

---

## Skills (Load on Demand)

Skills provide detailed guidance for specific task types. Load them when you need them — don't read all of them upfront. The runtime chooses candidates from `harness/skills/registry.json`, then loads only the minimal skill set needed for the current phase/task.

| Skill | Load When |
|-------|----------|
| `skills/research/SKILL.md` | Before working in an unfamiliar area |
| `skills/implementation/SKILL.md` | Implementing a feature |
| `skills/testing/SKILL.md` | Writing or improving tests |
| `skills/code-review/SKILL.md` | Reviewing a PR |
| `skills/deployment/SKILL.md` | Before opening a PR |

---

## Execution Plans

For complex multi-phase features, create an execution plan before coding:
- Template: `docs/execution-plans/TEMPLATE.md`
- Place plans in: `docs/execution-plans/<feature-name>.md`

Milestones and tasks live in `docs/progress.md` and `.harness/state.json`.
Different milestones may run in parallel in isolated worktrees.

---

## Quality

Track domain and layer quality in `docs/quality/GRADES.md`.
Update after significant changes.

---

## Tool Availability

| Command | Purpose |
|---------|---------|
| `bun run harness:init -- <name>` | Initialize the engineer template for a specific project |
| `bun run harness:doctor` | Health check |
| `bun run harness:discover --reset` | Re-enter guided PRD/architecture discovery mode |
| `bun run harness:evaluate --task <id>` | Run the task-level evaluator and write evaluation / handoff artifacts |
| `bun run build` | Run workspace builds through Turbo |
| `bun run lint` | Run root + workspace lint checks |
| `bun run typecheck` | Run root + workspace type checks |
| `bun run test` | Run workspace test suites |
| `bun run harness:validate` | Full validation suite |
| `bun run harness:plan` | Sync milestones/tasks from PRD + architecture |
| `bun run harness:orchestrate` | Show next task and suggested skills |
| `bun run harness:parallel-dispatch -- --apply` | Preview or allocate milestone worktrees |
| `bun run harness:merge-milestone -- M1` | Merge one completed milestone |
| `bun run harness:install-hooks` | Install git hooks |

---

*Full canonical rules: `docs/internal/agent-entry.md`*
*Boundaries detail: `docs/internal/boundaries.md`*
*Layer model detail: `docs/internal/dependency-layers.md`*
*Orchestration detail: `docs/internal/orchestrator-workflow.md`*
