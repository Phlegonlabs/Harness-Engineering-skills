import { afterEach, beforeEach, expect, test } from "bun:test"
import { existsSync, mkdtempSync, readFileSync, rmSync } from "fs"
import { tmpdir } from "os"
import { join } from "path"
import { initState } from "./state-core"
import { addSurfaceToState } from "./automation"

let originalCwd = ""
let workspaceDir = ""

beforeEach(() => {
  originalCwd = process.cwd()
  workspaceDir = mkdtempSync(join(tmpdir(), "harness-automation-"))
  process.chdir(workspaceDir)
})

afterEach(() => {
  process.chdir(originalCwd)
  rmSync(workspaceDir, { recursive: true, force: true })
})

test("addSurfaceToState creates workspace-first scaffold for new surfaces", () => {
  const state = initState({
    projectInfo: {
      name: "fixture",
      displayName: "Fixture",
      concept: "Fixture concept",
      problem: "Fixture problem",
      goal: "Fixture goal",
      types: ["monorepo", "web-app"],
      aiProvider: "none",
      teamSize: "solo",
      isGreenfield: true,
      harnessLevel: { level: "standard", autoDetected: true, detectedAt: new Date().toISOString() },
    },
    phase: "EXECUTING",
  })

  const result = addSurfaceToState(state, "cli")
  const workspacePackage = JSON.parse(readFileSync("apps/cli/package.json", "utf-8")) as {
    scripts?: Record<string, string>
  }

  expect(result.workspace).toBe("cli")
  expect(existsSync("apps/cli/src/app/index.ts")).toBeTrue()
  expect(existsSync("apps/cli/tests/unit/scaffold-smoke.test.ts")).toBeTrue()
  expect(workspacePackage.scripts?.lint).toBe("biome check src tests")
  expect(workspacePackage.scripts?.build).toBe("bun build ./src/app/index.ts --outdir ./dist")
  expect(state.execution.milestones.some(milestone => milestone.name.includes("CLI"))).toBeTrue()
})

test("addSurfaceToState creates agent shared workspace baseline when needed", () => {
  const state = initState({
    projectInfo: {
      name: "fixture",
      displayName: "Fixture",
      concept: "Fixture concept",
      problem: "Fixture problem",
      goal: "Fixture goal",
      types: ["monorepo"],
      aiProvider: "none",
      teamSize: "solo",
      isGreenfield: true,
      harnessLevel: { level: "standard", autoDetected: true, detectedAt: new Date().toISOString() },
    },
  })

  addSurfaceToState(state, "agent")

  expect(existsSync("apps/agent/src/app/index.ts")).toBeTrue()
  expect(existsSync("packages/shared/src/app/index.ts")).toBeTrue()
  expect(existsSync("packages/shared/api/README.md")).toBeTrue()
  expect(existsSync("skills/api-wrapper")).toBeTrue()
})

test("addSurfaceToState creates a design baseline for Android and other UI surfaces", () => {
  const state = initState({
    projectInfo: {
      name: "fixture",
      displayName: "Fixture",
      concept: "Fixture concept",
      problem: "Fixture problem",
      goal: "Fixture goal",
      types: ["monorepo", "api"],
      aiProvider: "none",
      teamSize: "solo",
      isGreenfield: true,
      harnessLevel: { level: "standard", autoDetected: true, detectedAt: new Date().toISOString() },
    },
  })

  addSurfaceToState(state, "android-app")

  expect(existsSync("apps/android/src/app/index.ts")).toBeTrue()
  expect(existsSync("docs/design/DESIGN_SYSTEM.md")).toBeTrue()
})
