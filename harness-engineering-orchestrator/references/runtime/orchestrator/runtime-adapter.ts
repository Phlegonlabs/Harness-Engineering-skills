import type {
  AgentLaunchKind,
  AgentLaunchRequest,
  AgentPlatform,
  AgentRuntimeAdapterId,
  AgentRuntimeCapabilities,
  AgentRuntimeExecution,
  AgentRuntimeLifecycleRecord,
  AgentRuntimeSpawnRequest,
  SubagentDispatchPolicy,
} from "../../types"

type RuntimePolicy = Omit<SubagentDispatchPolicy, "logicalAgentId">

export interface AgentRuntimeAdapterLaunchInput {
  kind: AgentLaunchKind
  launchId: string
  logicalAgentId: AgentLaunchRequest["logicalAgentId"]
  platform: AgentPlatform
  policy?: SubagentDispatchPolicy
  prompt: string
}

export interface AgentRuntimeAdapter {
  id: AgentRuntimeAdapterId
  supports(platform: AgentPlatform): boolean
  spawnLaunch(input: AgentRuntimeAdapterLaunchInput): AgentRuntimeExecution
  confirmLaunch(runtime: AgentRuntimeExecution, runtimeHandle: string): AgentRuntimeExecution
  rollbackLaunch(runtime: AgentRuntimeExecution, reason: string): AgentRuntimeExecution
  releaseLaunch(runtime: AgentRuntimeExecution): AgentRuntimeExecution
  waitForChild(runtime: AgentRuntimeExecution): AgentRuntimeExecution
}

function createLifecycleRecord(
  action: AgentRuntimeLifecycleRecord["action"],
  note: string,
): AgentRuntimeLifecycleRecord {
  return {
    action,
    actor: "adapter",
    note,
    recordedAt: new Date().toISOString(),
  }
}

function resolveRuntimePolicy(
  kind: AgentLaunchKind,
  policy?: SubagentDispatchPolicy,
): RuntimePolicy {
  if (policy) {
    const { logicalAgentId: _logicalAgentId, ...runtimePolicy } = policy
    return runtimePolicy
  }

  if (kind === "review-agent") {
    return {
      closeStrategy: "close-on-integration",
      forkContext: true,
      nativeRole: "worker",
      waitStrategy: "immediate",
      writeMode: "read-only",
    }
  }

  return {
    closeStrategy: "close-on-integration",
    forkContext: true,
    nativeRole: "worker",
    waitStrategy: "immediate",
    writeMode: "scoped-write",
  }
}

function buildCapabilities(
  adapterId: AgentRuntimeAdapterId,
  policy: RuntimePolicy,
  options: {
    closeModel: AgentRuntimeCapabilities["closeModel"]
    runtimeHandleFormat: string
    spawnPrimitive: AgentRuntimeCapabilities["spawnPrimitive"]
    supportsNativeSubagents: boolean
    waitOwner: AgentRuntimeCapabilities["waitOwner"]
  },
): AgentRuntimeCapabilities {
  return {
    adapterId,
    closeModel: options.closeModel,
    runtimeHandleFormat: options.runtimeHandleFormat,
    spawnPrimitive: options.spawnPrimitive,
    supportsNativeSubagents: options.supportsNativeSubagents,
    supportsParallelLaunch: true,
    waitOwner: options.waitOwner,
    writeIsolation: policy.writeMode,
  }
}

function buildCodexSpawnRequest(
  input: AgentRuntimeAdapterLaunchInput,
  policy: RuntimePolicy,
): AgentRuntimeSpawnRequest {
  return {
    action: "spawn_agent",
    adapterId: "codex-cli",
    handleHint: `codex-agent:${input.launchId}`,
    handleSource: "tool-response",
    instructions: [
      "Call the Codex spawn_agent tool with the stored payload.",
      "Use the returned agent id as the runtime handle for --confirm.",
      "On spawn failure, call --rollback with the failure reason.",
    ],
    payload: {
      agent_type: policy.nativeRole === "monitor" ? "worker" : policy.nativeRole,
      fork_context: policy.forkContext,
      launch_id: input.launchId,
      logical_agent_id: input.logicalAgentId,
      message: input.prompt,
    },
    toolName: "spawn_agent",
    transport: "parent-runtime-tool",
  }
}

