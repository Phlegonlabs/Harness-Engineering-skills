import { existsSync } from "fs"
import type { Milestone, ProjectState, ProjectType } from "../types"
import { initState, readState, writeState } from "./state-core"
import { isUiProject, PRD_DIR, PRD_PATH, readDocument, STATE_PATH } from "./shared"
import { createEmptyTaskChecklist } from "./task-checklist"

function slugify(value: string): string {
  return value
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .replace(/-{2,}/g, "-")
}

function inferTaskFiles(isUI: boolean): string[] {
  return isUI
    ? ["src/app", "src/services", "src/types", "docs/design/DESIGN_SYSTEM.md", "tests"]
    : ["src/types", "src/config", "src/lib", "src/services", "tests"]
}

function inferUiTask(text: string, projectTypes: ProjectType[]): boolean {
  if (!isUiProject(projectTypes)) return false
  return /(ui|page|screen|layout|component|design|dashboard|form|login|settings|profile|navbar|modal|table)/i.test(
    text,
  )
}

function parsePrdBacklog(state: ProjectState): Milestone[] {
  const content = readDocument(PRD_PATH, PRD_DIR)
  if (!content) {
    throw new Error("docs/prd/ or docs/PRD.md not found. Generate PRD before running --from-prd.")
  }

  const lines = content.split(/\r?\n/)
  const milestones: Milestone[] = []
  let currentMilestone: Milestone | null = null
  let currentFeature:
    | {
        featureId: string
        name: string
        body: string[]
        dod: string[]
      }
    | null = null
  let taskCounter = 1

  const flushFeature = () => {
    if (!currentMilestone || !currentFeature) return

    const taskId = `T${String(taskCounter).padStart(3, "0")}`
    const taskText = [currentMilestone.name, currentFeature.name, ...currentFeature.body, ...currentFeature.dod].join(" ")
    const taskIsUi = inferUiTask(taskText, state.projectInfo.types)

    currentMilestone.tasks.push({
      id: taskId,
      name: currentFeature.name,
      type: "TASK",
      status: "PENDING",
      prdRef: `PRD#F${currentFeature.featureId}`,
      milestoneId: currentMilestone.id,
      dod: currentFeature.dod.length > 0 ? currentFeature.dod : ["Meet PRD acceptance criteria"],
      isUI: taskIsUi,
      affectedFiles: inferTaskFiles(taskIsUi),
      retryCount: 0,
      checklist: createEmptyTaskChecklist(),
    })

    taskCounter++
    currentFeature = null
  }

  const flushMilestone = () => {
    flushFeature()
    if (!currentMilestone) return
    milestones.push(currentMilestone)
    currentMilestone = null
  }

  for (const line of lines) {
    const milestoneMatch = line.match(/^###\s+Milestone\s+(\d+)[：:]\s*(.+)$/)
    if (milestoneMatch) {
      flushMilestone()
      const milestoneNumber = milestoneMatch[1]
      const milestoneName = milestoneMatch[2].trim()
      currentMilestone = {
        id: `M${milestoneNumber}`,
        name: milestoneName,
        branch: `milestone/m${milestoneNumber}-${slugify(milestoneName || "milestone")}`,
        worktreePath: `../${state.projectInfo.name || "project"}-m${milestoneNumber}`,
        status: "PENDING",
        tasks: [],
      }
      continue
    }

    const featureMatch = line.match(/^####\s+F(\d{3})[：:]\s*(.+)$/)
    if (featureMatch && currentMilestone) {
      flushFeature()
      currentFeature = {
        featureId: featureMatch[1],
        name: featureMatch[2].trim(),
        body: [],
        dod: [],
      }
      continue
    }

    if (!currentFeature) continue

    const dodMatch = line.match(/^\s*-\s*\[\s*\]\s*(.+)$/)
    if (dodMatch) {
      currentFeature.dod.push(dodMatch[1].trim())
      continue
    }

    const trimmed = line.trim()
    if (trimmed.length > 0) {
      currentFeature.body.push(trimmed)
    }
  }

  flushMilestone()

  if (milestones.length === 0) {
    milestones.push({
      id: "M1",
      name: "Foundation",
      branch: "milestone/m1-foundation",
      worktreePath: `../${state.projectInfo.name || "project"}-m1`,
      status: "PENDING",
      tasks: [
        {
          id: "T001",
          name: "Foundation setup",
          type: "TASK",
          status: "PENDING",
          prdRef: "PRD#F001",
          milestoneId: "M1",
          dod: ["Complete foundational project initialization"],
          isUI: isUiProject(state.projectInfo.types),
          affectedFiles: inferTaskFiles(isUiProject(state.projectInfo.types)),
          retryCount: 0,
          checklist: createEmptyTaskChecklist(),
        },
      ],
    })
  }

  if (milestones[0]?.tasks[0]) {
    milestones[0].status = "IN_PROGRESS"
    milestones[0].tasks[0].status = "IN_PROGRESS"
  }

  return milestones
}

export function deriveExecutionFromPrd(baseState: ProjectState): ProjectState {
  const milestones = parsePrdBacklog(baseState)
  const firstMilestone = milestones[0]
  const firstTask = firstMilestone?.tasks[0]

  return {
    ...baseState,
    phase:
      baseState.phase === "VALIDATING" || baseState.phase === "COMPLETE"
        ? baseState.phase
        : "EXECUTING",
    execution: {
      currentMilestone: firstMilestone?.id ?? "",
      currentTask: firstTask?.id ?? "",
      currentWorktree: firstMilestone?.worktreePath ?? "",
      milestones,
      allMilestonesComplete: false,
    },
    docs: {
      ...baseState.docs,
      prd: {
        ...baseState.docs.prd,
        exists: true,
        milestoneCount: milestones.length,
      },
      progress: {
        ...baseState.docs.progress,
        exists: true,
        lastUpdated: new Date().toISOString(),
      },
    },
  }
}

export function bootstrapExecutionFromPrd(): ProjectState {
  const baseState = existsSync(STATE_PATH) ? readState() : initState({})
  return writeState(deriveExecutionFromPrd(baseState))
}
