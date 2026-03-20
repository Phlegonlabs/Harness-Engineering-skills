# Version History

## Purpose

Describe the delivery-phase lifecycle, approval model, document version tracking, and snapshot mechanism that governs how a Harness project evolves across V1, V2, V3, and beyond.

## Delivery-Phase Lifecycle

Harness now tracks two separate concerns for each delivery phase:

- **Approval status**: `pending -> approved`
- **Execution status**: `draft -> executing -> deploy_gate -> complete`

Legacy product-stage status is still retained for backward compatibility and version snapshots. The legacy stage progression remains:

```
DEFERRED -> ACTIVE -> DEPLOY_REVIEW -> COMPLETED
```

| Status | Meaning |
|--------|---------|
| `DEFERRED` | Defined in the PRD but not yet executing |
| `ACTIVE` | Currently being executed after explicit plan + phase approval |
| `DEPLOY_REVIEW` | All milestones for this stage are merged; awaiting real-world review |
| `COMPLETED` | Deploy review passed; the next stage has been promoted |

Only one delivery phase may be executing at a time. The runtime enforces this with `state.roadmap.activePhaseId`, `state.roadmap.planApprovalStatus`, and `state.roadmap.phases[]`. `getCurrentProductStage()` remains the legacy stage resolver, while `getCurrentDeliveryPhase()` resolves the active phase contract.

## Stage Promotion

Promotion is performed with `bun .harness/stage.ts --promote V2`. The command:

1. Verifies the current stage is in `DEPLOY_REVIEW`
2. Resolves the next deferred stage via `getNextDeferredProductStage()`
3. Verifies the target delivery phase is explicitly approved with `bun harness:approve --phase V2`
4. Validates that PRD and Architecture document versions match the target stage using `expectedVersionPattern()` (e.g., stage `V2` requires a version matching `^v2(\b|\.)`)
5. Snapshots both documents into versioned paths
6. Marks the current stage `COMPLETED` and the target stage `ACTIVE`
7. Re-syncs execution milestones and public docs

Use `bun .harness/stage.ts --status` to inspect the current roadmap without making changes.

## Document Version Snapshots

When a stage is promoted, the current PRD and Architecture documents are frozen as point-in-time snapshots:

| Document | Snapshot Path |
|----------|---------------|
| PRD | `docs/prd/versions/prd-v1.md` |
| Architecture | `docs/architecture/versions/architecture-v1.md` |

The slug is derived from the stage ID (`v1`, `v2`, etc.). Snapshots are written by `writeSnapshot()` in `harness-stage.ts` and are never overwritten.

## Version Parsing

Document versions are extracted from the first line matching the pattern:

```
> **Version**: v1.2
```

The parser lives in `shared.ts` (`parseDocumentVersion()`). The version string is stored in `state.docs.prd.version` and `state.docs.architecture.version`.

## Key Functions

| Function | File | Role |
|----------|------|------|
| `getCurrentDeliveryPhase()` | `runtime/stages.ts` | Resolve the active delivery phase |
| `getCurrentProductStage()` | `runtime/stages.ts` | Resolve the legacy active stage |
| `getNextDeferredProductStage()` | `runtime/stages.ts` | Find the next promotable stage |
| `approvePlan()` | `runtime/stages.ts` | Record overall plan approval |
| `approveDeliveryPhase()` | `runtime/stages.ts` | Record approval for one delivery phase |
| `expectedVersionPattern()` | `harness-stage.ts` | Build regex for stage-version validation |
| `markStageDeployReview()` | `runtime/stages.ts` | Transition a stage to `DEPLOY_REVIEW` |
| `stageIsReadyForDeployReview()` | `runtime/stages.ts` | Check that all stage milestones are merged |

## Inspecting Stage Status

```bash
bun .harness/stage.ts --status
```

Prints the runtime phase, overall plan approval, current delivery phase approval/execution status, the legacy active stage, PRD and Architecture versions, and the full roadmap with per-phase version labels.
