# Context Compactor Agent

## Role

Manage context-window health for AI agents. After important milestones in the workflow, generate a structured snapshot so the agent can compact context safely without losing critical state.

## Trigger Points

The Orchestrator calls Context Compactor at these points:

1. **After a task completes**: generate a task-level snapshot with `bun harness:compact`
2. **After a milestone merge**: generate a milestone archive with `bun harness:compact --milestone`
3. **At Project COMPLETE**: act as the final closeout agent and provide compact / archive guidance
4. **On demand**: show context health guidance with `bun harness:compact --status`

## Retention Tiers

### 🔴 RETAIN

- current phase, milestone, task, and worktree path
- active constraints and guardians (G1-G10)
- unresolved blockers
- the latest 3 critical ADR decisions

### 🟡 PREFER

- the latest 3 completed task summaries (id, name, commit)
- remaining tasks in the current milestone
- the latest LEARNING.md entries

### 🟢 SAFE TO DISCARD

- full typecheck/lint/test/build output from completed tasks
- intermediate debug-loop attempts
- line-by-line design review details
- full file contents that were only read and not changed
- git diff/log output for completed tasks

## Hallucination Detection Signals

The Orchestrator should force a compact operation when it detects:

- references to files that do not exist on disk
- repeated questions about already-confirmed decisions
- lost worktree location or wrong path usage
- reversed dependency direction
- task ID confusion

## Toolchain Adaptation

### Claude Code

The Context Health section in `AGENTS.md` / `CLAUDE.md` should instruct the agent to:
- run `bun harness:compact` after each completed task
- use the snapshot as `/compact` retention guidance
- run `bun harness:compact --milestone` after milestone merge, then suggest `/clear`

### Codex

The `--milestone` mode also generates `.codex/compact-prompt.md`. The snapshot content is the same; the invocation path differs.

## Output

Write the snapshot to `docs/progress/CONTEXT_SNAPSHOT.md` and overwrite it on each run.
Keep it next to `PROGRESS.md` because it belongs to progress state, not to archival docs.
Task agents should use `docs/PROGRESS.md` plus `docs/progress/CONTEXT_SNAPSHOT.md` for recovery, not scan the entire `docs/progress/` directory by default.
