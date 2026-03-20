#!/usr/bin/env bun
/**
 * .harness/approve.ts
 *
 * Explicit approval surface for Harness delivery planning:
 * - approve the overall project plan
 * - approve a specific delivery phase
 * - inspect current approval / execution state
 */

import { syncExecutionFromPrd, syncRoadmapFromPrd } from "./runtime/backlog"
import {
  activateDeliveryPhase,
  approveDeliveryPhase,
  approvePlan,
  getCurrentDeliveryPhase,
  getDeliveryPhase,
  syncRoadmapPhases,
} from "./runtime/stages"
import { readState, writeState } from "./runtime/state-core"

type CliArgs = {
  phase?: string
  plan: boolean
  status: boolean
}

function parseArgs(argv: string[]): CliArgs {
  const args: CliArgs = { plan: false, status: false }

  for (let index = 0; index < argv.length; index++) {
    const current = argv[index]
    if (current === "--plan") {
      args.plan = true
      continue
    }
    if (current === "--status") {
      args.status = true
      continue
    }
    if (current === "--phase") {
      const next = argv[index + 1]
      if (next && !next.startsWith("--")) {
        args.phase = next.trim().toUpperCase()
        index += 1
      }
      continue
    }
    if (current.startsWith("--phase=")) {
      args.phase = current.slice("--phase=".length).trim().toUpperCase()
    }
  }

  return args
}

function firstIncompletePhaseId(state: ReturnType<typeof syncRoadmapFromPrd>["state"]): string | undefined {
  return state.roadmap.phases?.find(phase => phase.executionStatus !== "complete")?.id
}

function readSyncedState() {
  const baseState = readState()
  const roadmapState = syncRoadmapFromPrd(baseState).state
  syncRoadmapPhases(roadmapState)
  return roadmapState
}

function printStatus(): void {
  const state = readSyncedState()
  const current = getCurrentDeliveryPhase(state)

  console.log(`\n${"═".repeat(50)}`)
  console.log("  Delivery Approval Status")
  console.log(`${"═".repeat(50)}\n`)
  console.log(`Plan Approval: ${state.roadmap.planApprovalStatus ?? "pending"}`)
  console.log(`Current Phase: ${current ? `${current.id} — ${current.name}` : "—"}`)
  console.log("")

  for (const phase of state.roadmap.phases ?? []) {
    const activeMark = phase.id === state.roadmap.activePhaseId ? " <- active" : ""
    console.log(
      `- ${phase.id}: ${phase.name} [approval=${phase.approvalStatus}; execution=${phase.executionStatus}]${activeMark}`,
    )
  }
  console.log("")
}

function persistState(state: ReturnType<typeof syncRoadmapFromPrd>["state"]) {
  const synced = syncExecutionFromPrd(state).state
  return writeState(synced)
}

function approveProjectPlan(): void {
  const state = readSyncedState()
  approvePlan(state)
  const persisted = persistState(state)
  console.log("✅ Overall project plan approved")
  console.log(`   Plan approval: ${persisted.roadmap.planApprovalStatus}`)
}

function approvePhase(phaseId: string): void {
  const state = readSyncedState()
  if (state.roadmap.planApprovalStatus !== "approved") {
    throw new Error("Overall plan is not approved yet. Run bun harness:approve --plan first.")
  }

  const phase = getDeliveryPhase(state, phaseId)
  if (!phase) {
    throw new Error(`Delivery phase ${phaseId} was not found in state.`)
  }

  approveDeliveryPhase(state, phaseId)

  const firstIncomplete = firstIncompletePhaseId(state)
  if (!state.roadmap.activePhaseId && firstIncomplete === phaseId) {
    activateDeliveryPhase(state, phaseId)
  } else if (state.roadmap.activePhaseId === phaseId && phase.executionStatus === "draft") {
    activateDeliveryPhase(state, phaseId)
  }

  const persisted = persistState(state)
  const persistedPhase = getDeliveryPhase(persisted, phaseId)
  console.log(`✅ Delivery phase ${phaseId} approved`)
  console.log(
    `   ${phaseId}: approval=${persistedPhase?.approvalStatus ?? "pending"}; execution=${persistedPhase?.executionStatus ?? "draft"}`,
  )
}

const args = parseArgs(process.argv.slice(2))

if (args.status) {
  printStatus()
  process.exit(0)
}

if (args.plan) {
  approveProjectPlan()
  process.exit(0)
}

if (args.phase) {
  approvePhase(args.phase)
  process.exit(0)
}

console.error("Usage: bun .harness/approve.ts --status | --plan | --phase V1")
process.exit(1)