function buildClaudeSpawnRequest(
  input: AgentRuntimeAdapterLaunchInput,
  policy: RuntimePolicy,
): AgentRuntimeSpawnRequest {
  return {
    action: "claude_bridge.launch_agent",
    adapterId: "claude-code",
    handleHint: `claude-agent:${input.launchId}`,
    handleSource: "bridge-response",
    instructions: [
      "Invoke the Claude host bridge or Agent tool equivalent with the stored payload.",
      "Use the bridge-returned child handle for --confirm.",
      "If the bridge cannot launch the child, call --rollback with the failure reason.",
    ],
    payload: {
      forkContext: policy.forkContext,
      instruction: input.prompt,
      launchId: input.launchId,
      logicalAgentId: input.logicalAgentId,
      role: policy.nativeRole,
      writeMode: policy.writeMode,
    },
    toolName: "claude_bridge.launch_agent",
    transport: "parent-runtime-tool",
  }
}

function buildExternalSpawnRequest(
  input: AgentRuntimeAdapterLaunchInput,
  policy: RuntimePolicy,
): AgentRuntimeSpawnRequest {
  return {
    action: "manual-launch",
    adapterId: "external",
    handleHint: `external:${input.launchId}`,
    handleSource: "operator-supplied",
    instructions: [
      "Launch the child manually with the stored prompt and role information.",
      "Supply the resulting handle to --confirm once the child exists.",
      "If manual launch fails, call --rollback with the failure reason.",
    ],
    payload: {
      forkContext: policy.forkContext,
      logicalAgentId: input.logicalAgentId,
      note: "Parent runtime must launch the child and confirm the handle manually.",
      prompt: input.prompt,
      role: policy.nativeRole,
    },
    toolName: "manual-launch",
    transport: "manual",
  }
}

function withLifecycle(
  runtime: AgentRuntimeExecution,
  record: AgentRuntimeLifecycleRecord,
): AgentRuntimeExecution {
  return {
    ...runtime,
    lifecycle: [...runtime.lifecycle, record],
  }
}

function bindRuntimeHandle(
  runtime: AgentRuntimeExecution,
  runtimeHandle: string,
): AgentRuntimeExecution {
  return withLifecycle(
    {
      ...runtime,
      runtimeHandle,
    },
    createLifecycleRecord("confirm", `Bound runtime handle ${runtimeHandle}.`),
  )
}

function appendLifecycleNote(
  runtime: AgentRuntimeExecution,
  action: "release" | "rollback" | "spawn",
  note: string,
): AgentRuntimeExecution {
  return withLifecycle(runtime, createLifecycleRecord(action, note))
}

class CodexRuntimeAdapter implements AgentRuntimeAdapter {
  readonly id = "codex-cli" as const

  supports(platform: AgentPlatform): boolean {
    return platform === "codex-cli"
  }

  spawnLaunch(input: AgentRuntimeAdapterLaunchInput): AgentRuntimeExecution {
    const policy = resolveRuntimePolicy(input.kind, input.policy)
    return {
      adapterId: this.id,
      capabilities: buildCapabilities(this.id, policy, {
        closeModel: "runtime-close",
        runtimeHandleFormat: "codex-agent:<id>",
        spawnPrimitive: "native-subagent",
        supportsNativeSubagents: true,
        waitOwner: "runtime",
      }),
      lifecycle: [
        createLifecycleRecord("spawn", "Prepared Codex native subagent launch request."),
      ],
      platform: input.platform,
      policy,
      spawn: buildCodexSpawnRequest(input, policy),
    }
  }

  confirmLaunch(runtime: AgentRuntimeExecution, runtimeHandle: string): AgentRuntimeExecution {
    return bindRuntimeHandle(runtime, runtimeHandle)
  }

  rollbackLaunch(runtime: AgentRuntimeExecution, reason: string): AgentRuntimeExecution {
    return appendLifecycleNote(runtime, "rollback", `Rolled back Codex launch: ${reason}`)
  }

  releaseLaunch(runtime: AgentRuntimeExecution): AgentRuntimeExecution {
    return appendLifecycleNote(runtime, "release", "Released Codex child from orchestrator ownership.")
  }

