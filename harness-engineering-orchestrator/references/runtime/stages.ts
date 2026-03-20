import type {
  DeliveryPhase,
  DeliveryPhaseApprovalStatus,
  DeliveryPhaseExecutionStatus,
  Milestone,
  ProductStage,
  ProjectState,
} from "../types"

function hasNewApprovalModel(state: ProjectState): boolean {
  return Boolean(
    state.roadmap.planApprovalStatus
    || state.roadmap.planApprovedAt
    || state.roadmap.phases?.some(phase => phase.approvalStatus || phase.executionStatus),
  )
}

function hasStartedExecution(state: ProjectState): boolean {
  return Boolean(
    state.execution.currentMilestone
    || state.execution.currentTask
    || state.execution.milestones.some(milestone =>
      milestone.status !== "PLANNED" ||
      milestone.tasks.some(task => task.status !== "PLANNED"),
    )
    || state.roadmap.stages.some(stage => ["ACTIVE", "DEPLOY_REVIEW", "COMPLETED"].includes(stage.status)),
  )
}

function getLegacyActivePhaseId(state: ProjectState): string | undefined {
  return (
    state.roadmap.activePhaseId
    || state.roadmap.currentStageId
    || state.roadmap.stages.find(stage => stage.status === "ACTIVE")?.id
    || state.roadmap.stages.find(stage => stage.status === "DEPLOY_REVIEW")?.id
    || state.roadmap.stages.find(stage => stage.status === "COMPLETED")?.id
    || undefined
  )
}

function getPhaseExecutionStatus(
  stage: ProductStage,
  activePhaseId: string | undefined,
): DeliveryPhaseExecutionStatus {
  if (stage.status === "COMPLETED") return "complete"
  if (stage.id === activePhaseId && stage.status === "DEPLOY_REVIEW") return "deploy_gate"
  if (stage.id === activePhaseId && stage.status === "ACTIVE") return "executing"
  return "draft"
}

function firstIncompletePhaseId(stages: ProductStage[]): string | undefined {
  return stages.find(stage => stage.status !== "COMPLETED")?.id
}

export function syncRoadmapPhases(state: ProjectState): void {
  const phaseMap = new Map((state.roadmap.phases ?? []).map(phase => [phase.id, phase]))
  const approvedPhaseIds = new Set(state.roadmap.approvedPhaseIds ?? [])
  const isMigratingLegacyExecution = !hasNewApprovalModel(state) && hasStartedExecution(state)
  const legacyActivePhaseId = getLegacyActivePhaseId(state)

  const planApprovalStatus =
    state.roadmap.planApprovalStatus
    ?? (state.roadmap.planApproved ? "approved" : undefined)
    ?? (isMigratingLegacyExecution ? "approved" : "pending")

  const planApprovedAt =
    state.roadmap.planApprovedAt
    ?? (planApprovalStatus === "approved" ? state.updatedAt : undefined)

  const activePhaseId =
    state.roadmap.activePhaseId
    ?? (state.roadmap.currentStageId && state.roadmap.stages.some(stage => stage.id === state.roadmap.currentStageId)
      ? state.roadmap.currentStageId
      : undefined)
    ?? (isMigratingLegacyExecution ? legacyActivePhaseId : undefined)

  const phases = state.roadmap.stages.map((stage, index): DeliveryPhase => {
    const existing = phaseMap.get(stage.id)
    const approvalStatus: DeliveryPhaseApprovalStatus =
      existing?.approvalStatus
      ?? (approvedPhaseIds.has(stage.id) ? "approved" : undefined)
      ?? (isMigratingLegacyExecution && (stage.id === legacyActivePhaseId || stage.status === "COMPLETED")
        ? "approved"
        : "pending")

    return {
      id: stage.id,
      name: stage.name,
      milestoneIds: [...stage.milestoneIds],
      order: index + 1,
      approvalStatus,
      approvedAt:
        existing?.approvedAt
        ?? (approvalStatus === "approved" ? state.updatedAt : undefined),
      executionStatus: getPhaseExecutionStatus(stage, activePhaseId),
      isLaunchPhase: index === 0,
    }
  })

  state.roadmap.planApprovalStatus = planApprovalStatus
  state.roadmap.planApprovedAt = planApprovedAt
  state.roadmap.activePhaseId = activePhaseId
  state.roadmap.approvedPhaseIds = phases
    .filter(phase => phase.approvalStatus === "approved")
    .map(phase => phase.id)
  state.roadmap.planApproved = planApprovalStatus === "approved"
  state.roadmap.phases = phases
  state.roadmap.currentStageId = activePhaseId ?? firstIncompletePhaseId(state.roadmap.stages) ?? ""
}

export function getDeliveryPhase(state: ProjectState, phaseId?: string): DeliveryPhase | undefined {
  if (!state.roadmap.phases?.length) {
    syncRoadmapPhases(state)
  }
  if (!phaseId) return undefined
  return state.roadmap.phases?.find(phase => phase.id === phaseId)
}

export function isPlanApproved(state: ProjectState): boolean {
  syncRoadmapPhases(state)
  return state.roadmap.planApprovalStatus === "approved"
}

export function isDeliveryPhaseApproved(state: ProjectState, phaseId?: string): boolean {
  if (!phaseId) return false
  return getDeliveryPhase(state, phaseId)?.approvalStatus === "approved"
}

export function getCurrentDeliveryPhase(state: ProjectState): DeliveryPhase | undefined {
  if (!state.roadmap.phases?.length) {
    syncRoadmapPhases(state)
  }

  return (
    state.roadmap.phases?.find(phase => phase.id === state.roadmap.activePhaseId)
    ?? state.roadmap.phases?.find(phase => phase.executionStatus === "executing")
    ?? state.roadmap.phases?.find(phase => phase.executionStatus === "deploy_gate")
    ?? state.roadmap.phases?.[0]
  )
}

