/**
 * G8 enforcement: keep AGENTS.md and CLAUDE.md byte-identical.
 * Copies AGENTS.md -> CLAUDE.md when they differ.
 */

import { existsSync, readFileSync, writeFileSync } from "fs"
import { fileHash } from "../validation/helpers"

export function syncAgentFiles(): void {
  if (!existsSync("AGENTS.md")) return

  const agentsHash = fileHash("AGENTS.md")
  const claudeHash = fileHash("CLAUDE.md")

  if (agentsHash && agentsHash !== claudeHash) {
    const content = readFileSync("AGENTS.md", "utf-8")
    writeFileSync("CLAUDE.md", content)
    console.log("[harness-hooks] Synced AGENTS.md -> CLAUDE.md (G8)")
  }
}

// Direct invocation support
if (import.meta.main) {
  syncAgentFiles()
}