  waitForChild(runtime: AgentRuntimeExecution): AgentRuntimeExecution {
    return appendLifecycleNote(runtime, "spawn", `Wait strategy: ${runtime.policy.waitStrategy}`)
  }
}

class ClaudeRuntimeAdapter implements AgentRuntimeAdapter {
  readonly id = "claude-code" as const

  supports(platform: AgentPlatform): boolean {
    return platform === "claude-code"
  }

  spawnLaunch(input: AgentRuntimeAdapterLaunchInput): AgentRuntimeExecution {
    const policy = resolveRuntimePolicy(input.kind, input.policy)
    return {
      adapterId: this.id,
      capabilities: buildCapabilities(this.id, policy, {
        closeModel: "release-command",
        runtimeHandleFormat: "claude-agent:<id>",
        spawnPrimitive: "agent-tool-bridge",
        supportsNativeSubagents: false,
        waitOwner: "parent-runtime",
      }),
      lifecycle: [
        createLifecycleRecord("spawn", "Prepared Claude bridge launch request."),
      ],
      platform: input.platform,
      policy,
      spawn: buildClaudeSpawnRequest(input, policy),
    }
  }

  confirmLaunch(runtime: AgentRuntimeExecution, runtimeHandle: string): AgentRuntimeExecution {
    return bindRuntimeHandle(runtime, runtimeHandle)
  }

  rollbackLaunch(runtime: AgentRuntimeExecution, reason: string): AgentRuntimeExecution {
    return appendLifecycleNote(runtime, "rollback", `Rolled back Claude launch: ${reason}`)
  }

  releaseLaunch(runtime: AgentRuntimeExecution): AgentRuntimeExecution {
    return appendLifecycleNote(runtime, "release", "Released Claude bridge child from orchestrator ownership.")
  }

  waitForChild(runtime: AgentRuntimeExecution): AgentRuntimeExecution {
    return appendLifecycleNote(runtime, "spawn", `Wait strategy: ${runtime.policy.waitStrategy}`)
  }
}

class ExternalRuntimeAdapter implements AgentRuntimeAdapter {
  readonly id = "external" as const

  supports(platform: AgentPlatform): boolean {
    return platform === "unknown"
  }

  spawnLaunch(input: AgentRuntimeAdapterLaunchInput): AgentRuntimeExecution {
    const policy = resolveRuntimePolicy(input.kind, input.policy)
    return {
      adapterId: this.id,
      capabilities: buildCapabilities(this.id, policy, {
        closeModel: "manual",
        runtimeHandleFormat: "external:<id>",
        spawnPrimitive: "manual-handoff",
        supportsNativeSubagents: false,
        waitOwner: "operator",
      }),
      lifecycle: [
        createLifecycleRecord("spawn", "Prepared external runtime handoff packet."),
      ],
      platform: input.platform,
      policy,
      spawn: buildExternalSpawnRequest(input, policy),
    }
  }

  confirmLaunch(runtime: AgentRuntimeExecution, runtimeHandle: string): AgentRuntimeExecution {
    return bindRuntimeHandle(runtime, runtimeHandle)
  }

  rollbackLaunch(runtime: AgentRuntimeExecution, reason: string): AgentRuntimeExecution {
    return appendLifecycleNote(runtime, "rollback", `Rolled back external launch: ${reason}`)
  }

  releaseLaunch(runtime: AgentRuntimeExecution): AgentRuntimeExecution {
    return appendLifecycleNote(runtime, "release", "Released external launch reservation.")
  }

  waitForChild(runtime: AgentRuntimeExecution): AgentRuntimeExecution {
    return appendLifecycleNote(runtime, "spawn", `Wait strategy: ${runtime.policy.waitStrategy}`)
  }
}

const ADAPTERS: AgentRuntimeAdapter[] = [
  new ClaudeRuntimeAdapter(),
  new CodexRuntimeAdapter(),
  new ExternalRuntimeAdapter(),
]

export function getRuntimeAdapter(platform: AgentPlatform): AgentRuntimeAdapter {
  return ADAPTERS.find(adapter => adapter.supports(platform)) ?? ADAPTERS[ADAPTERS.length - 1]!
}
