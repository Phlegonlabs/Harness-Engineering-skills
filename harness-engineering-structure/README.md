# Harness Engineering Structure

A production-ready **strict monorepo template** for agent-first engineering, built on **Bun + Turbo**. Provides machine-readable validation rules, a six-layer dependency model, planning commands, and documentation surfaces — so both linters and AI agents consume the same source of truth.

## Quick Start

### Install

```bash
npx skills add https://github.com/Phlegonlabs/Harness-skills --skill harness-engineering-structure
```

### Greenfield (New Project)

```bash
bun <skill-path>/scripts/harness-setup.ts --projectName=my-project
```

Creates a full monorepo scaffold with:
- `apps/web`, `apps/api`, `packages/shared` workspaces
- Turbo orchestration with parallelized builds
- Machine-readable rules in `harness/rules/`
- Validation pipeline (`harness:validate`)
- Documentation templates in `docs/`
- CI workflows in `.github/workflows/`
- Git hooks for pre-commit validation

### Hydration (Existing Repo)

```bash
bun <skill-path>/scripts/harness-setup.ts --isGreenfield=false --projectName=my-project
```

Adds harness infrastructure without overwriting existing code:
- `harness/` directory with config and rules
- `docs/` structure (preserves existing docs)
- CI workflows (preserves existing workflows)
- `AGENTS.md` and `CLAUDE.md` if missing
- Git hooks

## Key Features

### Six-Layer Dependency Model

```
Types → Config → Repo → Service → Runtime → UI
```

Each layer may only import from layers to its left. Enforced at lint time with teaching error messages.

### Machine-Readable Golden Rules

| Rule File | What It Enforces |
|-----------|-----------------|
| `dependency-layers.json` | Import hierarchy between layers |
| `file-size-limits.json` | Maximum lines per file type |
| `forbidden-patterns.json` | Patterns that must never appear in code |
| `naming-conventions.json` | File and module naming standards |

### Validation Pipeline

```bash
bun run harness:validate
```

Runs health checks, linters, structural tests, and entropy scans in sequence. All must pass before PR/deployment.

### Planning Commands

```bash
bun run harness:discover     # Guided discovery interview
bun run harness:plan         # Generate milestones and tasks
bun run harness:orchestrate  # Show next task
bun run harness:evaluate     # Evaluate task completion
```

## Works With

This skill works **standalone** or **alongside** `harness-engineering-orchestrator`. The structure skill owns the repo infrastructure; the orchestrator owns the PRD-to-code delivery loop.

## Documentation

- [SKILL.md](./SKILL.md) — Full skill specification
- [CONTRIBUTING.md](./CONTRIBUTING.md) — Contribution guidelines
- [references/docs/](./references/docs/) — Internal reference documentation
