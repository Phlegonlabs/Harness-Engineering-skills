import { existsSync, mkdirSync, readFileSync, writeFileSync } from "fs"
import { dirname, resolve } from "path"

export const HARNESS_SKILL_SOURCE_PATH = ".harness/skill-source.json"

type HarnessSkillSourceRecord = {
  recordedAt: string
  skillRoot: string
}

function ensureParentDir(filePath: string): void {
  const parent = dirname(filePath)
  if (parent && parent !== ".") mkdirSync(parent, { recursive: true })
}

export function readHarnessSkillRoot(): string | undefined {
  if (!existsSync(HARNESS_SKILL_SOURCE_PATH)) return undefined

  try {
    const parsed = JSON.parse(readFileSync(HARNESS_SKILL_SOURCE_PATH, "utf-8")) as Partial<HarnessSkillSourceRecord>
    if (typeof parsed.skillRoot !== "string" || parsed.skillRoot.trim().length === 0) {
      return undefined
    }
    return resolve(parsed.skillRoot)
  } catch {
    return undefined
  }
}

export function writeHarnessSkillRoot(skillRoot: string): void {
  ensureParentDir(HARNESS_SKILL_SOURCE_PATH)
  const payload: HarnessSkillSourceRecord = {
    recordedAt: new Date().toISOString(),
    skillRoot: resolve(skillRoot),
  }
  writeFileSync(HARNESS_SKILL_SOURCE_PATH, `${JSON.stringify(payload, null, 2)}\n`)
}
