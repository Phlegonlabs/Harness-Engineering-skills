#!/usr/bin/env bun
/**
 * .harness/stage.ts
 *
 * Delivery-phase promotion for continuous delivery:
 * - inspect roadmap approval/execution state
 * - promote the next approved draft phase after deploy / real-world review
 */

import { mkdirSync, writeFileSync } from "fs"
import { dirname } from "path"
import { syncExecutionFromPrd, syncRoadmapFromPrd } from "./runtime/backlog"
import { syncPublicManagedDocs } from "./runtime/public-docs"
import {
  getCurrentDeliveryPhase,
  getCurrentProductStage,
  getDeliveryPhase,
  getNextDeferredProductStage,
  isDeliveryPhaseApproved,
  syncRoadmapPhases,
} from "./runtime/stages"
import { readState, writeState } from "./runtime/state-core"
import { ARCHITECTURE_DIR, ARCHITECTURE_PATH, PRD_DIR, PRD_PATH, readDocument } from "./runtime/shared"
import { appendWorkflowEvent, createStagePromotedEvent, createTaskStartedEvent } from "./runtime/workflow-history"

type CliArgs = {
  promote?: string
  status: boolean
}

function parseArgs(argv: string[]): CliArgs {
  const args: CliArgs = { status: false }

  for (let index = 0; index < argv.length; index++) {
    const current = argv[index]
    if (current === "--status") {
      args.status = true
      continue
    }

    if (current === "--promote") {
      const next = argv[index + 1]
      if (next && !next.startsWith("--")) {
        args.promote = next.trim().toUpperCase()
        index += 1
      }
      continue
    }

    if (current.startsWith("--promote=")) {
      args.promote = current.slice("--promote=".length).trim().toUpperCase()
    }
  }

  return args
}

function ensureDir(path: string): void {
  mkdirSync(dirname(path), { recursive: true })
}

function writeSnapshot(path: string, content: string): void {
  ensureDir(path)
  writeFileSync(path, content.endsWith("\n") ? content : `${content}\n`)
}

function readSyncedStageState() {
  const baseState = writeState(readState())
  try {
    return writeState(syncRoadmapFromPrd(baseState).state)
  } catch {
    return baseState
  }
}

function expectedVersionPattern(stageId: string): RegExp {
  const major = Number.parseInt(stageId.replace(/^V/i, ""), 10)
  if (!Number.isFinite(major) || major <= 0) {
    throw new Error(`Invalid product stage id: ${stageId}`)
  }
  return new RegExp(`^v${major}(?:\\b|\\.)`, "i")
}

function assertStageDocumentVersion(label: string, actualVersion: string, stageId: string): void {
  const expected = expectedVersionPattern(stageId)
  if (expected.test(actualVersion)) {
    return
  }

  throw new Error(
    `${label} version is ${actualVersion}. Update the main document to the ${stageId} line (for example v${stageId.slice(1)}.0) before promotion.`,
  )
}

function printStatus(): void {
  const synced = readSyncedStageState()
  const currentDeliveryPhase = getCurrentDeliveryPhase(synced)
  const currentStage = getCurrentProductStage(synced)

  console.log(`\n${"═".repeat(50)}`)
  console.log("  Delivery Phase Status")
  console.log(`${"═".repeat(50)}\n`)
  console.log(`Runtime Phase: ${synced.phase}`)
  console.log(`Plan Approval: ${synced.roadmap.planApprovalStatus ?? "pending"}`)
  console.log(
    `Current Delivery Phase: ${currentDeliveryPhase ? `${currentDeliveryPhase.id} — ${currentDeliveryPhase.name} (execution=${currentDeliveryPhase.executionStatus}; approval=${currentDeliveryPhase.approvalStatus})` : "—"}`,
  )
  console.log(`Current Stage Runtime: ${currentStage ? `${currentStage.id} — ${currentStage.name} (${currentStage.status})` : "—"}`)
  console.log(`PRD Version: ${synced.docs.prd.version}`)
  console.log(`Architecture Version: ${synced.docs.architecture.version}`)
  console.log("")

  if (synced.roadmap.stages.length === 0) {
    console.log("No delivery phases have been parsed from docs/PRD.md yet.")
    return
  }

  console.log("Delivery phases:")
  for (const phase of synced.roadmap.phases ?? []) {
    const stage = synced.roadmap.stages.find(candidate => candidate.id === phase.id)
    const versions = [stage?.prdVersion, stage?.architectureVersion].filter(Boolean).join(" / ")
    const suffix = versions ? ` — ${versions}` : ""
    console.log(
      `- ${phase.id}: ${phase.name} [execution=${phase.executionStatus}; approval=${phase.approvalStatus}]${suffix}`,
    )
  }
  console.log("")
}

