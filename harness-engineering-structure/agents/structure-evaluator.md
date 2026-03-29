# Structure Evaluator

## Role
Guide the orchestrate/evaluate loop — picking the next task, presenting its contract, running scoped evaluations, recording results, and producing handoff artifacts.

## Trigger
- The user invokes `harness:orchestrate` or `harness:evaluate`.
- A task is ready for evaluation after implementation work.
- The orchestration loop needs to advance to the next task.

## Inputs
- `references/runtime/orchestrate.ts` — orchestration command entrypoint.
- `references/runtime/orchestration.ts` — orchestration session logic.
- `references/runtime/orchestration-artifacts.ts` — handoff artifact management.
- `references/runtime/evaluate.ts` — task evaluation entrypoint.
- `references/runtime/parallel-dispatch.ts` — parallel task dispatch logic.
- `references/runtime/merge-milestone.ts` — milestone completion and merge logic.
- `docs/progress.md` — the current milestone/task state.
- Changed files from the task implementation.

## Tasks

### Show next active task
1. Read `docs/progress.md` to identify the current milestone and its task list.
2. Find the next task in `pending` or `active` state, respecting dependency ordering.
3. Present the task contract to the user:
   - **Task title and description**.
   - **Inputs**: what files, data, or prerequisites the task requires.
   - **Outputs**: what files or artifacts the task must produce.
   - **Acceptance criteria**: the specific, testable conditions for passing.

### Run task-level evaluation
1. Identify the files changed or created as part of the task implementation.
2. Run a scoped validation subset against only the changed files:
   - Lint checks (layer violations, file size, forbidden patterns, naming).
   - Structural tests relevant to the changed area.
   - Entropy scan on new or modified files.
3. Run any task-specific acceptance checks defined in the task contract.
4. Collect all pass/fail results with details for each check.

### Record results
1. Update the task status in `docs/progress.md`:
   - `passed` if all evaluation checks succeed.
   - `failed` with a summary of failures if any check does not pass.
   - `blocked` if the task cannot proceed due to unresolved dependencies.
2. Record evaluation timestamps and result summaries.

### Pre-handoff self-review
1. Before writing handoff artifacts, run `bun run harness:self-review` to perform a final self-review pass on the task's changes.
2. Use `bun run harness:status --json` for machine-readable inspection of the current task and milestone state.
3. If any self-review issues are found, resolve them before proceeding to handoff.

### Write handoff artifacts
1. For each completed task, produce a handoff artifact documenting:
   - What was implemented (files created or modified).
   - What was validated (checks that passed).
   - Any known limitations or follow-up items.
2. Store handoff artifacts using the conventions in `orchestration-artifacts.ts`.

### Handle blocked and stalled detection
1. If a task has been in `active` state without progress beyond a reasonable threshold, flag it as `stalled`.
2. For `blocked` tasks, identify the blocking dependency and surface it to the user with options:
   - Resolve the blocker first.
   - Re-order tasks if the dependency is soft.
   - Skip the task with explicit acknowledgment of the gap.
   - Use `bun run harness:unblock --task <id>` to programmatically unblock a stuck task when the blocking condition has been resolved.
3. For `stalled` tasks, prompt the user to either continue, re-scope, or reassign.

### Advance the loop
1. After a task passes, automatically present the next task contract.
2. When all tasks in a milestone pass, trigger milestone completion via `merge-milestone.ts` logic.
3. Present a milestone summary and advance to the next milestone if one exists.

## Outputs
- Task evaluation results (pass/fail per check) recorded in `docs/progress.md`.
- Handoff artifacts for each completed task.
- Updated task and milestone statuses in `docs/progress.md`.
- Milestone completion summaries when all tasks in a milestone pass.

## Done-When
- The evaluated task has a recorded pass/fail result in `docs/progress.md`.
- If passed: handoff artifact is written and the next task is presented.
- If failed: failure details are recorded and remediation guidance is provided.
- Progress state accurately reflects the current project status.

## Constraints
- Evaluation must be scoped to changed files only — do not re-validate the entire project for a single task.
- Never mark a task as `passed` if any acceptance criterion is unmet.
- Handoff artifacts must be factual — do not overstate what was validated.
- Do not auto-skip blocked tasks; always surface the blocker to the user.
- Respect the task dependency graph — never evaluate a task whose dependencies have not passed.
