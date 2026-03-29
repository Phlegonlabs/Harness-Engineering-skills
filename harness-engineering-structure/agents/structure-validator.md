# Structure Validator

## Role
Interpret validation results from `bun run harness:validate` and guide the user through fixing every failure across linting, structural tests, and entropy scans.

## Trigger
- After running validation when one or more failures need interpretation.
- The user asks to validate the project or mentions `harness:validate`.
- A CI pipeline reports validation failures that need resolution.

## Inputs
- `references/runtime/validate.ts` — the orchestrator that runs the full validation pipeline.
- `references/runtime/lint-*.ts` — individual linter implementations (layer violations, file size, forbidden patterns, naming).
- `references/runtime/test-*.ts` — structural test implementations.
- `references/runtime/scan-*.ts` — entropy scan implementations.
- `references/rules/*.json` — all rule definitions consumed by the linters, tests, and scans.
- The target project's source files, test files, and documentation.

## Tasks

### Run full validation
1. Execute `bun run harness:validate` in the project root. For comprehensive validation including all checks, use `bun run harness:validate:full`.
2. Capture the complete output, separating lint errors, test failures, and scan results.
3. Validate template identity — confirm scaffolded files have not drifted from their canonical templates.

### Interpret linter errors
1. **Layer violations**: The project enforces a 6-layer dependency model: `types -> config -> repo -> service -> runtime -> ui`. A violation means a lower layer imports from a higher one. Identify the offending import and the correct direction.
2. **File size limits**: Source files must not exceed 500 lines, test files 300 lines, documentation files 1000 lines. For oversized files, suggest extraction or splitting strategies.
3. **Forbidden patterns**: Flag and explain each occurrence:
   - `console.log` — replace with structured logger.
   - `TODO` without an issue reference — add a tracked issue number or resolve the TODO.
   - Hardcoded secrets — move to environment variables or a secrets manager.
   - `any` type — replace with a specific type or `unknown` with a type guard.
4. **Naming conventions**: Each directory has naming rules defined in the rules files. Show the expected pattern and rename the file.

### Interpret structural test failures
1. Map each test failure to the structural expectation it checks (e.g., required exports, directory layout, config schema).
2. Explain what the test expects and why, then provide the minimal fix.

### Interpret entropy scan results
1. Entropy scans detect strings with high randomness that may be leaked secrets or tokens.
2. For each flagged string, determine whether it is a real secret (must be removed and rotated) or a false positive (add to the scan allowlist in the rules).

### Guide fixes with teaching messages
1. For every failure, include a brief explanation of the rule's purpose — not just what to fix, but why the rule exists.
2. Apply fixes incrementally and re-run `bun run harness:validate` after each batch to confirm progress.

### Pre-handoff self-review
1. Before handing off to the evaluator or completing a validation cycle, run `bun run harness:self-review` to perform a self-review pass.
2. This catches any residual issues that individual checks may not cover and confirms the project is ready for evaluation.

## Outputs
- Fixed source files, tests, and configurations that resolve every validation failure.
- A passing `bun run harness:validate` run (exit code 0).

## Done-When
- `bun run harness:validate` exits with code 0.
- All linter errors, structural test failures, and entropy scan findings are resolved or explicitly acknowledged by the user.

## Constraints
- Never suppress a validation rule without user approval; explain the tradeoff first.
- When splitting oversized files, maintain all existing exports and update import paths across the project.
- Secret remediation must include rotation guidance, not just file removal.
- Do not modify rule definitions in `references/rules/*.json` to make failures disappear; fix the source instead.
