---
name: harness-engineering-structure
description: >
  Production-ready monorepo structure with machine-readable validation rules,
  planning commands, and agent-readable documentation for Bun + Turbo workspaces.
  Use when you need a well-structured engineering repository with built-in
  dependency layers, file-size limits, forbidden patterns, naming conventions,
  guided discovery, and a task contract/evaluation loop. Works standalone or
  alongside harness-engineering-orchestrator.
---

# Harness Engineering Structure

## What This Skill Does

This skill gives you a production-ready monorepo scaffold with built-in validation, machine-readable rules, planning tools, and documentation surfaces. It encodes your team's architectural constraints as JSON files that both linters and AI agents read as a shared source of truth.

- **Strict monorepo layout** with `apps/web`, `apps/api`, and `packages/shared` workspaces orchestrated by Turbo
- **Six-layer dependency model** (`types -> config -> repo -> service -> runtime -> ui`) enforced at lint time
- **Golden rules as JSON** — dependency layers, file size limits, forbidden patterns, naming conventions
- **Full validation pipeline** (`harness:validate`) — linters, structural tests, entropy scans
- **Planning & orchestration commands** — discovery, milestone generation, task contracts, evaluation
- **Repository-owned documentation** — product, architecture, progress, glossary, ADRs

## When to Use

| Situation | This Skill Helps |
|-----------|-----------------|
| Starting a new product codebase | Get workspaces, validation, CI, and docs ready out of the box |
| Standardizing agent + human collaboration | Enforceable rules, validation gates, handoff conventions |
| Existing repo needs structure | Hydrate with harness validation, docs, and CI without overwriting existing code |

## Relationship to harness-engineering-orchestrator

These two skills are **complementary**:

| Concern | This Skill (Structure) | Orchestrator |
|---------|----------------------|--------------|
| Repo scaffold & layout | Owns | Does not own |
| Validation rules (JSON) | Owns | Does not own |
| Linters, structural tests, entropy scans | Owns | Does not own |
| Dependency layer model | Owns | Does not own |
| Planning commands (discover, plan) | Owns | Does not own |
| CI workflows & git hooks | Owns | Does not own |
| PRD-to-code delivery loop | Does not own | Owns |
| Discovery phases & guardians | Does not own | Owns |
| Milestone/task lifecycle | Does not own | Owns |

A project can use this skill **standalone** or **combined** with the orchestrator.

## Team Configuration

Teams can pre-set defaults by placing a `config.json` next to `SKILL.md`. Copy `config.example.json` to `config.json`:

```bash
cp config.example.json config.json
```

**Supported fields** (all optional):

| Field | Default | Description |
|---|---|---|
| `defaults.projectName` | — | Default project name for scaffolding |
| `defaults.ecosystem` | `bun` | Toolchain ecosystem |
| `defaults.visibility` | `private` | Repository visibility |
| `defaults.skipGithub` | `false` | Skip GitHub repo creation |
| `validation.structuralTests` | `true` | Enable structural tests |
| `validation.linters` | `true` | Enable linters |
| `validation.entropyScans` | `true` | Enable entropy scans |
| `validation.docFreshnessDays` | `30` | Doc freshness threshold |
| `org.name` | `your-org` | Default GitHub organization |
| `org.defaultUser` | `Operator` | Default user name |

## Six-Layer Dependency Model

Every workspace follows a strict import hierarchy:

```
Types → Config → Repo → Service → Runtime → UI
```

| Layer | What Goes Here | Can Import From |
|-------|---------------|-----------------|
| `types` | Type definitions, interfaces, enums | *(nothing)* |
| `config` | Configuration, constants, environment | `types` |
| `repo` | Data access, storage, external API clients | `types`, `config` |
| `service` | Business logic, domain rules | `types`, `config`, `repo` |
| `runtime` | Entrypoints, servers, CLI handlers | `types`, `config`, `repo`, `service` |
| `ui` | UI components, views, pages | all layers |

Rules are defined in `references/rules/dependency-layers.json` and enforced by the layer linter.

## Validation Pipeline

```bash
bun run harness:validate
```

Runs in order:
1. **harness:doctor** — Health check (required files, config integrity)
2. **Linters** — Layer violations, file size limits, forbidden patterns, naming conventions, doc freshness
3. **Structural tests** — Architecture compliance, doc links, required files, runtime self-test
4. **Entropy scans** — Drift detection, orphan scanning, cross-file consistency

## Planning & Orchestration Commands

| Command | Purpose |
|---------|---------|
| `harness:init` | Initialize project with name |
| `harness:doctor` | Repository health check |
| `harness:discover` | Guided discovery interview |
| `harness:plan` | Generate milestones and tasks from docs |
| `harness:orchestrate` | Show next task and suggest skills |
| `harness:evaluate` | Task-level evaluator and handoff |
| `harness:parallel-dispatch` | Allocate isolated worktrees |
| `harness:merge-milestone` | Merge completed worktree |
| `harness:install-hooks` | Install git pre-commit hooks |

## Installation

```bash
npx skills add https://github.com/Phlegonlabs/Harness-skills --skill harness-engineering-structure
```

## Setup

**Greenfield** (new project):
```bash
bun <skill-path>/scripts/harness-setup.ts --projectName=my-project
```

**Hydration** (existing repo):
```bash
bun <skill-path>/scripts/harness-setup.ts --isGreenfield=false --projectName=my-project
```

## Agents

This skill includes five agent roles:

| Agent | Role |
|-------|------|
| `structure-doctor` | Guide health checks and remediation |
| `structure-validator` | Interpret validation results and guide fixes |
| `structure-scaffolder` | Handle project initialization and hydration |
| `structure-planner` | Guide discovery, planning, and doc generation |
| `structure-evaluator` | Guide task evaluation and orchestration |

## Machine-Readable Rules

All rules live in `references/rules/` as JSON files:

- **dependency-layers.json** — Layer model with directory patterns and import constraints
- **file-size-limits.json** — Maximum lines per file type (source: 500, test: 300, doc: 1000)
- **forbidden-patterns.json** — Patterns that must never appear (console.log, TODO without issue, hardcoded secrets, `any` type)
- **naming-conventions.json** — File and module naming standards per directory

Each rule includes a **teaching message** that explains why the constraint exists, so agents learn from violations rather than just being blocked.
