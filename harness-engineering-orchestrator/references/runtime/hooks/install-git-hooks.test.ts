import { afterEach, beforeEach, expect, test } from "bun:test"
import { mkdtempSync, mkdirSync, readFileSync, rmSync, writeFileSync } from "fs"
import { tmpdir } from "os"
import { join } from "path"
import { mergeClaudeSettings, mergeCodexConfig } from "./install-git-hooks"

let originalCwd = ""
let workspaceDir = ""

beforeEach(() => {
  originalCwd = process.cwd()
  workspaceDir = mkdtempSync(join(tmpdir(), "harness-install-hooks-"))
  process.chdir(workspaceDir)
})

afterEach(() => {
  process.chdir(originalCwd)
  rmSync(workspaceDir, { recursive: true, force: true })
})

test("mergeClaudeSettings preserves structured hooks and adds missing harness commands", () => {
  mkdirSync(".claude", { recursive: true })
  writeFileSync(
    ".claude/settings.local.json",
    `${JSON.stringify(
      {
        theme: "keep-me",
        hooks: {
          PreToolUse: [
            {
              matcher: "Write|Edit",
              hooks: [{ type: "command", command: "echo custom-write" }],
            },
          ],
          Stop: [
            {
              hooks: [{ type: "command", command: "echo custom-stop" }],
            },
          ],
        },
      },
      null,
      2,
    )}\n`,
  )

  mergeClaudeSettings(".claude/settings.local.json")

  const parsed = JSON.parse(readFileSync(".claude/settings.local.json", "utf-8")) as {
    hooks: Record<string, Array<{ matcher?: string; hooks: Array<{ command: string }> }>>
    theme: string
  }

  expect(parsed.theme).toBe("keep-me")
  const writeEntry = parsed.hooks.PreToolUse.find(entry => entry.matcher === "Write|Edit")
  expect(writeEntry?.hooks.map(hook => hook.command)).toContain("echo custom-write")
  expect(writeEntry?.hooks.map(hook => hook.command)).toContain(
    "bun .harness/runtime/hooks/check-guardian.ts --claude pre-write",
  )
  const bashEntry = parsed.hooks.PreToolUse.find(entry => entry.matcher === "Bash")
  expect(bashEntry?.hooks.map(hook => hook.command)).toContain(
    "bun .harness/runtime/hooks/check-guardian.ts --claude pre-bash",
  )
  expect(parsed.hooks.PostToolUse[0]?.hooks.map(hook => hook.command)).toContain(
    "bun .harness/runtime/hooks/check-guardian.ts --claude post-write",
  )
  expect(parsed.hooks.Stop[0]?.hooks.map(hook => hook.command)).toContain("echo custom-stop")
  expect(parsed.hooks.Stop[0]?.hooks.map(hook => hook.command)).toContain(
    "bun .harness/runtime/hooks/check-guardian.ts --claude stop",
  )
})

test("mergeClaudeSettings repairs legacy string-array hook config", () => {
  mkdirSync(".claude", { recursive: true })
  writeFileSync(
    ".claude/settings.local.json",
    `${JSON.stringify(
      {
        hooks: {
          PreToolUse: ["bun .harness/runtime/hooks/check-guardian.ts --hook pre-write"],
          PostToolUse: ["bun .harness/runtime/hooks/check-guardian.ts --hook post-write"],
          Stop: ["bun .harness/runtime/hooks/check-guardian.ts --hook stop"],
        },
      },
      null,
      2,
    )}\n`,
  )

  mergeClaudeSettings(".claude/settings.local.json")

  const parsed = JSON.parse(readFileSync(".claude/settings.local.json", "utf-8")) as {
    hooks: Record<string, Array<{ matcher?: string; hooks: Array<{ command: string }> }>>
  }

  expect(parsed.hooks.PreToolUse.every(entry => typeof entry === "object" && !Array.isArray(entry))).toBe(true)
  const allCommands = Object.values(parsed.hooks)
    .flatMap(entries => entries)
    .flatMap(entry => entry.hooks)
    .map(hook => hook.command)
  expect(allCommands).toContain("bun .harness/runtime/hooks/check-guardian.ts --claude pre-write")
  expect(allCommands).toContain("bun .harness/runtime/hooks/check-guardian.ts --claude post-write")
  expect(allCommands).toContain("bun .harness/runtime/hooks/check-guardian.ts --claude stop")
  expect(allCommands.some(command => command.includes("--hook pre-write"))).toBe(false)
})

test("mergeCodexConfig appends every missing managed line only once", () => {
  mkdirSync(".codex", { recursive: true })
  writeFileSync(".codex/config.toml", '# existing\nnotify = ["keep-me"]\n')

  const required = [
    "# managed",
    'notify = ["keep-me"]',
    'exec = "one"',
    'mode = "two"',
    "",
  ].join("\n")

  mergeCodexConfig(".codex/config.toml", required)
  mergeCodexConfig(".codex/config.toml", required)

  const content = readFileSync(".codex/config.toml", "utf-8")
  expect(content).toContain('notify = ["keep-me"]')
  expect(content.match(/exec = "one"/g)?.length ?? 0).toBe(1)
  expect(content.match(/mode = "two"/g)?.length ?? 0).toBe(1)
})
