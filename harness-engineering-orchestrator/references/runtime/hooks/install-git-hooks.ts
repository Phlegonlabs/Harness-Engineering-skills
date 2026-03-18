/**
 * Install git hook shims and Codex guardrail config when .harness/ already exists.
 * For full clone recovery, prefer: bun harness:hooks:install
 *
 * Scope note:
 * - This installer configures enforcement surfaces only.
 * - Multi-agent orchestration remains in orchestrator runtime modules.
 */

import { existsSync, mkdirSync, writeFileSync, chmodSync, readFileSync, statSync } from "fs"
import { join } from "path"
import { buildClaudeSettings, mergeClaudeSettingsDocument, stringifyClaudeSettings } from "./claude-config"
import { CODEX_CONFIG_TOML, CODEX_GUARDIAN_RULES, mergeManagedConfigText } from "./codex-config"

const SHIMS: Record<string, string> = {
  "pre-commit": [
    "#!/bin/sh",
    'bun .harness/runtime/hooks/check-guardian.ts --hook pre-commit',
    "",
  ].join("\n"),
  "commit-msg": [
    "#!/bin/sh",
    'bun .harness/runtime/hooks/check-guardian.ts --hook commit-msg "$1"',
    "",
  ].join("\n"),
  "pre-push": [
    "#!/bin/sh",
    'bun .harness/runtime/hooks/check-guardian.ts --hook pre-push',
    "",
  ].join("\n"),
  "post-commit": [
    "#!/bin/sh",
    'bun .harness/runtime/hooks/check-guardian.ts --hook post-commit',
    "",
  ].join("\n"),
}

export function mergeCodexConfig(filePath: string, defaultContent: string): void {
  if (!existsSync(filePath)) {
    writeFileSync(filePath, defaultContent)
    console.log(`[harness-hooks] Created ${filePath}`)
    return
  }

  const existing = readFileSync(filePath, "utf-8")
  const { appendedLines, text } = mergeManagedConfigText(existing, defaultContent)

  if (appendedLines.length === 0) {
    console.log(`[harness-hooks] ${filePath} already contains required config`)
    return
  }

  writeFileSync(filePath, text)
  for (const line of appendedLines) {
    console.log(`[harness-hooks] Appended missing config to ${filePath}: ${line}`)
  }
}

export function mergeClaudeSettings(filePath: string): void {
  mkdirSync(".claude", { recursive: true })

  if (!existsSync(filePath)) {
    writeFileSync(filePath, stringifyClaudeSettings(buildClaudeSettings()))
    console.log(`[harness-hooks] Created ${filePath}`)
    return
  }

  try {
    const existing = JSON.parse(readFileSync(filePath, "utf-8")) as Record<string, unknown>
    const merged = mergeClaudeSettingsDocument(existing)
    writeFileSync(filePath, stringifyClaudeSettings(merged))
    console.log(`[harness-hooks] Merged hooks into ${filePath}`)
  } catch {
    console.warn(`[harness-hooks] Could not parse ${filePath} — skipping merge`)
  }
}

function ensureExecutable(hookPath: string): void {
  if (process.platform === "win32") {
    // Windows: verify shebang line exists (git for Windows handles executability)
    try {
      const content = readFileSync(hookPath, "utf-8")
      if (!content.startsWith("#!/")) {
        console.warn(`[harness-hooks] ⚠️  ${hookPath} is missing shebang line`)
      }
    } catch {
      // File just written — should be readable
    }
    return
  }

  // Unix: verify executable bit
  try {
    const stats = statSync(hookPath)
    const isExecutable = (stats.mode & 0o111) !== 0
    if (!isExecutable) {
      chmodSync(hookPath, 0o755)
      console.log(`[harness-hooks] Set executable permission on ${hookPath}`)
    }
  } catch {
    console.warn(`[harness-hooks] ⚠️  Could not verify permissions on ${hookPath}`)
  }
}

export function main(): void {
  // Git hooks — only if .git exists
  if (existsSync(".git")) {
    const hooksDir = join(".git", "hooks")
    mkdirSync(hooksDir, { recursive: true })

    for (const [name, content] of Object.entries(SHIMS)) {
      const hookPath = join(hooksDir, name)
      writeFileSync(hookPath, content)
      ensureExecutable(hookPath)
      console.log(`[harness-hooks] Installed ${name}`)
    }
  } else {
    console.warn("[harness-hooks] No .git directory — skipping git hooks (run git init first)")
  }

  // Claude Code settings — merge, don't overwrite
  mergeClaudeSettings(join(".claude", "settings.local.json"))

  // Codex guardrail config — merge to preserve user customizations
  mkdirSync(".codex", { recursive: true })
  mergeCodexConfig(join(".codex", "config.toml"), CODEX_CONFIG_TOML)

  // Codex execpolicy rules — always overwrite (Harness-managed guardrail file)
  mkdirSync(join(".codex", "rules"), { recursive: true })
  const rulesPath = join(".codex", "rules", "guardian.rules")
  writeFileSync(rulesPath, CODEX_GUARDIAN_RULES)
  console.log(`[harness-hooks] Updated ${rulesPath}`)

  console.log("[harness-hooks] Hook installation complete.")
}

if (import.meta.main) {
  main()
}
