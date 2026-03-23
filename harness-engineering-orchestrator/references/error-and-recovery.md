# Error Handling and Recovery

Covers the 11 error categories with recovery strategies, 6 doom-loop detection heuristics, and state recovery procedures.

---

## Error Categories

| Category | Examples | Severity | Default Recovery |
|----------|----------|----------|-----------------|
| `build_failure` | Compilation error, missing dependency, type error | High | Retry with fix (up to 3 retries) |
| `test_failure` | Unit test fails, integration test fails | High | Retry with fix; if persistent, split task |
| `lint_failure` | Formatting error, style violation | Medium | Auto-fix via formatter; retry |
| `timeout` | Agent exceeds soft time limit | Medium | Save partial progress; block task; escalate |
| `state_corruption` | Invalid JSON in `state.json`, missing required fields | Critical | Invoke state recovery; escalate if unrecoverable |
| `dependency_failure` | External API unavailable, package registry down | Medium | Block task; advance to next; retry later |
| `merge_conflict` | Conflicting changes during milestone merge | High | Present conflict to user; never auto-resolve |
| `doom_loop` | Cycling behavior detected (see Doom-Loop section below) | Medium | Auto-pause; escalate with evidence |
| `hallucination` | Agent references non-existent files or APIs | High | Trigger compaction; retry with fresh context |
| `gate_failure` | Phase/task/milestone gate check fails | Medium | Present failing items; fix before proceeding |
| `permission_failure` | Git push rejected, file write permission denied | Medium | Escalate to user with specific permission needed |

## Recovery Decision Tree

```
Error occurs
├── state_corruption? → Invoke state recovery → Success: resume / Fail: ESCALATE
├── merge_conflict? → ESCALATE (never auto-resolve)
├── permission_failure? → ESCALATE with required action
├── retryCount < 3?
│   YES → Apply category-specific fix → Retry
│     build_failure → Analyze error output; fix code
│     test_failure → Analyze test output; fix test or code
│     lint_failure → Run auto-formatter; retry
│     hallucination → Run compaction; reload context; retry
│     gate_failure → Fix failing gate items; re-validate
│   NO → Is task splittable?
│     YES → Split into subtasks; mark original BLOCKED
│     NO → Mark BLOCKED; advance; ESCALATE
├── timeout or dependency_failure? → Block; advance; revisit
└── doom_loop? → Auto-pause; ESCALATE with heuristic evidence
```

## Error-to-WorkflowEvent Mapping

| Error Category | WorkflowEventKind | Visibility |
|---------------|-------------------|------------|
| `build_failure` | `task_blocked` | internal |
| `test_failure` | `task_blocked` | internal |
| `state_corruption` | `safety_flag_raised` | public |
| `merge_conflict` | `task_blocked` | public |
| `doom_loop` | `task_blocked` | internal |
| `hallucination` | `task_blocked` | internal |

---

## Doom-Loop Detection

6 heuristics for detecting agent cycling behavior, with thresholds and escalation.

### H1: Repeated File Edit
- Same file edited ≥ 3 times in one task session without intermediate commit → **Warn**
- Same file edited ≥ 5 times in one task session without intermediate commit → **Auto-pause, escalate**

### H2: State Oscillation
- `BLOCKED → IN_PROGRESS → BLOCKED` cycle with same/similar `blockedReason` → **Auto-pause** after second cycle
- `IN_PROGRESS → DONE(fail) → IN_PROGRESS` cycle → Already handled by 3-retry behavior

### H3: Token Waste
- 2 consecutive responses with zero file mutations during EXECUTING → **Warn**
- >50% of per-agent token budget consumed with zero commits → **Auto-pause**, suggest task decomposition

### H4: Duplicate Action
- Same `bun harness:validate` command executed 3+ times with same failure → **Escalate**
- Agent reads same file 3+ times in one session → **Warn**, suggest compaction

### H5: Repetitive Output
- Output with >80% token overlap to previous attempt on same task → **Warn**
- 2+ consecutive outputs exceeding 80% overlap threshold → **Auto-pause, escalate** with diff summary

### H6: Semantic Stall
- >3 file writes but task DoD checklist items unchanged after validation → **Warn**
- DoD checklist unchanged after 5+ file writes and at least one validation run → **Auto-pause, escalate**

### Escalation Ladder

```
Warn → Auto-pause → Escalate
```

### Gear-Drop Protocol

On any auto-pause:
1. Switch to planning-only mode
2. Break task into subtasks
3. If still stuck: skip and escalate (mark BLOCKED with `"gear-drop: {heuristic}"`)

### Doom-Loop Type Reference

```typescript
type DoomLoopHeuristic =
  | "repeated_file_edit"
  | "state_oscillation"
  | "token_waste"
  | "duplicate_action"
  | "repetitive_output"
  | "semantic_stall"
```

---

## State Recovery

The Harness state file (`.harness/state.json`) is the single source of truth for project execution state.

### Failure Modes

**Deleted State File** — Symptom: `State not initialized. Run harness-init first.`

**Corrupt JSON** — Symptom: `State file is unreadable — The JSON is invalid or was interrupted during a previous write.`

**State Drift** — Symptom: State file exists but contains stale/inconsistent data (e.g., task marked DONE but no commit hash, milestone IN_PROGRESS but all tasks DONE).

### Quick Recovery (Automatic Backup)

The runtime maintains `.harness/state.json.backup` — the last successfully written state. When `readState()` encounters a corrupt primary file:

1. The backup file is automatically read
2. If valid, it replaces the corrupt primary file
3. A warning is emitted: `Primary state file is corrupt — recovering from backup.`
4. Execution continues normally

### Full Recovery (Re-derive from Filesystem)

If both primary and backup files are corrupt:

1. Check git history for the last valid state:
   ```bash
   git log --oneline -- .harness/state.json
   git show <commit>:.harness/state.json > .harness/state.json
   ```

2. If state was never committed (`.harness/` is gitignored):
   ```bash
   bun .harness/init.ts
   ```
   This re-initializes state from the filesystem, preserving docs and scaffold state.

3. Re-derive execution progress:
   ```bash
   bun harness:validate
   ```
   The validation pass will detect mismatches between state and filesystem.

### Post-Clone Recovery

After cloning a Harness project, local files must be restored:

```bash
bun harness:hooks:install
```

If package scripts are unavailable, the direct fallback is:

```bash
bun scripts/harness-local/restore.ts
```

### Prevention

1. **Backup is maintained automatically** — every successful `writeState()` preserves the previous version as `.backup`
2. **Atomic writes** — state is written to a temp file first, then atomically renamed
3. **Retry logic** — `readProjectStateFromDisk()` retries up to 3 times on transient read failures
4. **Validation** — `bun harness:validate` detects state inconsistencies before they compound

### State File Locations

| Path | Purpose |
|------|---------|
| `.harness/state.json` | Primary state file |
| `.harness/state.json.backup` | Last successful write |
| `.harness/state.json.*.tmp` | Transient write temp (cleaned up) |
