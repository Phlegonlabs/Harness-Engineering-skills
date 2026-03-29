# Structure Scaffolder

## Role
Handle project initialization via `bun run harness:init`, guiding setup decisions for both greenfield projects and hydration of existing repositories.

## Trigger
- Setting up a brand-new project (greenfield).
- Adding the harness structure to an existing repository (hydration).
- The user explicitly asks to initialize or scaffold a project, or mentions `harness:init`.

## Inputs
- `references/runtime/init.ts` — the initialization entrypoint.
- `references/runtime/template-baseline.ts` — baseline template logic for project scaffolding.
- `templates/` — all template files used during scaffolding.
- For hydration: the existing repository's file tree, package.json, and configuration files.

## Tasks

### Determine mode
1. Inspect the target directory. If it is empty or contains only a `.git` directory, proceed with **greenfield**. Otherwise, proceed with **hydration**.
2. Confirm the mode with the user before making changes.

### Greenfield: full monorepo scaffolding
1. Create the monorepo directory structure:
   - `apps/web/` — frontend application.
   - `apps/api/` — backend application.
   - `packages/shared/` — shared library code.
   - Workspace-level `AGENTS.md` files: `apps/api/AGENTS.md`, `apps/web/AGENTS.md`, `packages/shared/AGENTS.md`.
2. Wire tooling configuration:
   - `turbo.json` — Turborepo pipeline configuration.
   - `biome.json` — linter and formatter configuration.
   - `tsconfig.json` — root TypeScript configuration with project references.
   - Root `package.json` with workspace definitions and harness scripts.
3. Generate harness files:
   - `harness/command-surface.json`, `harness/command-surface-root.json`, `harness/command-surface-workspace.json` — command-surface definitions.
   - `harness/profiles/api.json`, `harness/profiles/cli.json`, `harness/profiles/fullstack.json`, `harness/profiles/library.json` — project profiles.
4. Add CI workflows (`.github/workflows/`) for validation, testing, and release gating.
5. Create documentation scaffolds in `docs/` (product.md, architecture.md, progress.md).
6. Scaffold skill definitions including the debugging skill (`skills/debugging/SKILL.md`).
7. Generate `AGENTS.md` with agent dispatch guidance, `CLAUDE.md` with project-specific instructions, and `CODEX.md` with Codex agent configuration.
8. Install git hooks for pre-commit validation and pre-push checks.
9. Run `bun run harness:doctor` to verify the scaffolded project is healthy.

### Hydration: add harness to existing repo
1. Add `harness/` directory containing `config.json`, rules, command-surface JSON files (`command-surface.json`, `command-surface-root.json`, `command-surface-workspace.json`), and `profiles/` directory (`api.json`, `cli.json`, `fullstack.json`, `library.json`), without overwriting any existing files.
2. Add `docs/` directory with template documentation files, preserving any docs that already exist.
3. Add CI workflow files, merging with existing workflows where possible.
4. Add `AGENTS.md`, `CLAUDE.md`, and `CODEX.md` only if they do not already exist.
5. Install git hooks, warning the user if existing hooks will be wrapped or replaced.
6. Run `bun run harness:doctor` to surface any remaining gaps.
7. Guide the user through fixing any doctor failures introduced by the hydration.

### Post-scaffold verification
1. Confirm all required files from `harness/config.json` exist.
2. Confirm `bun run harness:doctor` passes.
3. Provide a summary of everything that was created or modified.

## Outputs
- A fully scaffolded project directory (greenfield) or an augmented repository (hydration) ready for development.
- All required configuration files, documentation scaffolds, CI workflows, and git hooks in place.
- A passing `bun run harness:doctor` run.

## Done-When
- `bun run harness:doctor` passes (exit code 0).
- All required files listed in `harness/config.json` exist on disk.
- The user has confirmed satisfaction with setup decisions (mode, tooling choices, hook installation).

## Constraints
- Never overwrite existing user files during hydration without explicit confirmation.
- Preserve existing package.json scripts; append harness scripts alongside them.
- If existing CI workflows conflict, present both versions and let the user choose.
- Git hooks must not block commit or push before the project reaches the EXECUTING phase (per project policy).
- All scaffolded content must match the templates in `templates/` — do not improvise structure.
