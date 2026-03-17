import { expect, test } from "bun:test"
import type { ActiveAgent, ProjectState } from "../types"
import { deregisterActiveAgent, registerActiveAgent } from "./execution"
import { initState } from "./state-core"

function createParallelState(): ProjectState {
  const state = initState({})
  state.projectInfo.concurrency = {
    maxParallelTasks: 2,
    maxParallelMilestones: 1,
    enableInterMilestone: false,
  }
  return state
}

function createActiveAgent(
  taskId: string,
  milestoneId: string,
  worktreePath: string,
): ActiveAgent {
  return {
    agentId: `execution-engine:${taskId}`,
    logicalAgentId: "execution-engine",
    milestoneId,
    taskId,
    worktreePath,
    runtimeHandle: `pending:execution-engine:${taskId}`,
    nativeRole: "worker",
    ownershipScope: [`src/${taskId.toLowerCase()}.ts`],
    status: "running",
    startedAt: new Date().toISOString(),
    platform: "codex-cli",
  }
}

test("registerActiveAgent keeps legacy execution pointers aligned to the first live agent", () => {
  const state = createParallelState()
  const first = createActiveAgent("T101", "M1", "../fixture-m1")
  const second = createActiveAgent("T201", "M2", "../fixture-m2")

  registerActiveAgent(state, first)
  registerActiveAgent(state, second)

  expect(state.execution.activeAgents?.map(agent => agent.taskId)).toEqual(["T101", "T201"])
  expect(state.execution.currentMilestone).toBe("M1")
  expect(state.execution.currentTask).toBe("T101")
  expect(state.execution.currentWorktree).toBe("../fixture-m1")
})

test("deregisterActiveAgent promotes the next live agent and clears pointers when none remain", () => {
  const state = createParallelState()
  const first = createActiveAgent("T101", "M1", "../fixture-m1")
  const second = createActiveAgent("T201", "M2", "../fixture-m2")

  registerActiveAgent(state, first)
  registerActiveAgent(state, second)
  deregisterActiveAgent(state, first.agentId)

  expect(state.execution.activeAgents?.map(agent => agent.taskId)).toEqual(["T201"])
  expect(state.execution.currentMilestone).toBe("M2")
  expect(state.execution.currentTask).toBe("T201")
  expect(state.execution.currentWorktree).toBe("../fixture-m2")

  deregisterActiveAgent(state, second.agentId)

  expect(state.execution.activeAgents).toEqual([])
  expect(state.execution.currentMilestone).toBe("")
  expect(state.execution.currentTask).toBe("")
  expect(state.execution.currentWorktree).toBe("")
})
