import { existsSync } from "fs"
import type { AgentId, Milestone, Phase, ProjectState } from "../../types"
import { isUiProject } from "../shared"

export interface AgentEntry {
  id: AgentId
  name: string
  specPath: string
  subSpecs?: string[]
}

const AGENT_ENTRIES: AgentEntry[] = [
  {
    id: "project-discovery",
    name: "Project Discovery Agent",
    specPath: "agents/project-discovery.md",
  },
  {
    id: "market-research",
    name: "Market Research Agent",
    specPath: "agents/market-research.md",
  },
  {
    id: "tech-stack-advisor",
    name: "Tech Stack Advisor Agent",
    specPath: "agents/tech-stack-advisor.md",
  },
  {
    id: "prd-architect",
    name: "PRD Architect Agent",
    specPath: "agents/prd-architect.md",
  },
  {
    id: "scaffold-generator",
    name: "Scaffold Generator Agent",
    specPath: "agents/scaffold-generator.md",
  },
  {
    id: "frontend-designer",
    name: "Frontend Designer Agent",
    specPath: "agents/frontend-designer.md",
  },
  {
    id: "execution-engine",
    name: "Execution Engine Agent",
    specPath: "agents/execution-engine.md",
    subSpecs: [
      "agents/execution-engine/01-preflight.md",
      "agents/execution-engine/02-task-loop.md",
      "agents/execution-engine/03-spike-workflow.md",
      "agents/execution-engine/04-stack-scaffolds.md",
      "agents/execution-engine/05-debug-and-learning.md",
    ],
  },
  {
    id: "design-reviewer",
    name: "Design Reviewer Agent",
    specPath: "agents/design-reviewer.md",
  },
  {
    id: "code-reviewer",
    name: "Code Reviewer Agent",
    specPath: "agents/code-reviewer.md",
  },
  {
    id: "harness-validator",
    name: "Harness Validator Agent",
    specPath: "agents/harness-validator.md",
  },
  {
    id: "context-compactor",
    name: "Context Compactor Agent",
    specPath: "agents/context-compactor.md",
  },
]

export function getAgentEntry(agentId: AgentId): AgentEntry | undefined {
  return AGENT_ENTRIES.find(entry => entry.id === agentId)
}

export function getAllAgentEntries(): AgentEntry[] {
  return AGENT_ENTRIES
}

const V1_UNSUPPORTED_PHASES: Partial<Record<Phase, string>> = {}

export function getUnsupportedPhaseGuidance(phase: Phase): string | undefined {
  return V1_UNSUPPORTED_PHASES[phase]
}

export function needsDesignSystem(): boolean {
  return !existsSync("docs/design/DESIGN_SYSTEM.md")
}

export function needsMilestoneSpec(milestone: Milestone): boolean {
  if (!milestone.tasks.some(task => task.isUI)) return false
  const specPath = `docs/design/${milestone.id.toLowerCase()}-ui-spec.md`
  return !existsSync(specPath)
}

export function needsFrontendDesigner(state: ProjectState): boolean {
  if (!isUiProject(state.projectInfo.types)) return false
  const milestone = state.execution.milestones.find(
    m => m.id === state.execution.currentMilestone,
  )
  if (!milestone) return false
  return needsDesignSystem() || needsMilestoneSpec(milestone)
}
