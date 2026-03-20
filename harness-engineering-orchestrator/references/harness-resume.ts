#!/usr/bin/env bun
/**
 * .harness/resume.ts
 *
 * Quickly resume an in-progress Harness project.
 * Reads .harness/state.json + docs/PROGRESS.md and prints
 * a clear summary of current state and next steps.
 *
 * Usage:
 *   bun .harness/resume.ts
 *
 * Typical use cases:
 * - resuming work the next day
 * - switching machines
 * - loading context at the start of a new Codex / Claude Code session
 */

import { existsSync, readdirSync, readFileSync } from "fs"
import { join } from "path"
import type { ProjectState } from "./types"

type DeliveryPhaseView = {
  approvalStatus?: string
  executionStatus?: string
  id: string
  name: string
}

function syncRoadmapPhasesCompat(state: ProjectState): void {
  const stages = state.roadmap.stages ?? []
  const approvedPhaseIds = new Set(state.roadmap.approvedPhaseIds ?? [])
  const activePhaseId =
    state.roadmap.activePhaseId
    || state.roadmap.currentStageId
    || stages.find(stage => stage.status === "ACTIVE")?.id
    || stages.find(stage => stage.status === "DEPLOY_REVIEW")?.id
    || ""

  state.roadmap.planApprovalStatus =
    state.roadmap.planApprovalStatus
    ?? (state.roadmap.planApproved ? "approved" : "pending")
  state.roadmap.activePhaseId = activePhaseId || undefined
  state.roadmap.currentStageId = activePhaseId

  state.roadmap.phases = stages.map((stage, index) => ({
    id: stage.id,
    name: stage.name,
    milestoneIds: [...stage.milestoneIds],
    order: index + 1,
    approvalStatus:
      state.roadmap.phases?.find(phase => phase.id === stage.id)?.approvalStatus
      ?? (approvedPhaseIds.has(stage.id) ? "approved" : "pending"),
    approvedAt:
      state.roadmap.phases?.find(phase => phase.id === stage.id)?.approvedAt
      ?? (approvedPhaseIds.has(stage.id) ? state.updatedAt : undefined),
    executionStatus:
      state.roadmap.phases?.find(phase => phase.id === stage.id)?.executionStatus
      ?? (stage.status === "COMPLETED"
        ? "complete"
        : stage.id === activePhaseId && stage.status === "DEPLOY_REVIEW"
          ? "deploy_gate"
          : stage.id === activePhaseId && stage.status === "ACTIVE"
            ? "executing"
            : "draft"),
    isLaunchPhase: index === 0,
  }))
}

function getCurrentDeliveryPhaseCompat(state: ProjectState): DeliveryPhaseView | undefined {
  return (
    state.roadmap.phases?.find(phase => phase.id === state.roadmap.activePhaseId)
    ?? state.roadmap.phases?.find(phase => phase.executionStatus === "executing")
    ?? state.roadmap.phases?.find(phase => phase.executionStatus === "deploy_gate")
    ?? state.roadmap.phases?.[0]
  )
}

function getNextDraftDeliveryPhaseCompat(state: ProjectState): DeliveryPhaseView | undefined {
  return state.roadmap.phases?.find(phase => phase.executionStatus === "draft")
}

function getCurrentProductStageCompat(state: ProjectState) {
  return (
    state.roadmap.stages.find(stage => stage.id === (state.roadmap.activePhaseId ?? state.roadmap.currentStageId))
    ?? state.roadmap.stages.find(stage => stage.status === "ACTIVE")
    ?? state.roadmap.stages.find(stage => stage.status === "DEPLOY_REVIEW")
    ?? state.roadmap.stages[0]
  )
}

function loadState(): ProjectState | null {
  if (!existsSync(".harness/state.json")) return null
  return JSON.parse(readFileSync(".harness/state.json", "utf-8"))
}

function loadProgress(): string {
  const snapshotPath = "docs/progress/CONTEXT_SNAPSHOT.md"
  const parts: string[] = []

  if (existsSync("docs/PROGRESS.md")) {
    parts.push(readFileSync("docs/PROGRESS.md", "utf-8").trim())
  }

  if (existsSync(snapshotPath)) {
    parts.push(readFileSync(snapshotPath, "utf-8").trim())
  }

  if (parts.length > 0) {
    return parts.filter(Boolean).join("\n\n")
  }

  const modularDir = "docs/progress"
  if (existsSync(modularDir)) {
    const modules = readdirSync(modularDir)
      .filter(file => file.toLowerCase().endsWith(".md"))
      .sort()
      .map(file => readFileSync(join(modularDir, file), "utf-8").trim())
      .filter(Boolean)

    if (modules.length > 0) {
      return modules.join("\n\n")
    }
  }

  return ""
}

function phaseLabel(phase: string): string {
  const labels: Record<string, string> = {
    DISCOVERY: "Phase 0: Project Discovery",
    MARKET_RESEARCH: "Phase 1: Market Research",
    TECH_STACK: "Phase 2: Tech Stack Negotiation",
    PRD_ARCH: "Phase 3: PRD + Architecture",
    SCAFFOLD: "Phase 4: Scaffold Generation",
    EXECUTING: "Phase 5: Execution Engine",
    VALIDATING: "Phase 6: Harness Validation",
    COMPLETE: "✅ Project Complete",
  }
  return labels[phase] ?? phase
}

const state = loadState()
const progress = loadProgress()

if (!state) {
  console.error("❌ .harness/state.json is missing.")
  console.error("   Make sure you are in the correct project directory, or initialize the project first.")
  process.exit(1)
}

console.log(`\n${"═".repeat(60)}`)
console.log(`  📍 Harness Resume — ${state.projectInfo.displayName || state.projectInfo.name}`)
console.log(`${"═".repeat(60)}`)