export function getDraftDeliveryPhases(state: ProjectState): DeliveryPhase[] {
  if (!state.roadmap.phases?.length) {
    syncRoadmapPhases(state)
  }
  return state.roadmap.phases?.filter(phase => phase.executionStatus === "draft") ?? []
}

export function getNextDraftDeliveryPhase(state: ProjectState): DeliveryPhase | undefined {
  return getDraftDeliveryPhases(state)[0]
}

export function milestoneBelongsToActivePhase(state: ProjectState, milestone: Milestone): boolean {
  const activePhaseId = state.roadmap.activePhaseId ?? state.roadmap.currentStageId
  const milestonePhaseId = milestone.phaseId ?? milestone.productStageId
  return Boolean(activePhaseId) && milestonePhaseId === activePhaseId
}

export function milestoneIsExecutable(state: ProjectState, milestone: Milestone): boolean {
  const milestonePhaseId = milestone.phaseId ?? milestone.productStageId
  const phase = getDeliveryPhase(state, milestonePhaseId)
  return Boolean(
    milestoneBelongsToActivePhase(state, milestone) &&
    isPlanApproved(state) &&
    phase?.approvalStatus === "approved" &&
    phase.executionStatus === "executing",
  )
}

export function getCurrentProductStage(state: ProjectState): ProductStage | undefined {
  syncRoadmapPhases(state)
  return (
    state.roadmap.stages.find(stage => stage.id === (state.roadmap.activePhaseId ?? state.roadmap.currentStageId))
    ?? state.roadmap.stages.find(stage => stage.status === "ACTIVE")
    ?? state.roadmap.stages.find(stage => stage.status === "DEPLOY_REVIEW")
    ?? state.roadmap.stages[0]
  )
}

export function getActiveProductStage(state: ProjectState): ProductStage | undefined {
  syncRoadmapPhases(state)
  const activePhaseId = state.roadmap.activePhaseId
  if (!activePhaseId) return undefined
  return state.roadmap.stages.find(stage => stage.id === activePhaseId)
}

export function getDeferredProductStages(state: ProjectState): ProductStage[] {
  syncRoadmapPhases(state)
  const draftPhaseIds = new Set(
    (state.roadmap.phases ?? [])
      .filter(phase => phase.executionStatus === "draft")
      .map(phase => phase.id),
  )
  return state.roadmap.stages.filter(stage => draftPhaseIds.has(stage.id))
}

export function getNextDeferredProductStage(state: ProjectState): ProductStage | undefined {
  return getDeferredProductStages(state)[0]
}

export function hasDeferredProductStages(state: ProjectState): boolean {
  return getDeferredProductStages(state).length > 0
}

export function getStageMilestones(state: ProjectState, stageId: string): Milestone[] {
  return state.execution.milestones.filter(milestone => (milestone.phaseId ?? milestone.productStageId) === stageId)
}

export function countExecutionMilestonesForStage(state: ProjectState, stageId: string): number {
  return getStageMilestones(state, stageId).length
}

export function stageIsReadyForDeployReview(state: ProjectState, stageId: string): boolean {
  const milestones = getStageMilestones(state, stageId)
  if (milestones.length === 0) return false
  return milestones.every(milestone => ["MERGED", "COMPLETE"].includes(milestone.status))
}

export function approvePlan(state: ProjectState, approvedAt = new Date().toISOString()): void {
  state.roadmap.planApprovalStatus = "approved"
  state.roadmap.planApprovedAt = approvedAt
  state.roadmap.planApproved = true
  syncRoadmapPhases(state)
}

export function approveDeliveryPhase(state: ProjectState, phaseId: string, approvedAt = new Date().toISOString()): void {
  syncRoadmapPhases(state)
  const phase = getDeliveryPhase(state, phaseId)
  if (!phase) {
    throw new Error(`Delivery phase ${phaseId} was not found in state.`)
  }
  phase.approvalStatus = "approved"
  phase.approvedAt = approvedAt
  state.roadmap.approvedPhaseIds = Array.from(new Set([...(state.roadmap.approvedPhaseIds ?? []), phaseId]))
  syncRoadmapPhases(state)
}

export function activateDeliveryPhase(state: ProjectState, phaseId: string): void {
  syncRoadmapPhases(state)
  const phase = getDeliveryPhase(state, phaseId)
  if (!phase) {
    throw new Error(`Delivery phase ${phaseId} was not found in state.`)
  }

  state.roadmap.activePhaseId = phaseId
  state.roadmap.currentStageId = phaseId

  for (const stage of state.roadmap.stages) {
    if (stage.id === phaseId) {
      if (stage.status !== "COMPLETED") {
        stage.status = "ACTIVE"
      }
      continue
    }

    if (stage.status === "ACTIVE") {
      stage.status = "DEFERRED"
    }
  }

  syncRoadmapPhases(state)
}

export function markStageDeployReview(state: ProjectState, stageId: string): void {
  const stage = state.roadmap.stages.find(candidate => candidate.id === stageId)
  if (!stage) return
  if (!stageIsReadyForDeployReview(state, stageId)) return

  stage.status = "DEPLOY_REVIEW"
  stage.deployReviewStartedAt = stage.deployReviewStartedAt ?? new Date().toISOString()
  state.roadmap.activePhaseId = stage.id
  state.roadmap.currentStageId = stage.id
  syncRoadmapPhases(state)
}
