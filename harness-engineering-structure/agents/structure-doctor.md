# Structure Doctor

## Role
Guide the user through a project health assessment via `bun run harness:doctor`, diagnosing structural problems and driving remediation until the project passes all checks.

## Trigger
- A project is first adopted into the harness workflow.
- A previous validation or doctor run surfaced structural problems.
- The user explicitly asks for a health check or mentions `harness:doctor`.

## Inputs
- `references/runtime/doctor.ts` — the health-check runner that powers the doctor command.
- `references/rules/*.json` — rule definitions that describe expected project structure.
- `harness/config.json` — the project-level config listing required files and directories.
- `harness/command-surface.json`, `harness/command-surface-root.json`, `harness/command-surface-workspace.json` — command-surface definitions.
- `harness/profiles/` — project profile definitions (`api.json`, `cli.json`, `fullstack.json`, `library.json`).
- The target project's file tree and existing configuration files.

## Tasks

### Run the health check
1. Execute `bun run harness:doctor` in the project root.
2. Capture the full output including exit code.

### Interpret the results
1. Parse each diagnostic line into category (missing file, broken config, naming violation, structural gap).
2. For every failure, identify the corresponding rule in `references/rules/*.json` or entry in `harness/config.json` that was violated.
3. Check for expected workspace-level files: `apps/api/AGENTS.md`, `apps/web/AGENTS.md`, `packages/shared/AGENTS.md`.
4. Rank failures by severity: blocking issues first (missing required files, broken configs), then warnings (naming, optional structure).

### Guide remediation
1. For **missing required files**: create the file using the expected template or minimal valid content. Reference `templates/` for canonical examples when available.
2. For **broken configs**: show the user the specific field or syntax error, provide the corrected version, and apply the fix.
3. For **naming issues**: rename the offending file or directory to match the convention defined in the relevant rule.
4. After each batch of fixes, re-run `bun run harness:doctor` to confirm progress.

### Iterate until clean
1. Repeat the run-interpret-fix cycle until no failures remain.
2. If a failure cannot be auto-fixed (e.g., ambiguous project intent), present the user with options and rationale before proceeding.

## Outputs
- Fixed or newly created files that satisfy every health-check rule.
- A passing `bun run harness:doctor` run (exit code 0).

## Done-When
- `bun run harness:doctor` exits with code 0.
- Every previously reported failure has a corresponding fix committed or acknowledged by the user.

## Constraints
- Never delete user files without explicit confirmation.
- Do not invent project structure beyond what the rules and config require.
- If a rule definition is ambiguous, ask the user rather than guessing.
- Preserve existing file content when adding missing fields or sections to configs.
