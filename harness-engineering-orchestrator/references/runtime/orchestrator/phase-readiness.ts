import type { HarnessLevel, Phase, ProjectState } from "../../types"
import { type StructuralCheck, getPhaseStructuralChecks } from "../phase-structural"
import { getCurrentDeliveryPhase, getCurrentProductStage, isDeliveryPhaseApproved, isPlanApproved } from "../stages"

type OutputCheck = {
  label: string
  ok: boolean
}

function filterByLevel(checks: StructuralCheck[], level: HarnessLevel): StructuralCheck[] {
  return checks.filter(item => {
    if (item.level === "full") return level === "full"
    if (item.level === "standard") return level === "standard" || level === "full"
    return true
  })
}

export interface PhaseReadiness {
  missingOutputs: string[]
  phase: Phase
  ready: boolean
  requiredOutputs: string[]
}

function check(label: string, ok: boolean): OutputCheck {
  return { label, ok }
}

function buildReadiness(phase: Phase, checks: OutputCheck[]): PhaseReadiness {
  return {
    missingOutputs: checks.filter(item => !item.ok).map(item => item.label),
    phase,
    ready: checks.every(item => item.ok),
    requiredOutputs: checks.map(item => item.label),
  }
}

function nextPhaseForReadiness(phase: Phase): Phase {
  switch (phase) {
    case "DISCOVERY":
      return "MARKET_RESEARCH"
    case "MARKET_RESEARCH":
      return "TECH_STACK"
    case "TECH_STACK":
      return "PRD_ARCH"
    case "PRD_ARCH":
      return "SCAFFOLD"
    case "SCAFFOLD":
      return "EXECUTING"
    default:
      return phase
  }
}

export function getPhaseReadiness(state: ProjectState): PhaseReadiness {
  switch (state.phase) {
    case "DISCOVERY":
    case "MARKET_RESEARCH":
    case "TECH_STACK":
    case "PRD_ARCH":
    case "SCAFFOLD": {
      const level = state.projectInfo.harnessLevel?.level ?? "standard"
      return buildReadiness(
        state.phase,
        filterByLevel(getPhaseStructuralChecks(nextPhaseForReadiness(state.phase), state), level).map(item =>
          check(item.label, item.ok),
        ),
      )
    }
    case "EXECUTING":
      if (!isPlanApproved(state) || !state.roadmap.activePhaseId) {
        return buildReadiness(state.phase, [
          check("overall planning approval is recorded", isPlanApproved(state)),
          check("an active approved delivery phase is selected", Boolean(state.roadmap.activePhaseId)),
        ])
      }
      if (getCurrentProductStage(state)?.status === "DEPLOY_REVIEW") {
        return buildReadiness(state.phase, [
          check("current product stage is waiting on deploy / real-world review", true),
        ])
      }
      const currentDeliveryPhase = getCurrentDeliveryPhase(state)
      return buildReadiness(state.phase, [
        check("current delivery phase exists", Boolean(currentDeliveryPhase)),
        check(
          "current delivery phase has explicit approval",
          Boolean(currentDeliveryPhase && isDeliveryPhaseApproved(state, currentDeliveryPhase.id)),
        ),
        check(
          "current delivery phase is executing",
          currentDeliveryPhase?.executionStatus === "executing",
        ),
        check("execution backlog has at least 1 milestone", state.execution.milestones.length > 0),
        check(
          "there is an active milestone or a milestone in REVIEW for the current delivery phase",
          Boolean(state.execution.currentMilestone) || state.execution.milestones.some(item => item.status === "REVIEW"),
        ),
      ])
    case "VALIDATING":
      return buildReadiness(state.phase, [
        check("all milestones are complete", state.execution.allMilestonesComplete),
      ])
    case "COMPLETE":
      return buildReadiness(state.phase, [])
  }
}
