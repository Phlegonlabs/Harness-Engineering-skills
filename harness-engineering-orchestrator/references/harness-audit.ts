#!/usr/bin/env bun

import { existsSync, mkdirSync, readFileSync, writeFileSync } from "fs"
import { dirname } from "path"
import type { ValidationReporter } from "./runtime/validation/reporter"
import { validateEnv, validateGuardians } from "./runtime/validation/env-and-guardians"
import { validatePhaseGate } from "./runtime/validation/phase"
import { getManagedDocSpecs, getManagedSkillSpecs, hasManagedDrift } from "./runtime/generated-files"
import { runBun } from "./runtime/validation/helpers"
import { loadState, saveState, syncStateFromFilesystem } from "./runtime/validation/state"
import { hasAgentSurface, surfaceWorkspaceList } from "./runtime/surfaces"

type AuditEntry = {
  hint?: string
  message: string
  status: "pass" | "warn" | "fail" | "section"
}

function createAuditReporter(entries: AuditEntry[]): ValidationReporter {
  return {
    pass(message: string) {
      console.log(`  ✅ ${message}`)
      entries.push({ status: "pass", message })
    },
    warn(message: string) {
      console.log(`  ⚠️  ${message}`)
      entries.push({ status: "warn", message })
    },
    failSoft(message: string, hint?: string) {
      console.log(`  ❌ ${message}`)
      if (hint) console.log(`     → ${hint}`)
      entries.push({ status: "fail", message, hint })
    },
    section(title: string) {
      console.log(`\n── ${title} ${"─".repeat(Math.max(0, 50 - title.length))}`)
      entries.push({ status: "section", message: title })
    },
    finish(): never {
      throw new Error("finish() is not used in harness-audit.ts")
    },
  }
}

function auditWorkspaceContract(entries: AuditEntry[], state: ReturnType<typeof syncStateFromFilesystem>): void {
  const reporter = createAuditReporter(entries)
  reporter.section("Workspace Contract")

  const pkg = existsSync("package.json")
    ? (JSON.parse(readFileSync("package.json", "utf-8")) as { workspaces?: string[] })
    : { workspaces: [] }
  const workspaces = pkg.workspaces ?? []

  if (workspaces.includes("apps/*")) reporter.pass("package.json includes apps/* workspace")
  else reporter.failSoft("package.json is missing apps/* workspace")

  if (workspaces.includes("packages/*")) reporter.pass("package.json includes packages/* workspace")
  else reporter.failSoft("package.json is missing packages/* workspace")

  for (const workspace of surfaceWorkspaceList(state.projectInfo.types)) {
    if (existsSync(`apps/${workspace}/package.json`)) {
      reporter.pass(`apps/${workspace}/package.json is present`)
    } else {
      reporter.failSoft(`apps/${workspace}/package.json is present`)
    }
  }

  if (existsSync("packages/shared/package.json")) {
    reporter.pass("packages/shared/package.json is present")
  } else {
    reporter.failSoft("packages/shared/package.json is present")
  }
}

function auditManagedDrift(entries: AuditEntry[], state: ReturnType<typeof syncStateFromFilesystem>): void {
  const reporter = createAuditReporter(entries)

  reporter.section("Docs Drift")
  for (const spec of getManagedDocSpecs(state)) {
    if (hasManagedDrift(spec)) {
      reporter.failSoft(`${spec.path} is out of sync`, "Run bun harness:sync-docs")
    } else {
      reporter.pass(`${spec.path} is synchronized`)
    }
  }

  reporter.section("Skills Drift")
  const skillSpecs = getManagedSkillSpecs(state)
  if (skillSpecs.length === 0) {
    reporter.warn("No agent skill catalog is required for the current project types")
    return
  }

  for (const spec of skillSpecs) {
    if (hasManagedDrift(spec)) {
      reporter.failSoft(`${spec.path} is out of sync`, "Run bun harness:sync-skills")
    } else {
      reporter.pass(`${spec.path} is synchronized`)
    }
  }
}

async function auditCompact(entries: AuditEntry[]): Promise<void> {
  const reporter = createAuditReporter(entries)
  reporter.section("Compact Status")
  const result = await runBun(["run", "harness:compact:status"])
  if (result.ok) reporter.pass("harness:compact:status runs successfully")
  else reporter.failSoft("harness:compact:status failed", result.output)
}

function auditAgentBaseline(entries: AuditEntry[], state: ReturnType<typeof syncStateFromFilesystem>): void {
  if (!hasAgentSurface(state.projectInfo.types)) return

  const reporter = createAuditReporter(entries)
  reporter.section("Agent Skill Baseline")

  if (existsSync("SKILLS.md")) reporter.pass("SKILLS.md is present")
  else reporter.failSoft("SKILLS.md is present")

  if (existsSync("skills/api-wrapper/SKILL.md")) reporter.pass("skills/api-wrapper/SKILL.md is present")
  else reporter.failSoft("skills/api-wrapper/SKILL.md is present")

  if (existsSync("packages/shared/api/README.md")) reporter.pass("packages/shared/api/README.md is present")
  else reporter.failSoft("packages/shared/api/README.md is present")
}

function writeAuditReport(entries: AuditEntry[]): string {
  const reportPath = ".harness/reports/audit-latest.md"
  mkdirSync(dirname(reportPath), { recursive: true })

  const lines: string[] = ["# Harness Audit", ""]
  for (const entry of entries) {
    if (entry.status === "section") {
      lines.push(`## ${entry.message}`)
      lines.push("")
      continue
    }

    const icon =
      entry.status === "pass" ? "✅" : entry.status === "warn" ? "⚠️" : "❌"
    lines.push(`- ${icon} ${entry.message}`)
    if (entry.hint) lines.push(`  - Hint: ${entry.hint}`)
  }

  writeFileSync(reportPath, `${lines.join("\n")}\n`)
  return reportPath
}

const entries: AuditEntry[] = []
const reporter = createAuditReporter(entries)
const loaded = loadState(true)
const state = syncStateFromFilesystem(loaded!)
saveState(state)

await validateEnv(reporter)
await validateGuardians(reporter)
await validatePhaseGate(state.phase, state, reporter)
auditWorkspaceContract(entries, state)
auditManagedDrift(entries, state)
auditAgentBaseline(entries, state)
await auditCompact(entries)

const reportPath = writeAuditReport(entries)
const failCount = entries.filter(entry => entry.status === "fail").length
const warnCount = entries.filter(entry => entry.status === "warn").length

console.log(`\nAudit report written to ${reportPath}`)
if (failCount > 0) {
  console.error(`Audit failed with ${failCount} issue(s) and ${warnCount} warning(s).`)
  process.exit(1)
}

console.log(`✅ Audit passed (${warnCount} warning(s))`)