function promoteStage(stageId: string): void {
  const baseState = writeState(readState())
  const roadmapState = syncRoadmapFromPrd(baseState).state
  const currentStage = getCurrentProductStage(roadmapState)
  const currentDeliveryPhase = getCurrentDeliveryPhase(roadmapState)

  if (!currentStage || !currentDeliveryPhase) {
    throw new Error("No current delivery phase is available in state.")
  }

  if (currentDeliveryPhase.executionStatus !== "deploy_gate" || currentStage.status !== "DEPLOY_REVIEW") {
    throw new Error(
      `Current delivery phase ${currentDeliveryPhase.id} is ${currentDeliveryPhase.executionStatus}. Promote the next phase only after merge + compact has placed the current phase into DEPLOY_REVIEW.`,
    )
  }

  const nextDeferred = getNextDeferredProductStage(roadmapState)
  if (!nextDeferred) {
    throw new Error("No deferred product stage is available. Add the next stage to docs/PRD.md first.")
  }

  if (nextDeferred.id !== stageId) {
    throw new Error(
      `Next deferred product stage is ${nextDeferred.id}. Promote stages in order; requested ${stageId}.`,
    )
  }

  if (!isDeliveryPhaseApproved(roadmapState, stageId)) {
    throw new Error(`Delivery phase ${stageId} is not approved. Run bun harness:approve --phase ${stageId} first.`)
  }

  const targetStage = roadmapState.roadmap.stages.find(stage => stage.id === stageId)
  if (!targetStage) {
    throw new Error(`Product stage ${stageId} was not found in docs/PRD.md.`)
  }

  const prdSnapshot = readDocument(PRD_PATH, PRD_DIR)
  const architectureSnapshot = readDocument(ARCHITECTURE_PATH, ARCHITECTURE_DIR)
  if (!prdSnapshot) {
    throw new Error("docs/PRD.md or docs/prd/ must exist before promoting the next stage.")
  }
  if (!architectureSnapshot) {
    throw new Error("docs/ARCHITECTURE.md or docs/architecture/ must exist before promoting the next stage.")
  }

  assertStageDocumentVersion("PRD", roadmapState.docs.prd.version, stageId)
  assertStageDocumentVersion("Architecture", roadmapState.docs.architecture.version, stageId)

  const stageSlug = stageId.toLowerCase()
  const prdSnapshotPath = `docs/prd/versions/prd-${stageSlug}.md`
  const architectureSnapshotPath = `docs/architecture/versions/architecture-${stageSlug}.md`
  writeSnapshot(prdSnapshotPath, prdSnapshot)
  writeSnapshot(architectureSnapshotPath, architectureSnapshot)

  const now = new Date().toISOString()
  currentStage.status = "COMPLETED"
  currentStage.deployReviewedAt = now
  currentStage.completedAt = currentStage.completedAt ?? now

  targetStage.status = "ACTIVE"
  targetStage.prdVersion = roadmapState.docs.prd.version
  targetStage.architectureVersion = roadmapState.docs.architecture.version
  targetStage.promotedAt = now
  roadmapState.roadmap.activePhaseId = targetStage.id
  roadmapState.roadmap.currentStageId = targetStage.id
  syncRoadmapPhases(roadmapState)

  const targetPhase = getDeliveryPhase(roadmapState, stageId)
  if (!targetPhase || targetPhase.executionStatus !== "executing") {
    throw new Error(`Delivery phase ${stageId} did not enter executing state after promotion.`)
  }

  const syncedExecution = syncExecutionFromPrd(roadmapState)
  appendWorkflowEvent(
    syncedExecution.state,
    createStagePromotedEvent(syncedExecution.state.phase, currentStage.id, targetStage.id),
  )

  const currentMilestone = syncedExecution.state.execution.milestones.find(
    milestone => milestone.id === syncedExecution.state.execution.currentMilestone,
  )
  const currentTask = currentMilestone?.tasks.find(task => task.id === syncedExecution.state.execution.currentTask)
  if (currentMilestone && currentTask) {
    appendWorkflowEvent(
      syncedExecution.state,
      createTaskStartedEvent(syncedExecution.state.phase, currentMilestone, currentTask),
    )
  }

  const persisted = syncPublicManagedDocs(syncedExecution.state, {
    stageId: targetStage.id,
    summary: `Public docs synced after promoting ${targetStage.id}`,
  }).state

  console.log(`✅ Product stage promoted: ${currentStage.id} -> ${targetStage.id}`)
  console.log(`   PRD snapshot: ${prdSnapshotPath}`)
  console.log(`   Architecture snapshot: ${architectureSnapshotPath}`)
  console.log(
    `   Current task: ${persisted.execution.currentTask || "—"}  |  Worktree: ${persisted.execution.currentWorktree || "—"}`,
  )
}

const args = parseArgs(process.argv.slice(2))

if (args.status) {
  printStatus()
  process.exit(0)
}

if (args.promote) {
  promoteStage(args.promote)
  process.exit(0)
}

console.error("Usage: bun .harness/stage.ts --status | --promote V2")
process.exit(1)
