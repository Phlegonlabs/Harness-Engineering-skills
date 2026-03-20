import { afterEach, beforeEach, expect, test } from "bun:test"
import { mkdtempSync, mkdirSync, rmSync, writeFileSync } from "fs"
import { tmpdir } from "os"
import { dirname, join } from "path"
import type { Milestone, ProjectState, Task } from "../../types"
import { initState } from "../state-core"
import { buildAgentTaskPacketForTask, detectPlatform } from "./context-builder"
import { dispatchParallel } from "./dispatcher"

let originalCwd = ""
let workspaceDir = ""
let originalClaudeCode = ""
let originalCodexManagedByNpm = ""
let originalCodexHome = ""
let originalCodexSandbox = ""
let originalCodexThreadId = ""

function write(path: string, content = ""): void {
  const fullPath = join(workspaceDir, path)
  mkdirSync(dirname(fullPath), { recursive: true })
  writeFileSync(fullPath, content)
}

function createTask(
  taskId: string,
  milestoneId: string,
  options?: Partial<Task>,
): Task {
  return {
    id: taskId,
    name: `Task ${taskId}`,
    type: "TASK",
    status: "PENDING",
    prdRef: `PRD#${taskId}`,
    milestoneId,
    dod: [`Complete ${taskId}`],
    isUI: false,
    affectedFiles: [`src/${taskId.toLowerCase()}.ts`],
    retryCount: 0,
    ...options,
  }
}

function createMilestone(id: string, tasks: Task[]): Milestone {
  return {
    id,
    name: `Milestone ${id}`,
    productStageId: "V1",
    branch: `milestone/${id.toLowerCase()}`,
    worktreePath: `../fixture-${id.toLowerCase()}`,
    status: "IN_PROGRESS",
    tasks,
  }
}

function createExecutingState(): ProjectState {
  const state = initState({})
  state.phase = "EXECUTING"
  state.projectInfo.name = "parallel-dispatch-fixture"
  state.projectInfo.displayName = "Parallel Dispatch Fixture"
  state.projectInfo.concept = "Validate parallel dispatch contracts."
  state.projectInfo.problem = "Parallel dispatch can drift from sequential routing."
  state.projectInfo.goal = "Keep task packets and routing aligned with the PRD."
  state.projectInfo.types = ["web-app"]
  state.projectInfo.aiProvider = "none"
  state.projectInfo.teamSize = "solo"
  state.projectInfo.isGreenfield = true
  state.projectInfo.concurrency = {
    maxParallelTasks: 2,
    maxParallelMilestones: 1,
    enableInterMilestone: false,
  }
  state.roadmap.planApprovalStatus = "approved"
  state.roadmap.planApprovedAt = "2026-03-15T08:00:00.000Z"
  state.roadmap.activePhaseId = "V1"
  state.roadmap.approvedPhaseIds = ["V1"]
  state.roadmap.currentStageId = "V1"
  state.roadmap.stages = [
    {
      id: "V1",
      name: "Initial Delivery",
      status: "ACTIVE",
      milestoneIds: ["M1", "M2"],
      prdVersion: "v1.0",
      architectureVersion: "v1.0",
    },
  ]
  state.docs.prd.version = "v1.0"
  state.docs.architecture.version = "v1.0"
  return state
}

function writeAgentFixtures(): void {
  write("agents/execution-engine.md", "# execution engine\n")
  write("agents/execution-engine/01-preflight.md", "# preflight\n")
  write("agents/execution-engine/02-task-loop.md", "# task loop\n")
  write("agents/frontend-designer.md", "# frontend designer\n")
  write("docs/PRD.md", "> **Version**: v1.0\n")
  write("docs/ARCHITECTURE.md", "> **Version**: v1.0\n")
  write(".harness/state.json", "{}\n")
}

beforeEach(() => {
  originalCwd = process.cwd()
  workspaceDir = mkdtempSync(join(tmpdir(), "harness-parallel-dispatch-"))
  process.chdir(workspaceDir)
  originalClaudeCode = process.env.CLAUDE_CODE ?? ""
  originalCodexManagedByNpm = process.env.CODEX_MANAGED_BY_NPM ?? ""
  originalCodexHome = process.env.CODEX_HOME ?? ""
  originalCodexSandbox = process.env.CODEX_SANDBOX ?? ""
  originalCodexThreadId = process.env.CODEX_THREAD_ID ?? ""
  delete process.env.CLAUDE_CODE
  delete process.env.CODEX_MANAGED_BY_NPM
  delete process.env.CODEX_HOME
  delete process.env.CODEX_SANDBOX
  delete process.env.CODEX_THREAD_ID
})

afterEach(() => {
  process.chdir(originalCwd)
  if (originalClaudeCode) process.env.CLAUDE_CODE = originalClaudeCode
  else delete process.env.CLAUDE_CODE
  if (originalCodexManagedByNpm) process.env.CODEX_MANAGED_BY_NPM = originalCodexManagedByNpm
  else delete process.env.CODEX_MANAGED_BY_NPM
  if (originalCodexHome) process.env.CODEX_HOME = originalCodexHome
  else delete process.env.CODEX_HOME
  if (originalCodexSandbox) process.env.CODEX_SANDBOX = originalCodexSandbox
  else delete process.env.CODEX_SANDBOX
  if (originalCodexThreadId) process.env.CODEX_THREAD_ID = originalCodexThreadId
  else delete process.env.CODEX_THREAD_ID
  rmSync(workspaceDir, { force: true, recursive: true })
})

