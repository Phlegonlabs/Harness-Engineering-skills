#!/usr/bin/env bun

import { existsSync } from "fs"
import { join, resolve } from "path"
import { readHarnessSkillRoot, writeHarnessSkillRoot } from "./runtime/skill-source"

function getArgValue(flag: string): string | undefined {
  const args = process.argv.slice(2)
  const inline = args.find(arg => arg.startsWith(`${flag}=`))
  if (inline) return inline.slice(flag.length + 1)

  const index = args.indexOf(flag)
  if (index === -1) return undefined
  const next = args[index + 1]
  return next && !next.startsWith("--") ? next : undefined
}

function resolveSkillRoot(): string {
  const cli = getArgValue("--skill-root")
  const env = process.env.HARNESS_SKILL_ROOT
  const recorded = readHarnessSkillRoot()
  const raw = cli ?? env ?? recorded

  if (!raw) {
    throw new Error(
      "Usage: bun .harness/upgrade-runtime.ts --skill-root <path-to-installed-harness-engineering-orchestrator>",
    )
  }

  return resolve(raw)
}

const skillRoot = resolveSkillRoot()
const upgradeScriptPath = join(skillRoot, "scripts", "harness-upgrade-runtime.ts")

if (!existsSync(upgradeScriptPath)) {
  console.error(`Harness upgrade script was not found at: ${upgradeScriptPath}`)
  process.exit(1)
}

const result = Bun.spawnSync(["bun", upgradeScriptPath], {
  cwd: process.cwd(),
  stdin: "inherit",
  stdout: "inherit",
  stderr: "inherit",
})

if (result.exitCode !== 0) {
  process.exit(result.exitCode ?? 1)
}

writeHarnessSkillRoot(skillRoot)
