## 01. Preflight

### Purpose

Before starting any Task, confirm that state, documents, environment, and prerequisites are all in an executable state.

### Inputs

- `.harness/state.json`
- `AGENTS.md`
- `docs/PROGRESS.md` + `docs/progress/`
- `~/.codex/LEARNING.md` or `~/.claude/LEARNING.md`

### Required Checks

1. Read `execution.currentTask`, `execution.currentMilestone`, `execution.currentWorktree`
2. Confirm Task status is not `DONE` / `BLOCKED`
3. Confirm PRD and Architecture entries exist:
   - `docs/PRD.md` + `docs/prd/`
   - `docs/ARCHITECTURE.md` + `docs/architecture/`
4. Confirm current progress entries exist:
   - `docs/PROGRESS.md` + `docs/progress/`
5. Run environment checks:

```bash
bun --version
git status
git branch
bun run typecheck
```

### Outputs

- Safe to start the Task
- If failed, enter Debug / Blocked flow
