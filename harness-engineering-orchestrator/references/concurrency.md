# Concurrency

Covers parallel task execution (eligibility, file-overlap guards, OCC), worktree-based session isolation, and multi-milestone merge ordering.

Default behavior is sequential. Parallelism activates only when `projectInfo.concurrency` permits it.

---

## Concurrency Modes

| Mode | Use case | Write model |
|------|----------|-------------|
| Read-only sidecar | Review, audit, research, scan | `read-only` |
| Scoped-write parallel task | Multiple safe tasks inside one milestone | Shared worktree, explicit disjoint `affectedFiles` |
| Worktree-isolated task | Risky writes or inter-milestone work | Separate worktree |

## Eligibility Rules

A task may join a parallel batch only when all of the following are true:

- `dependsOn` is satisfied
- milestone status is `PENDING` or `IN_PROGRESS`
- no active agent already owns the same task
- no active agent owns overlapping files or scope
- no pending scope changes are waiting for review
- UI implementation is not trying to bypass missing design artifacts

Dependency interpretation:

- `dependsOn` omitted: preserve legacy sequential behavior
- `dependsOn: []`: eligible immediately
- `dependsOn: ["T001", "T002"]`: eligible only after both are done

## File Overlap Guard

Two tasks cannot run in parallel when `affectedFiles` overlap.

Rules:

- If overlap is explicit, reject the batch.
- If ownership cannot be stated clearly, stay sequential or move one task into its own worktree.
- UI work is not eligible for shared-worktree writes until the relevant design artifacts already exist.

## Execution State Extensions

Parallel mode extends `execution` with:

- `activeAgents[]`
- `pendingScopeChanges[]`
- reservation metadata such as `ownershipScope`, timeout, and runtime handle

An `ActiveAgent` entry is parent-owned and exists for lifecycle control, not as a durable workflow artifact from the child.

```typescript
interface ActiveAgent {
  agentId: string
  logicalAgentId: AgentId
  milestoneId: string
  taskId: string
  worktreePath: string
  runtimeHandle: string
  nativeRole: "default" | "worker" | "explorer" | "monitor"
  ownershipScope: string[]
  status: "running" | "waiting" | "completed" | "blocked" | "closing"
  startedAt: string
  platform: AgentPlatform
}
```

## Optimistic Concurrency Control (OCC)

All state mutations from parallel work must use `withStateTransaction()`.

Use transactions for:

- `completeTask()`
- `blockTask()`
- `registerActiveAgent()`
- `deregisterActiveAgent()`

On version conflict:

- retry up to 3 times
- if all retries fail, pause and surface the conflict

## Planner vs Launcher Boundary

Planning surface:

```bash
bun .harness/orchestrator.ts --parallel
bun .harness/orchestrator.ts --parallel --status
bun .harness/orchestrator.ts --parallel --packet-json
```

Execution surface:

```bash
bun harness:orchestrate --parallel
bun harness:orchestrate --parallel --json
bun harness:orchestrate --parallel --host-action-json
bun harness:orchestrate --confirm <launchId> --handle <runtimeHandle>
bun harness:orchestrate --rollback <launchId> --reason "<why>"
bun harness:orchestrate --release <launchId>
```

Rules:

- `dispatchParallel()` computes candidate dispatches, packets, and reservation metadata.
- The launcher consumes that plan, writes `.harness/launches/<cycleId>.json`, and updates `.harness/launches/latest.json`.
- `--host-action-json` flattens each launch into the parent-runtime action, payload, handle source, and lifecycle commands needed for host-side automation.
- Spawn failure must roll back the reservation.
- Stale agents older than twice their timeout are cleaned up automatically.

## Platform Launch Behavior

| Platform | Launch model |
|----------|--------------|
| Claude Code | `Agent` tool, typically worktree-isolated for write tasks |
| Codex CLI | Native subagents with parent-owned role hint, wait policy, close policy, and ownership scope |

Codex child rules:

1. Parent computes `SubagentDispatchPolicy` before spawn.
2. Parent may send follow-up input when required.
3. Parent waits only when blocked or batching integration.
4. Success is verified from state/filesystem evidence.
5. Child is closed after integration and deregistration.

## Session Isolation (Worktrees)

Each active worktree corresponds to one milestone session. The runtime tracks the active session through three fields in `ExecutionState`:

- `execution.currentMilestone` — the milestone ID currently being worked on (e.g. `"M2"`)
- `execution.currentTask` — the task ID within that milestone (e.g. `"T007"`)
- `execution.currentWorktree` — the filesystem path to the worktree (e.g. `"../my-app-m2"`)

### Dev Server Isolation

Each worktree session may run its own dev server. The `observability.devServers[]` array stores one `DevServerState` entry per active server, keyed by `milestoneId`.

Port allocation scans the 3000-3999 range sequentially. On worktree switch, the runtime allocates a different port to prevent conflicts between concurrent sessions.

### Session Lifecycle

1. **Create** — `git worktree add ../project-m2 milestone/m2-name` establishes the directory.
2. **Activate** — `activateNextTask()` sets the three tracking fields and starts the task loop.
3. **Pause** — Switching to a different milestone clears `currentTask` for the paused session.
4. **Merge** — `completeMilestone()` marks the milestone `MERGED`, clears tracking fields.
5. **Cleanup** — After merge, remove the worktree and prune stale references.

### Cleanup Commands

```bash
git worktree remove ../my-app-m2   # Remove after milestone merge
git worktree prune                  # Prune deleted directories
git branch -d milestone/m2-name    # Delete merged branch
```

### Constraints

- A single branch cannot have two worktrees simultaneously.
- The main worktree is never used for feature work (G2).
- Each worktree has its own `.harness/state.json` copy; the main worktree holds the canonical state.

## Milestone Merge Ordering

- Milestones merge in ID order (M1 before M2) regardless of completion order.
- A completed milestone waits in `REVIEW` if an earlier milestone has not merged.
- Rebase/merge conflicts trigger `BLOCKED` status with `merge-conflict` reason.

In parallel mode, `completeTask()` does not auto-activate the next task. The Orchestrator re-evaluates the graph on the next cycle.

## UI Routing Invariant

Parallel mode does not change the required UI sequence:

```text
frontend-designer -> execution-engine -> design-reviewer
```

Design artifacts are prerequisites, not optional side effects.
