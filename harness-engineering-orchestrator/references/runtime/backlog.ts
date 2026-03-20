import { existsSync } from "fs"
import type {
  Milestone,
  ProductStage,
  ProductStageStatus,
  ProjectState,
  ProjectType,
  Task,
  TaskStatus,
} from "../types"
import { assertPlanningDocumentsReady } from "./planning-docs"
import { initState, readState, writeState } from "./state-core"
import { ARCHITECTURE_DIR, ARCHITECTURE_PATH, isUiProject, PRD_DIR, PRD_PATH, readDocument, STATE_PATH } from "./shared"
import { getDeliveryPhase, isPlanApproved, milestoneIsExecutable, syncRoadmapPhases } from "./stages"
import { createEmptyTaskChecklist } from "./task-checklist"

type ParsedTaskSpec = {
  affectedFiles: string[]
  dependsOn?: string[]
  dod: string[]
  isUI: boolean
  milestoneId: string
  name: string
  prdRef: string
}

type ParsedMilestoneSpec = {
  branch: string
  id: string
  name: string
  productStageId: string
  tasks: ParsedTaskSpec[]
  worktreePath: string
}

type ParsedStageSpec = {
  id: string
  name: string
  milestoneSpecs: ParsedMilestoneSpec[]
  statusHint?: ProductStageStatus
}

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

function parseStageStatusHint(raw?: string): ProductStageStatus | undefined {
  const value = raw?.trim().toUpperCase()
  switch (value) {
    case "DRAFT":
    case "ACTIVE":
    case "DEFERRED":
    case "DEPLOY_REVIEW":
    case "COMPLETED":
      return value
    default:
      return undefined
  }
}

function parseDocumentVersion(content: string, fallback: string): string {
  const match = content.match(/^\s*>\s*\*\*Version\*\*:\s*(v[0-9][^\r\n]*)$/im)
  return match?.[1]?.trim() ?? fallback
}

function defaultStage(): ParsedStageSpec {
  return {
    id: "V1",
    name: "Current Delivery",
    milestoneSpecs: [],
  }
}

function defaultMilestone(state: ProjectState): ParsedMilestoneSpec {
  const taskIsUi = isUiProject(state.projectInfo.types)
  return {
    id: "M1",
    name: "Foundation",
    productStageId: "V1",
    branch: "milestone/m1-foundation",
    worktreePath: `../${state.projectInfo.name || "project"}-m1`,
    tasks: [
      {
        name: "Foundation setup",
        prdRef: "PRD#F001",
        milestoneId: "M1",
        dod: ["Complete foundational project initialization"],
        isUI: taskIsUi,
        affectedFiles: inferTaskFiles(taskIsUi),
        dependsOn: [],
      },
    ],
  }
}