test("detectPlatform uses Codex runtime signals instead of workspace/session files", () => {
  process.env.CODEX_THREAD_ID = "thread-123"
  expect(detectPlatform()).toBe("codex-cli")
})

test("buildAgentTaskPacketForTask uses the provided milestone/task context", () => {
  writeAgentFixtures()
  write("docs/design/DESIGN_SYSTEM.md", "# Design System\n")
  write("docs/design/m2-ui-spec.md", "# M2 UI Spec\n")

  const state = createExecutingState()
  const currentTask = createTask("T101", "M1", { status: "IN_PROGRESS", isUI: false })
  const parallelTask = createTask("T201", "M2", { isUI: true, affectedFiles: ["src/m2-ui.tsx"] })
  const currentMilestone = createMilestone("M1", [currentTask])
  const targetMilestone = createMilestone("M2", [parallelTask])

  state.execution.currentMilestone = "M1"
  state.execution.currentTask = "T101"
  state.execution.currentWorktree = currentMilestone.worktreePath
  state.execution.milestones = [currentMilestone, targetMilestone]

  const packet = buildAgentTaskPacketForTask(
    "execution-engine",
    state,
    targetMilestone,
    parallelTask,
    "codex-cli",
  )

  expect(packet.currentTask?.id).toBe("T201")
  expect(packet.afterCompletion.join("\n")).toContain('completeTask("T201"')
  expect(packet.optionalRefs).toContain("docs/design/m2-ui-spec.md")
})

test("dispatchParallel keeps work within one milestone when inter-milestone parallelism is disabled", () => {
  writeAgentFixtures()

  const state = createExecutingState()
  const uiTask = createTask("T101", "M1", { isUI: true, affectedFiles: ["src/ui.tsx"] })
  const nonUiTask = createTask("T102", "M1", { isUI: false, affectedFiles: ["src/api.ts"] })
  const parallelMilestoneTask = createTask("T201", "M2", { isUI: false, affectedFiles: ["src/other.ts"] })
  const uiMilestone = createMilestone("M1", [uiTask, nonUiTask])
  const parallelMilestone = createMilestone("M2", [parallelMilestoneTask])

  state.execution.milestones = [uiMilestone, parallelMilestone]
  state.execution.currentMilestone = "M1"
  state.execution.currentTask = ""
  state.execution.currentWorktree = ""

  const result = dispatchParallel(state, "codex-cli")

  expect(result.dispatches.some(dispatch =>
    dispatch.type === "agent" &&
    dispatch.agentId === "frontend-designer" &&
    dispatch.packet?.currentTask?.id === "T101",
  )).toBe(true)
  expect(result.dispatches.some(dispatch =>
    dispatch.type === "agent" &&
    dispatch.agentId === "execution-engine" &&
    dispatch.packet?.currentTask?.id === "T102",
  )).toBe(true)
  expect(result.dispatches.some(dispatch => dispatch.packet?.currentTask?.id === "T201")).toBe(false)
  expect(result.concurrencyMode).toBe("parallel-tasks")
})

test("dispatchParallel allows cross-milestone work when explicitly enabled", () => {
  writeAgentFixtures()

  const state = createExecutingState()
  state.projectInfo.concurrency = {
    maxParallelTasks: 2,
    maxParallelMilestones: 2,
    enableInterMilestone: true,
  }

  const uiTask = createTask("T101", "M1", { isUI: true, affectedFiles: ["src/ui.tsx"] })
  const nonUiTask = createTask("T201", "M2", { isUI: false, affectedFiles: ["src/api.ts"] })
  const uiMilestone = createMilestone("M1", [uiTask])
  const nonUiMilestone = createMilestone("M2", [nonUiTask])

  state.execution.milestones = [uiMilestone, nonUiMilestone]
  state.execution.currentMilestone = "M1"
  state.execution.currentTask = ""
  state.execution.currentWorktree = ""

  const result = dispatchParallel(state, "codex-cli")

  expect(result.dispatches.some(dispatch =>
    dispatch.type === "agent" &&
    dispatch.agentId === "frontend-designer" &&
    dispatch.packet?.currentTask?.id === "T101",
  )).toBe(true)
  expect(result.dispatches.some(dispatch =>
    dispatch.type === "agent" &&
    dispatch.agentId === "execution-engine" &&
    dispatch.packet?.currentTask?.id === "T201",
  )).toBe(true)
  expect(result.concurrencyMode).toBe("parallel-milestones")
})

test("dispatchParallel drops stale active agents before checking ownership overlap", () => {
  writeAgentFixtures()

  const state = createExecutingState()
  const task = createTask("T101", "M1", { affectedFiles: ["src/api.ts"] })
  const milestone = createMilestone("M1", [task])

  state.execution.milestones = [milestone]
  state.execution.activeAgents = [
    {
      agentId: "execution-engine:T101",
      logicalAgentId: "execution-engine",
      milestoneId: "M1",
      taskId: "T101",
      worktreePath: milestone.worktreePath,
      runtimeHandle: "pending:execution-engine:T101",
      nativeRole: "worker",
      ownershipScope: ["src/api.ts"],
      status: "running",
      startedAt: new Date(Date.now() - 61 * 60_000).toISOString(),
      platform: "codex-cli",
    },
  ]

  const result = dispatchParallel(state, "codex-cli")

  expect(result.dispatches.some(dispatch =>
    dispatch.type === "agent" &&
    dispatch.agentId === "execution-engine" &&
    dispatch.packet?.currentTask?.id === "T101",
  )).toBe(true)
  expect(state.execution.activeAgents?.length ?? 0).toBe(0)
})
