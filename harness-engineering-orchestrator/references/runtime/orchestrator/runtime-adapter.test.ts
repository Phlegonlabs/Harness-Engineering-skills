import { expect, test } from "bun:test"
import type { SubagentDispatchPolicy } from "../../types"
import { getRuntimeAdapter } from "./runtime-adapter"

const basePolicy: SubagentDispatchPolicy = {
  closeStrategy: "close-on-integration",
  forkContext: true,
  logicalAgentId: "execution-engine",
  nativeRole: "worker",
  waitStrategy: "immediate",
  writeMode: "scoped-write",
}

test("getRuntimeAdapter returns a Codex adapter with native subagent semantics", () => {
  const adapter = getRuntimeAdapter("codex-cli")
  const runtime = adapter.spawnLaunch({
    kind: "task-agent",
    launchId: "launch-1",
    logicalAgentId: "execution-engine",
    platform: "codex-cli",
    policy: basePolicy,
    prompt: "Implement task T101",
  })

  expect(adapter.id).toBe("codex-cli")
  expect(runtime.adapterId).toBe("codex-cli")
  expect(runtime.capabilities.spawnPrimitive).toBe("native-subagent")
  expect(runtime.capabilities.supportsNativeSubagents).toBe(true)
  expect(runtime.spawn.action).toBe("spawn_agent")
  expect(runtime.spawn.toolName).toBe("spawn_agent")
  expect(runtime.spawn.handleSource).toBe("tool-response")
  expect(runtime.spawn.transport).toBe("parent-runtime-tool")
})

test("getRuntimeAdapter returns a Claude adapter with bridge semantics", () => {
  const adapter = getRuntimeAdapter("claude-code")
  const runtime = adapter.spawnLaunch({
    kind: "task-agent",
    launchId: "launch-2",
    logicalAgentId: "execution-engine",
    platform: "claude-code",
    policy: basePolicy,
    prompt: "Implement task T102",
  })

  expect(adapter.id).toBe("claude-code")
  expect(runtime.adapterId).toBe("claude-code")
  expect(runtime.capabilities.spawnPrimitive).toBe("agent-tool-bridge")
  expect(runtime.capabilities.supportsNativeSubagents).toBe(false)
  expect(runtime.spawn.action).toBe("claude_bridge.launch_agent")
  expect(runtime.spawn.toolName).toBe("claude_bridge.launch_agent")
  expect(runtime.spawn.handleSource).toBe("bridge-response")
  expect(runtime.spawn.transport).toBe("parent-runtime-tool")
})

test("unknown platforms fall back to manual handoff execution", () => {
  const adapter = getRuntimeAdapter("unknown")
  const runtime = adapter.spawnLaunch({
    kind: "review-agent",
    launchId: "launch-3",
    logicalAgentId: "code-reviewer",
    platform: "unknown",
    prompt: "Review task T103",
  })

  expect(adapter.id).toBe("external")
  expect(runtime.adapterId).toBe("external")
  expect(runtime.capabilities.spawnPrimitive).toBe("manual-handoff")
  expect(runtime.spawn.handleSource).toBe("operator-supplied")
  expect(runtime.spawn.transport).toBe("manual")
})