function parsePrdStageSpecs(state: ProjectState): ParsedStageSpec[] {
  const content = readDocument(PRD_PATH, PRD_DIR)
  if (!content) {
    throw new Error("docs/prd/ or docs/PRD.md not found. Generate PRD before running --from-prd.")
  }

  const lines = content.split(/\r?\n/)
  const stages: ParsedStageSpec[] = []
  let currentStage: ParsedStageSpec | null = null
  let currentMilestone: ParsedMilestoneSpec | null = null
  let currentFeature:
    | {
        affectedFiles?: string[]
        body: string[]
        dependsOn?: string[]
        dod: string[]
        explicitIsUi?: boolean
        featureId: string
        name: string
      }
    | null = null

  const ensureStage = () => {
    if (!currentStage) {
      currentStage = defaultStage()
    }
  }

  const flushFeature = () => {
    if (!currentMilestone || !currentFeature) return

    const taskText = [currentMilestone.name, currentFeature.name, ...currentFeature.body, ...currentFeature.dod].join(" ")
    const taskIsUi = currentFeature.explicitIsUi ?? inferUiTask(taskText, state.projectInfo.types)
    const affectedFiles = currentFeature.affectedFiles?.length
      ? [...currentFeature.affectedFiles]
      : inferTaskFiles(taskIsUi)

    currentMilestone.tasks.push({
      name: currentFeature.name,
      prdRef: `PRD#F${currentFeature.featureId}`,
      milestoneId: currentMilestone.id,
      dod: currentFeature.dod.length > 0 ? currentFeature.dod : ["Meet PRD acceptance criteria"],
      isUI: taskIsUi,
      affectedFiles,
      dependsOn: currentFeature.dependsOn?.length ? [...currentFeature.dependsOn] : undefined,
    })

    currentFeature = null
  }

  const flushMilestone = () => {
    flushFeature()
    if (!currentMilestone) return
    ensureStage()
    currentStage!.milestoneSpecs.push(currentMilestone)
    currentMilestone = null
  }

  const flushStage = () => {
    flushMilestone()
    if (!currentStage) return
    stages.push(currentStage)
    currentStage = null
  }

  for (const line of lines) {
    const stageMatch = line.match(
      /^##\s+(?:Product Stage|Delivery Phase)\s+(V\d+)\s*:\s*(.+?)(?:\s+\[(ACTIVE|DEFERRED|DRAFT|DEPLOY_REVIEW|COMPLETED)\])?\s*$/i,
    )
    if (stageMatch) {
      flushStage()
      currentStage = {
        id: stageMatch[1]!.trim().toUpperCase(),
        name: stageMatch[2]!.trim(),
        milestoneSpecs: [],
        statusHint: parseStageStatusHint(stageMatch[3]),
      }
      continue
    }

    const milestoneMatch = line.match(/^###\s+Milestone\s+(\d+)[：:]\s*(.+)$/)
    if (milestoneMatch) {
      flushMilestone()
      ensureStage()
      const milestoneNumber = milestoneMatch[1]
      const milestoneName = milestoneMatch[2].trim()
      currentMilestone = {
        id: `M${milestoneNumber}`,
        name: milestoneName,
        productStageId: currentStage!.id,
        branch: `milestone/m${milestoneNumber}-${slugify(milestoneName || "milestone")}`,
        worktreePath: `../${state.projectInfo.name || "project"}-m${milestoneNumber}`,
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
        dependsOn: [],
        dod: [],
      }
      continue
    }

    if (!currentFeature) continue

    const metadataLine = line.replace(/\*\*/g, "").trim()

    const uiMatch = metadataLine.match(/^UI Task\s*:\s*(yes|no)\s*$/i)
    if (uiMatch) {
      currentFeature.explicitIsUi = uiMatch[1]!.trim().toLowerCase() === "yes"
      continue
    }

    const affectedFilesMatch = metadataLine.match(/^Affected Files\s*:\s*(.+)\s*$/i)
    if (affectedFilesMatch) {
      currentFeature.affectedFiles = affectedFilesMatch[1]!
        .split(",")
        .map(value => value.trim())
        .filter(Boolean)
      continue
    }

    const dependsOnMatch = metadataLine.match(/^Depends On\s*:\s*(.+)\s*$/i)
    if (dependsOnMatch) {
      currentFeature.dependsOn = dependsOnMatch[1]!
        .split(",")
        .map(value => value.trim())
        .filter(Boolean)
      continue
    }

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

  flushStage()

  if (stages.length === 0) {
    const stage = defaultStage()
    stage.milestoneSpecs.push(defaultMilestone(state))
    return [stage]
  }

  if (stages.every(stage => stage.milestoneSpecs.length === 0)) {
    stages[0]!.milestoneSpecs.push(defaultMilestone(state))
  }

  return stages
}

function taskNumber(taskId: string): number {
  const match = taskId.match(/^T(\d+)$/)
  return match ? Number.parseInt(match[1], 10) : 0
}

function nextTaskId(nextNumber: number): string {
  return `T${String(nextNumber).padStart(3, "0")}`
}

function createTaskFromSpec(spec: ParsedTaskSpec, taskId: string): Task {
  return {
    id: taskId,
    name: spec.name,
    type: "TASK",
    status: "PLANNED",
    prdRef: spec.prdRef,
    milestoneId: spec.milestoneId,
    dod: [...spec.dod],
    isUI: spec.isUI,
    affectedFiles: [...spec.affectedFiles],
    dependsOn: spec.dependsOn ? [...spec.dependsOn] : undefined,
    retryCount: 0,
    checklist: createEmptyTaskChecklist(),
  }
}

function isFinishedTaskStatus(status: TaskStatus): boolean {
  return status === "DONE" || status === "SKIPPED"
}

function refreshPlannedAwareMilestoneStatuses(milestones: Milestone[]): void {
  for (const milestone of milestones) {
    if (milestone.status === "MERGED" || milestone.status === "COMPLETE") continue

    const allTasksPlanned = milestone.tasks.length > 0 && milestone.tasks.every(task => task.status === "PLANNED")
    const allFinished = milestone.tasks.length > 0 && milestone.tasks.every(task => isFinishedTaskStatus(task.status))
    const hasWorkStarted = milestone.tasks.some(task =>
      ["IN_PROGRESS", "DONE", "BLOCKED"].includes(task.status),
    )

    if (allTasksPlanned) {
      milestone.status = "PLANNED"
      continue
    }

    if (allFinished) {
      milestone.status = "REVIEW"
      milestone.completedAt = milestone.completedAt ?? new Date().toISOString()
      continue
    }

    if (hasWorkStarted) {
      milestone.status = "IN_PROGRESS"
      continue
    }

    milestone.status = "PENDING"
  }
}

function activateNextAvailableTask(milestones: Milestone[], state: ProjectState): {
  currentMilestone: string
  currentTask: string
  currentWorktree: string
} {
  const activeTask = milestones
    .filter(milestone => milestoneIsExecutable(state, milestone))
    .flatMap(milestone => milestone.tasks.map(task => ({ milestone, task })))
    .find(entry => entry.task.status === "IN_PROGRESS")

  if (activeTask) {
    activeTask.task.startedAt = activeTask.task.startedAt ?? new Date().toISOString()
    if (activeTask.milestone.status === "PENDING") {
      activeTask.milestone.status = "IN_PROGRESS"
    }
    return {
      currentMilestone: activeTask.milestone.id,
      currentTask: activeTask.task.id,
      currentWorktree: activeTask.milestone.worktreePath,
    }
  }

  for (const milestone of milestones) {
    if (!milestoneIsExecutable(state, milestone)) continue
    const nextTask = milestone.tasks.find(task => task.status === "PENDING")
    if (!nextTask) continue

    nextTask.status = "IN_PROGRESS"
    nextTask.startedAt = nextTask.startedAt ?? new Date().toISOString()
    if (milestone.status === "PENDING") {
      milestone.status = "IN_PROGRESS"
    }
    return {
      currentMilestone: milestone.id,
      currentTask: nextTask.id,
      currentWorktree: milestone.worktreePath,
    }
  }

  return { currentMilestone: "", currentTask: "", currentWorktree: "" }
}

function buildRoadmapStageFromSpec(
  spec: ParsedStageSpec,
  existingStage: ProductStage | undefined,
  currentVersions: { architectureVersion: string; prdVersion: string },
): ProductStage {
  const status = existingStage?.status ?? spec.statusHint ?? "DRAFT"

  return {
    id: spec.id,
    name: spec.name,
    status,
    milestoneIds: spec.milestoneSpecs.map(milestone => milestone.id),
    prdVersion:
      existingStage?.prdVersion
      ?? (["ACTIVE", "DEPLOY_REVIEW", "COMPLETED"].includes(status) ? currentVersions.prdVersion : undefined),
    architectureVersion:
      existingStage?.architectureVersion
      ?? (["ACTIVE", "DEPLOY_REVIEW", "COMPLETED"].includes(status) ? currentVersions.architectureVersion : undefined),
    promotedAt: existingStage?.promotedAt,
    deployReviewStartedAt: existingStage?.deployReviewStartedAt,
    deployReviewedAt: existingStage?.deployReviewedAt,
    completedAt: existingStage?.completedAt,
  }
}

function syncRoadmapState(baseState: ProjectState, parsedStages: ParsedStageSpec[]): {
  addedStages: number
  roadmap: ProjectState["roadmap"]
} {
  const existingStages = baseState.roadmap.stages
  const existingStageMap = new Map(existingStages.map(stage => [stage.id, stage]))
  const prdContent = readDocument(PRD_PATH, PRD_DIR)
  const architectureContent = readDocument(ARCHITECTURE_PATH, ARCHITECTURE_DIR)
  const currentVersions = {
    prdVersion: parseDocumentVersion(prdContent, baseState.docs.prd.version),
    architectureVersion: parseDocumentVersion(architectureContent, baseState.docs.architecture.version),
  }

  let addedStages = 0
  const syncedStages = parsedStages.map(spec => {
    const existingStage = existingStageMap.get(spec.id)
    if (!existingStage) {
      addedStages += 1
    }
    return buildRoadmapStageFromSpec(spec, existingStage, currentVersions)
  })

  const parsedIds = new Set(parsedStages.map(stage => stage.id))
  const orphanStages = existingStages.filter(stage => !parsedIds.has(stage.id))
  const orderedStages = [...syncedStages, ...orphanStages]

  const persistedCurrentStageId =
    (baseState.roadmap.currentStageId && orderedStages.some(stage => stage.id === baseState.roadmap.currentStageId))
      ? baseState.roadmap.currentStageId
      : (baseState.roadmap.activePhaseId && orderedStages.some(stage => stage.id === baseState.roadmap.activePhaseId)
        ? baseState.roadmap.activePhaseId
        : "")

  return {
    addedStages,
    roadmap: {
      ...baseState.roadmap,
      currentStageId: persistedCurrentStageId,
      stages: orderedStages,
    },
  }
}

function buildOrderedMilestones(
  existingMilestones: Milestone[],
  parsedStages: ParsedStageSpec[],
  mergeStageMilestones: (spec: ParsedStageSpec) => Milestone[],
): Milestone[] {
  const existingByStage = new Map<string, Milestone[]>()
  for (const milestone of existingMilestones) {
    const current = existingByStage.get(milestone.phaseId ?? milestone.productStageId) ?? []
    current.push(milestone)
    existingByStage.set(milestone.phaseId ?? milestone.productStageId, current)
  }

  const ordered: Milestone[] = []
  for (const stage of parsedStages) {
    ordered.push(...mergeStageMilestones(stage))
    existingByStage.delete(stage.id)
  }

  for (const stageMilestones of existingByStage.values()) {
    ordered.push(...stageMilestones)
  }

  return ordered
}

function normalizeExecutionBacklog(state: ProjectState): void {
  syncRoadmapPhases(state)

  for (const milestone of state.execution.milestones) {
    milestone.phaseId = milestone.phaseId ?? milestone.productStageId
    const executable = milestoneIsExecutable(state, milestone)

    for (const task of milestone.tasks) {
      if (executable) {
        if (task.status === "PLANNED") {
          task.status = "PENDING"
        }
        continue
      }

      if (!isFinishedTaskStatus(task.status)) {
        task.status = "PLANNED"
        task.startedAt = undefined
        task.blockedAt = undefined
      }
    }

    if (executable) {
      if (milestone.status === "PLANNED") {
        milestone.status = "PENDING"
      }
      continue
    }

    if (!["MERGED", "COMPLETE"].includes(milestone.status)) {
      milestone.status = "PLANNED"
      milestone.completedAt = undefined
    }
  }

  refreshPlannedAwareMilestoneStatuses(state.execution.milestones)
}

function countParsedMilestones(parsedStages: ParsedStageSpec[]): number {
  return parsedStages.reduce((total, stage) => total + stage.milestoneSpecs.length, 0)
}

export function syncRoadmapFromPrd(baseState: ProjectState): {
  addedStages: number
  state: ProjectState
} {
  const parsedStages = parsePrdStageSpecs(baseState)
  const roadmapSync = syncRoadmapState(baseState, parsedStages)
  const nextState = {
    ...baseState,
    roadmap: roadmapSync.roadmap,
    docs: {
      ...baseState.docs,
      prd: {
        ...baseState.docs.prd,
        exists: true,
        milestoneCount: countParsedMilestones(parsedStages),
      },
    },
  }

  syncRoadmapPhases(nextState)

  return {
    addedStages: roadmapSync.addedStages,
    state: nextState,
  }
}

export function deriveExecutionFromPrd(baseState: ProjectState): ProjectState {
  return syncExecutionFromPrd(baseState).state
}

export function syncExecutionFromPrd(baseState: ProjectState): {
  addedMilestones: number
  addedStages: number
  addedTasks: number
  state: ProjectState
} {
  assertPlanningDocumentsReady()
  const parsedStages = parsePrdStageSpecs(baseState)
  const roadmapSync = syncRoadmapState(baseState, parsedStages)
  const existingMilestones = baseState.execution.milestones
  const existingMilestoneMap = new Map(existingMilestones.map(milestone => [milestone.id, milestone]))
  const highestTaskNumber = existingMilestones
    .flatMap(milestone => milestone.tasks)
    .reduce((highest, task) => Math.max(highest, taskNumber(task.id)), 0)

  let nextTaskNumberValue = highestTaskNumber
  let addedMilestones = 0
  let addedTasks = 0

  const mergeStageMilestones = (stage: ParsedStageSpec): Milestone[] =>
    stage.milestoneSpecs.map(spec => {
      const existingMilestone = existingMilestoneMap.get(spec.id)
      const existingTaskMap = new Map(existingMilestone?.tasks.map(task => [task.prdRef, task]) ?? [])
      const parsedPrdRefs = new Set(spec.tasks.map(task => task.prdRef))

      if (existingMilestone && ["MERGED", "COMPLETE"].includes(existingMilestone.status)) {
        const appendedScope = spec.tasks.filter(task => !existingTaskMap.has(task.prdRef))
        if (appendedScope.length > 0) {
          throw new Error(
            `Milestone ${spec.id} is already ${existingMilestone.status}. Add new scope as a new milestone instead of modifying a merged milestone.`,
          )
        }
      }

      const tasks = spec.tasks.map(taskSpec => {
        const existingTask = existingTaskMap.get(taskSpec.prdRef)
        if (existingTask) {
          return {
            ...existingTask,
            name: taskSpec.name,
            prdRef: taskSpec.prdRef,
            milestoneId: spec.id,
            dod: [...taskSpec.dod],
            isUI: taskSpec.isUI,
            affectedFiles: [...taskSpec.affectedFiles],
            dependsOn: taskSpec.dependsOn?.length ? [...taskSpec.dependsOn] : undefined,
          }
        }

        addedTasks += 1
        nextTaskNumberValue += 1
        return createTaskFromSpec(taskSpec, nextTaskId(nextTaskNumberValue))
      })

      const orphanTasks = existingMilestone?.tasks.filter(task => !parsedPrdRefs.has(task.prdRef)) ?? []
      const milestone: Milestone = existingMilestone
        ? {
            ...existingMilestone,
            name: spec.name,
            productStageId: spec.productStageId,
            phaseId: spec.productStageId,
            branch: existingMilestone.branch || spec.branch,
            worktreePath: existingMilestone.worktreePath || spec.worktreePath,
            tasks: [...tasks, ...orphanTasks],
          }
        : {
            id: spec.id,
            name: spec.name,
            productStageId: spec.productStageId,
            phaseId: spec.productStageId,
            branch: spec.branch,
            worktreePath: spec.worktreePath,
            status: "PLANNED",
            tasks,
          }

      if (!existingMilestone) {
        addedMilestones += 1
      }

      return milestone
    })

  const milestones = buildOrderedMilestones(existingMilestones, parsedStages, mergeStageMilestones)
  const nextState: ProjectState = {
    ...baseState,
    phase:
      baseState.phase === "VALIDATING" || baseState.phase === "COMPLETE"
        ? baseState.phase
        : "EXECUTING",
    roadmap: roadmapSync.roadmap,
    execution: {
      ...baseState.execution,
      milestones,
      allMilestonesComplete: false,
    },
    docs: {
      ...baseState.docs,
      prd: {
        ...baseState.docs.prd,
        exists: true,
        milestoneCount: countParsedMilestones(parsedStages),
      },
      progress: {
        ...baseState.docs.progress,
        exists: true,
        lastUpdated: new Date().toISOString(),
      },
    },
  }

  const activePhaseId = nextState.roadmap.activePhaseId ?? nextState.roadmap.currentStageId
  const activeStage = nextState.roadmap.stages.find(stage => stage.id === activePhaseId)
  const activePhaseHasOpenMilestones = nextState.execution.milestones.some(milestone =>
    (milestone.phaseId ?? milestone.productStageId) === activePhaseId &&
    !["MERGED", "COMPLETE"].includes(milestone.status),
  )
  if (activeStage && activePhaseHasOpenMilestones && activeStage.status === "DEPLOY_REVIEW") {
    activeStage.status = "ACTIVE"
    activeStage.deployReviewStartedAt = undefined
    activeStage.deployReviewedAt = undefined
    activeStage.completedAt = undefined
  }

  normalizeExecutionBacklog(nextState)
  const pointers = activateNextAvailableTask(nextState.execution.milestones, nextState)
  nextState.execution.currentMilestone = pointers.currentMilestone
  nextState.execution.currentTask = pointers.currentTask
  nextState.execution.currentWorktree = pointers.currentWorktree
  if (isPlanApproved(nextState) && nextState.execution.currentTask) {
    nextState.phase = "EXECUTING"
  }
  nextState.execution.allMilestonesComplete =
    nextState.execution.milestones.length > 0 &&
    nextState.execution.milestones.every(milestone => ["MERGED", "COMPLETE"].includes(milestone.status))

  return {
    addedMilestones,
    addedStages: roadmapSync.addedStages,
    addedTasks,
    state: nextState,
  }
}

export function bootstrapExecutionFromPrd(): ProjectState {
  const baseState = existsSync(STATE_PATH) ? readState() : initState({})
  return writeState(deriveExecutionFromPrd(baseState))
}

export function syncExecutionBacklogFromPrd(): {
  addedMilestones: number
  addedStages: number
  addedTasks: number
  state: ProjectState
} {
  const baseState = existsSync(STATE_PATH) ? readState() : initState({})
  const result = syncExecutionFromPrd(baseState)
  return {
    ...result,
    state: writeState(result.state),
  }
}
