/**
 * Central hook entry point for guardian enforcement.
 * This module is an enforcement surface, not a multi-agent orchestration surface.
 *
 * Three invocation modes:
 *   Git mode:   bun check-guardian.ts --hook <pre-commit|commit-msg|pre-push|post-commit> [args]
 *   Claude mode: bun check-guardian.ts --claude <pre-write|pre-bash|post-write|stop>
 *   Codex mode:  bun check-guardian.ts --codex
 *
 * Skip all checks: HARNESS_HOOKS_SKIP=1
 */

import { existsSync, readFileSync } from "fs"
import { basename, extname } from "path"
import type { ProjectState } from "../../types"
import {
  FORBIDDEN_PATTERN_RULES,
  buildForbiddenPatternRules,
  findFiles,
  resolveToolchainSourceExtensions,
  resolveToolchainSourceRoot,
  type CompiledForbiddenPatternRule,
} from "../validation/helpers"

// ---------------------------------------------------------------------------
// Skip mechanism
// ---------------------------------------------------------------------------

if (process.env.HARNESS_HOOKS_SKIP === "1") {
  process.exit(0)
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

const DEFAULT_SOURCE_EXTS = new Set(resolveToolchainSourceExtensions())

function getProjectState(): ProjectState | undefined {
  try {
    return JSON.parse(readFileSync(".harness/state.json", "utf-8")) as ProjectState
  } catch {
    return undefined
  }
}

function getSourceExtensions(state?: ProjectState): Set<string> {
  return new Set(resolveToolchainSourceExtensions(state?.toolchain))
}

function isSourceFile(filePath: string, sourceExts: Set<string> = DEFAULT_SOURCE_EXTS): boolean {
  return sourceExts.has(extname(filePath))
}

function spawnSync(cmd: string[]): { ok: boolean; stdout: string } {
  try {
    const proc = Bun.spawnSync(cmd, { stdout: "pipe", stderr: "pipe" })
    const stdout = new TextDecoder().decode(proc.stdout).trim()
    const stderr = new TextDecoder().decode(proc.stderr).trim()
    return {
      ok: proc.exitCode === 0,
      stdout: proc.exitCode === 0 ? stdout : stderr || stdout,
    }
  } catch {
    return {
      ok: false,
      stdout: "",
    }
  }
}

function currentBranch(): string {
  const result = spawnSync(["git", "rev-parse", "--abbrev-ref", "HEAD"])
  return result.ok ? result.stdout : ""
}

function isProtectedBranch(): boolean {
  const branch = currentBranch()
  return branch === "main" || branch === "master"
}

function scanContentForPatterns(
  content: string,
  filePath: string,
  rules: CompiledForbiddenPatternRule[] = FORBIDDEN_PATTERN_RULES,
): string[] {
  const errors: string[] = []
  for (const rule of rules) {
    if (!rule.blocking) continue
    if (rule.pattern.test(content)) {
      errors.push(`G4/G6: forbidden pattern "${rule.label}" found in ${filePath}`)
    }
    // Reset lastIndex for global regexes
    rule.pattern.lastIndex = 0
  }
  return errors
}

function readStdin(): string {
  try {
    // fd 0 works cross-platform (Windows + Unix) in Bun, unlike "/dev/stdin"
    return readFileSync(0, "utf-8")
  } catch {
    return ""
  }
}

type HarnessLevel = "lite" | "standard" | "full"

function getCurrentPhase(): string {
  return getProjectState()?.phase ?? ""
}

function getHarnessLevel(): HarnessLevel {
  const level = getProjectState()?.projectInfo?.harnessLevel?.level
  if (level === "lite" || level === "standard" || level === "full") return level
  return "standard"
}

function getCurrentTaskContext(): { id: string; prdRef: string } | null {
  const state = getProjectState()
  const currentTaskId = state?.execution?.currentTask
  if (!currentTaskId) return null

  for (const milestone of state?.execution?.milestones ?? []) {
    for (const task of milestone.tasks ?? []) {
      if (task.id === currentTaskId) {
        return { id: currentTaskId, prdRef: task.prdRef ?? "" }
      }
    }
  }

  return null
}

function listTrackedFiles(pathspec?: string): string[] {
  const args = ["git", "ls-files"]
  if (pathspec && pathspec !== ".") {
    args.push(pathspec)
  }

  const result = spawnSync(args)
  if (!result.ok || !result.stdout) {
    return []
  }

  return result.stdout
    .split(/\r?\n/)
    .filter(Boolean)
    .map(file => file.replace(/\\/g, "/"))
}

export function getCodexNotifySourceFiles(state?: ProjectState): string[] {
  const sourceRoot = resolveToolchainSourceRoot(state?.toolchain)
  const sourceExts = getSourceExtensions(state)
  const trackedFiles = listTrackedFiles(sourceRoot)

  if (trackedFiles.length > 0) {
    return trackedFiles.filter(file => isSourceFile(file, sourceExts))
  }

  return findFiles(sourceRoot, Array.from(sourceExts)).map(file => file.replace(/\\/g, "/"))
}

export function collectCodexNotifyWarnings(state = getProjectState()): string[] {
  const warnings: string[] = []
  const rules = buildForbiddenPatternRules(state?.toolchain)
  const sourceExts = getSourceExtensions(state)

  if (isProtectedBranch()) {
    warnings.push("G2: you are on main/master — create a feature branch before committing.")
  }

  for (const file of getCodexNotifySourceFiles(state)) {
    if (!isSourceFile(file, sourceExts)) continue

    try {
      const content = readFileSync(file, "utf-8")
      const lineCount = content.split(/\r?\n/).length
      if (lineCount > 400) {
        warnings.push(`G3: ${file} has ${lineCount} lines (max 400).`)
      }
      warnings.push(...scanContentForPatterns(content, file, rules))
    } catch {
      // File may not exist on disk.
    }
  }

  return warnings
}

// ---------------------------------------------------------------------------
// Git hook handlers
// ---------------------------------------------------------------------------

function isExecutingOrLater(): boolean {
  const phase = getCurrentPhase()
  return ["EXECUTING", "VALIDATING", "COMPLETE"].includes(phase)
}

function hookPreCommit(): void {
  const errors: string[] = []
  const warnings: string[] = []
  const level = getHarnessLevel()
  const state = getProjectState()
  const sourceExts = getSourceExtensions(state)
  const rules = buildForbiddenPatternRules(state?.toolchain)

  // G2: No commits on protected branches (only enforced from EXECUTING onward)
  // Relaxed at Lite: warn instead of block
  if (isExecutingOrLater() && isProtectedBranch()) {
    const msg = "G2: committing directly on main/master is forbidden. Create a feature branch first."
    if (level === "lite") {
      warnings.push(msg)
    } else {
      errors.push(msg)
    }
  }

  // Get staged files
  const staged = spawnSync(["git", "diff", "--cached", "--name-only"])
  if (!staged.ok) {
    process.exit(0)
  }
  const files = staged.stdout.split(/\r?\n/).filter(Boolean)

  for (const file of files) {
    // G4 (forbidden file): LEARNING.md must not enter the repo
    if (basename(file) === "LEARNING.md") {
      errors.push(`G4: LEARNING.md must not be committed. Move it to ~/.codex/LEARNING.md or ~/.claude/LEARNING.md`)
      continue
    }

    if (!isSourceFile(file, sourceExts)) continue

    // Read staged content
    const show = spawnSync(["git", "show", `:${file}`])
    if (!show.ok) continue
    const content = show.stdout

    // G3: File size limit
    const lineCount = content.split(/\r?\n/).length
    if (lineCount > 400) {
      errors.push(`G3: ${file} has ${lineCount} lines (max 400). Split the file before committing.`)
    }

    // G4 + G6: Forbidden patterns
    errors.push(...scanContentForPatterns(content, file, rules))
  }

  if (warnings.length > 0) {
    console.error("\n[harness-hooks] Pre-commit warnings (Lite — not blocking):\n")
    for (const w of warnings) console.error(`  ⚠️  ${w}`)
    console.error("")
  }

  if (errors.length > 0) {
    console.error("\n[harness-hooks] Pre-commit blocked:\n")
    for (const e of errors) console.error(`  - ${e}`)
    console.error("")
    process.exit(1)
  }
}

function hookCommitMsg(msgFile: string): void {
  // G10: Only enforce during EXECUTING phase
  // Relaxed at Lite: warn instead of block
  const phase = getCurrentPhase()
  if (phase !== "EXECUTING") return
  if (isProtectedBranch()) return

  if (!msgFile || !existsSync(msgFile)) return

  const msg = readFileSync(msgFile, "utf-8").trim()
  const currentTask = getCurrentTaskContext()
  const issues: string[] = []

  if (currentTask) {
    if (!msg.includes(currentTask.id)) {
      issues.push(`G10: commit message must include the current Task-ID (${currentTask.id})`)
    }
    if (currentTask.prdRef && !msg.includes(currentTask.prdRef)) {
      issues.push(`G10: commit message must include the current PRD mapping (${currentTask.prdRef})`)
    }
  } else if (!/T\d{3,}/.test(msg)) {
    issues.push("G10: commit message must include a Task-ID (e.g. T001, T002)")
  }

  if (issues.length > 0) {
    const level = getHarnessLevel()
    if (level === "lite") {
      console.error("\n[harness-hooks] Commit-msg warnings (Lite — not blocking):")
      for (const issue of issues) {
        console.error(`  ⚠️  ${issue}`)
      }
      console.error(`  Current message: "${msg.split(/\r?\n/)[0]}"`)
      console.error("")
    } else {
      console.error("\n[harness-hooks] Commit-msg blocked:")
      for (const issue of issues) {
        console.error(`  ${issue}`)
      }
      console.error(`  Current message: "${msg.split(/\r?\n/)[0]}"`)
      console.error("")
      process.exit(1)
    }
  }
}

function hookPrePush(): void {
  // G5: Dependency direction (only enforced from EXECUTING onward)
  // Inactive at Lite level
  if (!isExecutingOrLater()) return
  if (getHarnessLevel() === "lite") return

  const result = spawnSync(["bun", "run", "check:deps"])
  if (!result.ok) {
    console.error("\n[harness-hooks] Pre-push blocked:")
    console.error("  G5: dependency direction check failed")
    console.error(result.stdout)
    console.error("")
    process.exit(1)
  }
}

async function hookPostCommit(): Promise<void> {
  // G8: Auto-sync AGENTS.md <-> CLAUDE.md
  try {
    const { syncAgentFiles } = await import("./sync-agents")
    syncAgentFiles()
  } catch {
    // Non-blocking — sync is best-effort
  }
}

// ---------------------------------------------------------------------------
// Claude Code hook handlers
// ---------------------------------------------------------------------------

interface ClaudeToolInput {
  tool: string
  input: {
    file_path?: string
    content?: string
    new_string?: string
    old_string?: string
    command?: string
  }
}

function claudePreWrite(): void {
  const raw = readStdin()
  if (!raw) return

  let payload: ClaudeToolInput
  try {
    payload = JSON.parse(raw)
  } catch {
    return
  }

  const errors: string[] = []
  const filePath = payload.input.file_path ?? "unknown"
  const state = getProjectState()
  const sourceExts = getSourceExtensions(state)
  const rules = buildForbiddenPatternRules(state?.toolchain)

  // G3: Line count (Write only, not Edit)
  if (payload.tool === "Write" && payload.input.content) {
    const lineCount = payload.input.content.split(/\r?\n/).length
    if (isSourceFile(filePath, sourceExts) && lineCount > 400) {
      errors.push(`G3: file would have ${lineCount} lines (max 400). Split the file.`)
    }
  }

  // G4 + G6: Forbidden patterns (Write and Edit)
  const contentToScan = payload.input.content ?? payload.input.new_string ?? ""
  if (contentToScan && isSourceFile(filePath, sourceExts)) {
    errors.push(...scanContentForPatterns(contentToScan, filePath, rules))
  }

  if (errors.length > 0) {
    const result = {
      decision: "block",
      reason: errors.join("; "),
    }
    console.log(JSON.stringify(result))
  }
}

function claudePreBash(): void {
  const raw = readStdin()
  if (!raw) return

  let payload: ClaudeToolInput
  try {
    payload = JSON.parse(raw)
  } catch {
    return
  }

  const cmd = payload.input.command ?? ""
  const errors: string[] = []

  // G2: Block git commit on protected branch (only enforced from EXECUTING onward)
  // Relaxed at Lite: warn instead of block
  if (/\bgit\s+commit\b/.test(cmd) && isExecutingOrLater() && isProtectedBranch()) {
    if (getHarnessLevel() === "lite") {
      // Lite: allow but log warning (not blocking in Claude hook)
      console.error("[harness-hooks] ⚠️  G2: git commit on main/master — consider using a feature branch.")
    } else {
      errors.push("G2: git commit on main/master is forbidden. Create a feature branch first.")
    }
  }

  // Block dangerous staging commands
  if (/\bgit\s+add\s+(-A|\.)\s*/.test(cmd) || /\bgit\s+add\s+\.$/.test(cmd)) {
    errors.push("git add . / git add -A is forbidden. Stage specific files instead.")
  }

  // Block --no-verify
  if (/--no-verify/.test(cmd)) {
    errors.push("--no-verify is forbidden. Fix the hook issue instead of bypassing it.")
  }

  // G4 (forbidden file): Block staging LEARNING.md
  if (/\bgit\s+add\b.*LEARNING\.md/.test(cmd)) {
    errors.push("G4: LEARNING.md must not be staged. It belongs in ~/.codex/LEARNING.md or ~/.claude/LEARNING.md")
  }

  if (errors.length > 0) {
    const result = {
      decision: "block",
      reason: errors.join("; "),
    }
    console.log(JSON.stringify(result))
  }
}

async function claudePostWrite(): Promise<void> {
  const raw = readStdin()
  if (!raw) return

  let payload: ClaudeToolInput
  try {
    payload = JSON.parse(raw)
  } catch {
    return
  }

  const filePath = payload.input.file_path ?? ""
  const name = basename(filePath)

  // G8: Auto-sync if AGENTS.md or CLAUDE.md was written
  if (name === "AGENTS.md" || name === "CLAUDE.md") {
    try {
      const { syncAgentFiles } = await import("./sync-agents")
      syncAgentFiles()
    } catch {
      // Non-blocking
    }
  }
}

function claudeStop(): void {
  console.log("Reminder: run `bun harness:compact` to generate a context snapshot before ending.")
}

// ---------------------------------------------------------------------------
// Codex CLI notification handlers
// ---------------------------------------------------------------------------

interface CodexNotifyPayload {
  hook_event_name: string
  transcript_path?: string
  cwd?: string
  session_id?: string
}

async function codexNotify(): Promise<void> {
  const raw = readStdin()
  if (!raw) return

  let payload: CodexNotifyPayload
  try {
    payload = JSON.parse(raw)
  } catch {
    return
  }

  const event = payload.hook_event_name

  // TaskComplete / task_complete — run post-task checks
  if (event === "TaskComplete" || event === "task_complete") {
    const warnings = collectCodexNotifyWarnings()

    // G8: Auto-sync AGENTS.md -> CLAUDE.md after each task
    try {
      const { syncAgentFiles } = await import("./sync-agents")
      syncAgentFiles()
    } catch {
      // Non-blocking — sync is best-effort
    }

    if (warnings.length > 0) {
      console.error("\n[harness-hooks] FIX REQUIRED before commit:\n")
      for (const w of warnings) console.error(`  - ${w}`)
      console.error("\nThese violations will be BLOCKED by the git pre-commit hook.")
      console.error("Fix all issues, then run: bun harness:validate --task <current-task-id>\n")
    }
    return
  }

  // Terminal events — remind to compact
  if (event === "TurnAborted" || event === "turn_aborted" || event === "SessionEnd" || event === "session_end") {
    console.error("[harness-hooks] Reminder: run `bun harness:compact` to generate a context snapshot.")
    return
  }

  // Unknown events — silently ignore for forward compatibility
}

// ---------------------------------------------------------------------------
// Entry point
// ---------------------------------------------------------------------------

export async function main(): Promise<void> {
  const args = process.argv.slice(2)

  if (args[0] === "--hook") {
    const hookName = args[1]
    switch (hookName) {
      case "pre-commit":
        hookPreCommit()
        break
      case "commit-msg":
        hookCommitMsg(args[2])
        break
      case "pre-push":
        hookPrePush()
        break
      case "post-commit":
        await hookPostCommit()
        break
      default:
        console.error(`Unknown hook: ${hookName}`)
        process.exit(1)
    }
  } else if (args[0] === "--claude") {
    const event = args[1]
    switch (event) {
      case "pre-write":
        claudePreWrite()
        break
      case "pre-bash":
        claudePreBash()
        break
      case "post-write":
        await claudePostWrite()
        break
      case "stop":
        claudeStop()
        break
      default:
        console.error(`Unknown claude event: ${event}`)
        process.exit(1)
    }
  } else if (args[0] === "--codex") {
    await codexNotify()
  } else {
    console.error("Usage: check-guardian.ts --hook <name> [args] | --claude <event> | --codex")
    process.exit(1)
  }
}

if (import.meta.main) {
  await main()
}
