## 03. Task and Milestone Gates

### Task Gate

All of the following items must pass for a task to be considered complete:

> The runtime automatically writes the checklist back to `.harness/state.json` during `completeTask()` and `bun harness:validate --task T[ID]`.

- PRD DoD achieved
- `typecheck`
- `lint`
- `format:check`
- `test`
- `build`
- File line count <= 400
- No blocking banned patterns (`console.log` / `: any` / `@ts-ignore` / `sk-...` / `Bearer ...` / `ghp_...`)
- Atomic Commit completed
- `docs/PROGRESS.md` and `docs/progress/` updated

### UI Task Additional Requirements

- Design Review passed
- Commit message contains `Design Review: ✅`

### Spike Gate

- LEARNING.md written
- ADR generated

### Milestone Gate

- All task statuses are `DONE` / `SKIPPED`
- `typecheck` / `lint` / `format:check` / `test` / `build` succeed
- Test coverage meets target
- G3: All src files <= 400 lines
- G4: Warnings are allowed but will be flagged; blocking patterns cause immediate failure
- G8: `AGENTS.md` and `CLAUDE.md` hashes match
- CHANGELOG and guide updated
