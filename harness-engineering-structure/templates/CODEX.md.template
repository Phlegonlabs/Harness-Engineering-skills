# CODEX.md

> Codex adapter for this repository.
> Shared rules live in `AGENTS.md`. Read that first.

---

## What To Read

1. `AGENTS.md`
2. `CODEX.md`
3. Load deeper docs only when the task touches them

---

## Codex-Specific Conventions

- Prefer `rg` and `rg --files` for search.
- Use `apply_patch` for manual edits.
- Prefer non-interactive git commands.
- Keep shell usage factual: run scripts, checks, git, and code generation from the repo.
- Use `bun run harness:status --json` instead of scraping human-readable command output.

---

## Editing Rules

- Preserve the dependency layer order.
- Add tests with the implementation, not after it.
- Keep generated surfaces in sync:
  - `docs/internal/command-surface.md`
  - `docs/progress.md`
  - `.harness/state.json`

---

## Commands You Will Use Often

- `bun run harness:status --json`
- `bun run harness:state-recover --list`
- `bun run harness:orchestrate`
- `bun run harness:evaluate --task <id>`
- `bun run harness:validate`
- `bun run harness:validate:full`
- `bun run harness:self-review`

Use `bun run harness:self-review` before handoff when a change spans multiple files or mixes code and documentation.