console.log(`\n  Current phase: ${phaseLabel(state.phase)}`)
console.log(`  Last updated: ${new Date(state.updatedAt).toLocaleString()}`)
syncRoadmapPhasesCompat(state)
const currentDeliveryPhase = getCurrentDeliveryPhaseCompat(state)
const currentProductStage = getCurrentProductStageCompat(state)
const nextDraftPhase = getNextDraftDeliveryPhaseCompat(state)
console.log(`  Plan approval: ${state.roadmap.planApprovalStatus ?? "pending"}`)
if (currentDeliveryPhase) {
  console.log(
    `  Current delivery phase: ${currentDeliveryPhase.id} — ${currentDeliveryPhase.name} (${currentDeliveryPhase.executionStatus}, ${currentDeliveryPhase.approvalStatus})`,
  )
} else if (currentProductStage) {
  console.log(`  Current delivery phase: ${currentProductStage.id} — ${currentProductStage.name} (${currentProductStage.status})`)
}
if (progress) {
  console.log("  Progress docs: docs/PROGRESS.md + docs/progress/CONTEXT_SNAPSHOT.md")
}

if (state.techStack.confirmed) {
  console.log("\n  Tech Stack:")
  for (const d of state.techStack.decisions.slice(0, 5)) {
    console.log(`    • ${d.layer}: ${d.choice}`)
  }
}

if (state.phase === "EXECUTING") {
  const { execution } = state
  const visibleTasks = execution.milestones.flatMap(m => m.tasks).filter(t => t.status !== "PLANNED")
  const totalTasks = visibleTasks.length
  const doneTasks = visibleTasks.filter(t => t.status === "DONE").length
  const blockedTasks = execution.milestones.flatMap(m => m.tasks).filter(t => t.status === "BLOCKED")
  const pct = totalTasks ? Math.round((doneTasks / totalTasks) * 100) : 0
  const bar = "█".repeat(Math.round(pct / 5)) + "░".repeat(20 - Math.round(pct / 5))

  console.log(`\n  Execution progress: [${bar}] ${pct}% (${doneTasks}/${totalTasks} Tasks)`)
  console.log(`  Current milestone: ${execution.currentMilestone || "—"}`)
  console.log(`  Current task: ${execution.currentTask || "—"}`)
  if (execution.currentWorktree) {
    console.log(`  Current worktree: ${execution.currentWorktree}`)
  }

  if (blockedTasks.length > 0) {
    console.log("\n  ⚠️  BLOCKED tasks:")
    for (const t of blockedTasks) {
      console.log(`    • ${t.id}: ${t.name}`)
      console.log(`      Reason: ${t.blockedReason ?? "Not recorded"}`)
    }
  }
}

if (state.execution.milestones.length > 0) {
  console.log("\n  Milestones:")
  for (const m of state.execution.milestones) {
    const done = m.tasks.filter(t => t.status === "DONE").length
    const total = m.tasks.length
    const icon =
      m.status === "COMPLETE" || m.status === "MERGED"
        ? "✅"
        : m.status === "IN_PROGRESS"
          ? "⚙️ "
          : m.status === "REVIEW"
            ? "🟡"
            : "⏳"
    console.log(`    ${icon} ${m.id}: ${m.name} (${done}/${total})`)
  }
}

console.log(`\n${"─".repeat(60)}`)
console.log("  Next step:")

if ((state.roadmap.planApprovalStatus ?? "pending") !== "approved") {
  console.log("    bun harness:approve --plan         → record overall planning approval")
} else if (currentDeliveryPhase && currentDeliveryPhase.approvalStatus !== "approved") {
  console.log(`    bun harness:approve --phase ${currentDeliveryPhase.id} → approve the current delivery phase`)
} else if (currentDeliveryPhase?.executionStatus === "deploy_gate") {
  console.log(`    Deploy/test ${currentDeliveryPhase.id} in the real environment`)
  if (nextDraftPhase) {
    console.log(`    bun harness:approve --phase ${nextDraftPhase.id} → approve the next draft phase`)
    console.log(`    bun harness:stage --promote ${nextDraftPhase.id} → promote the next approved phase`)
  } else {
    console.log("    bun harness:advance               → move into final validation after deploy review")
  }
} else if (state.phase === "EXECUTING" && state.execution.currentTask) {
  console.log("")
  console.log("  With Codex:")
  console.log(
    `    codex "Read AGENTS.md, docs/PROGRESS.md, docs/progress/CONTEXT_SNAPSHOT.md if present, and .harness/state.json, then continue ${state.execution.currentTask}"`,
  )
  console.log("")
  console.log("  With Claude Code:")
  console.log(
    `    claude "Read CLAUDE.md, docs/PROGRESS.md, docs/progress/CONTEXT_SNAPSHOT.md if present, and .harness/state.json, then continue ${state.execution.currentTask}"`,
  )
} else if (state.phase === "COMPLETE") {
  console.log("    bun .harness/orchestrator.ts        → get the final closeout agent")
  console.log("    bun harness:compact --status        → inspect final context health")
} else {
  console.log("    bun .harness/orchestrator.ts        → get the current runtime dispatch")
  console.log("    bun .harness/orchestrator.ts --next → print only the next agent / action")
}

console.log("\n  Validation commands:")
if (state.phase === "EXECUTING") {
  const curMilestone = state.execution.currentMilestone
  if (curMilestone) {
    console.log(`    bun harness:validate --milestone ${curMilestone}`)
  }
  if (state.execution.currentTask) {
    console.log(`    bun harness:validate --task ${state.execution.currentTask}`)
  }
}
console.log("    bun harness:guardian  → run the guardian scan")
console.log("    bun harness:validate  → run full validation")
console.log(`${"═".repeat(60)}\n`)
