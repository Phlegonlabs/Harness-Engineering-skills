type ClaudeHookEvent = "PreToolUse" | "PostToolUse" | "Stop"

export type ClaudeCommandHook = {
  command: string
  type: "command"
}

export type ClaudeToolHook = {
  hooks: ClaudeCommandHook[]
  matcher?: string
}

type ClaudeHookMap = Record<ClaudeHookEvent, ClaudeToolHook[]>

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value)
}

function cloneToolHook(entry: ClaudeToolHook): ClaudeToolHook {
  return {
    ...(entry.matcher ? { matcher: entry.matcher } : {}),
    hooks: entry.hooks.map(hook => ({ ...hook })),
  }
}

function normalizeCommandHook(value: unknown): ClaudeCommandHook | null {
  if (!isRecord(value) || value.type !== "command" || typeof value.command !== "string") {
    return null
  }

  return {
    type: "command",
    command: value.command,
  }
}

function normalizeToolHook(value: unknown): ClaudeToolHook | null {
  if (!isRecord(value)) return null

  const hooks = Array.isArray(value.hooks)
    ? value.hooks.map(normalizeCommandHook).filter((hook): hook is ClaudeCommandHook => hook !== null)
    : []

  if (hooks.length === 0) return null

  return {
    ...(typeof value.matcher === "string" ? { matcher: value.matcher } : {}),
    hooks,
  }
}

function mergeEventHooks(existing: unknown, required: ClaudeToolHook[]): ClaudeToolHook[] {
  const current = Array.isArray(existing)
    ? existing.map(normalizeToolHook).filter((entry): entry is ClaudeToolHook => entry !== null)
    : []

  const merged = current.map(cloneToolHook)

  for (const requiredEntry of required) {
    const matcher = requiredEntry.matcher ?? ""
    const target = merged.find(entry => (entry.matcher ?? "") === matcher)

    if (!target) {
      merged.push(cloneToolHook(requiredEntry))
      continue
    }

    for (const requiredHook of requiredEntry.hooks) {
      if (!target.hooks.some(entry =>
        entry.type === requiredHook.type && entry.command === requiredHook.command
      )) {
        target.hooks.push({ ...requiredHook })
      }
    }
  }

  return merged
}

export function buildClaudeSettings(): { hooks: ClaudeHookMap } {
  return {
    hooks: {
      PreToolUse: [
        {
          matcher: "Write|Edit",
          hooks: [
            {
              type: "command",
              command: "bun .harness/runtime/hooks/check-guardian.ts --claude pre-write",
            },
          ],
        },
        {
          matcher: "Bash",
          hooks: [
            {
              type: "command",
              command: "bun .harness/runtime/hooks/check-guardian.ts --claude pre-bash",
            },
          ],
        },
      ],
      PostToolUse: [
        {
          matcher: "Write|Edit",
          hooks: [
            {
              type: "command",
              command: "bun .harness/runtime/hooks/check-guardian.ts --claude post-write",
            },
          ],
        },
      ],
      Stop: [
        {
          hooks: [
            {
              type: "command",
              command: "bun .harness/runtime/hooks/check-guardian.ts --claude stop",
            },
          ],
        },
      ],
    },
  }
}

export function mergeClaudeSettingsDocument(existing: unknown): Record<string, unknown> {
  const defaults = buildClaudeSettings()
  const base = isRecord(existing) ? { ...existing } : {}
  const currentHooks = isRecord(base.hooks) ? base.hooks : {}
  const mergedHooks: Record<string, unknown> = { ...currentHooks }

  for (const [event, requiredEntries] of Object.entries(defaults.hooks) as Array<[ClaudeHookEvent, ClaudeToolHook[]]>) {
    mergedHooks[event] = mergeEventHooks(currentHooks[event], requiredEntries)
  }

  return {
    ...base,
    hooks: mergedHooks,
  }
}

export function stringifyClaudeSettings(document: unknown): string {
  return `${JSON.stringify(document, null, 2)}\n`
}
