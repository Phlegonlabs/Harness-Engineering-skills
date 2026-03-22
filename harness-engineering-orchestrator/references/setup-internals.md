# Setup Internals — Scaffold Generator

## Overview

The scaffold generator creates the initial project structure during the SCAFFOLD phase. It instantiates templates, infers metadata, and configures the development environment based on the detected ecosystem.

## Template Instantiation

Templates live in the skill's reference directory and are instantiated into the target project. The generator uses a variable substitution system:

### Template Variables

| Variable | Source | Example |
|----------|--------|---------|
| `{{PROJECT_NAME}}` | `state.projectInfo.name` | `my-app` |
| `{{DISPLAY_NAME}}` | `state.projectInfo.displayName` | `My App` |
| `{{ECOSYSTEM}}` | `state.toolchain.ecosystem` | `bun` |
| `{{LANGUAGE}}` | `state.toolchain.language` | `typescript` |
| `{{SOURCE_ROOT}}` | `state.toolchain.sourceRoot` | `.` |
| `{{INSTALL_CMD}}` | `state.toolchain.commands.install.command` | `bun install` |
| `{{TEST_CMD}}` | `state.toolchain.commands.test.command` | `bun run test` |
| `{{BUILD_CMD}}` | `state.toolchain.commands.build.command` | `bun run build` |

### File Skip Logic

Files are skipped during instantiation when:

1. **File already exists** — Never overwrite user content (except Harness-managed files)
2. **Ecosystem mismatch** — Python-specific files skipped for Node projects
3. **Project type mismatch** — iOS files skipped for web-only projects
4. **Level mismatch** — Full-level-only files skipped for Lite projects

Harness-managed files (always written, even if existing):
- `.harness/**` — Runtime and state
- `AGENTS.md`, `CLAUDE.md` — Agent specifications
- `agents/**` — Agent spec files

### Skip Conditions Table

| File Pattern | Skip When |
|-------------|-----------|
| `*.swift`, `*.xcodeproj` | `types` does not include `ios-app` |
| `Dockerfile`, `docker-compose.yml` | `types` does not include `api` or `web-app` |
| `docs/design/DESIGN_SYSTEM.md` | `isUiProject(types)` is false |
| `docs/gitbook/SUMMARY.md` | Harness level is `lite` |
| `.dependency-cruiser.cjs` | Harness level is `lite` |
| `e2e/**` | Harness level is `lite` |

## Metadata Inference

The scaffold generator infers metadata from the filesystem when not explicitly provided:

### Ecosystem Detection

Uses `detectEcosystem()` from `runtime/toolchain-detect.ts` when setup is not given an explicit `--ecosystem`. The precedence is: existing configured toolchain → explicit `--ecosystem` → filesystem detection → greenfield fallback.

1. Check for `bun.lockb` → `bun`
2. Check for `package-lock.json` → `node-npm`
3. Check for `pnpm-lock.yaml` → `node-pnpm`
4. Check for `Cargo.toml` → `rust`
5. Check for `go.mod` → `go`
6. Check for `requirements.txt` / `pyproject.toml` → `python`
7. Check for `build.gradle.kts` → `kotlin-gradle`
8. Check for `pom.xml` → `java-maven`
9. Default → `bun` (for greenfield TypeScript projects)

For Bun / npm / pnpm workspace-first repos, greenfield setup also normalizes `sourceRoot = "."` so guardrails and validation scan the monorepo instead of a legacy root `src/`.

### Project Type Inference

If `projectInfo.types` is empty, infer from filesystem:

- `apps/**/src/**/*.tsx` or `src/**/*.tsx` → `web-app`
- `Package.swift` → `ios-app`
- `src/main.ts` with CLI-like imports → `cli`
- `Dockerfile` + API routes → `api`

## Generated File Structure

```
project-root/
├── .harness/              # Runtime (gitignored)
│   ├── state.json
│   ├── init.ts
│   ├── orchestrator.ts
│   ├── advance.ts
│   ├── stage.ts
│   ├── audit.ts
│   ├── compact.ts
│   └── runtime/           # Validation, hooks, etc.
├── agents/                # Agent specs (gitignored)
├── docs/
│   ├── PRD.md
│   ├── ARCHITECTURE.md
│   ├── PROGRESS.md
│   ├── gitbook/SUMMARY.md
│   └── adr/
├── AGENTS.md              # Gitignored
├── CLAUDE.md              # Gitignored
├── .env.example
├── .env.local             # Gitignored
├── .github/
│   ├── workflows/ci.yml
│   └── PULL_REQUEST_TEMPLATE.md
├── apps/                  # Product surfaces
│   └── <surface>/
│       ├── package.json
│       ├── src/
│       └── tests/
├── packages/
│   └── shared/
│       ├── package.json
│       ├── src/
│       └── tests/
├── turbo.json
└── scripts/
    └── harness-local/
        ├── restore.ts
        └── manifest.json
```

## Post-Scaffold Validation

After scaffold generation, the structural checks in `phase-structural.ts` validate:

- All expected files exist
- Package.json scripts are present
- CI workflow is valid
- Git hooks are installed
- Gitignore includes required entries
