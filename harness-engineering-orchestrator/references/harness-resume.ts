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
  const totalTasks = execution.milestones.flatMap(m => m.tasks).length
  const doneTasks = execution.milestones.flatMap(m => m.tasks).filter(t => t.status === "DONE").length
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

if (state.phase === "EXECUTING" && state.execution.currentTask) {
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
