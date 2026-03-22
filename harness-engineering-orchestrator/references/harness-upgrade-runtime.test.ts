import { afterEach, beforeEach, expect, test } from "bun:test"
import { existsSync, mkdtempSync, mkdirSync, readFileSync, rmSync, writeFileSync } from "fs"
import { tmpdir } from "os"
import { dirname, join, resolve } from "path"
import { initState } from "./harness-init"
import { buildToolchainConfig } from "./runtime/toolchain-detect"
import { writeProjectStateToDisk } from "./runtime/state-io"

let originalCwd = ""
let workspaceDir = ""

function write(path: string, content: string): void {
  const fullPath = join(workspaceDir, path)
  mkdirSync(dirname(fullPath), { recursive: true })
  writeFileSync(fullPath, content)
}

beforeEach(() => {
  originalCwd = process.cwd()
  workspaceDir = mkdtempSync(join(tmpdir(), "harness-upgrade-runtime-"))
  process.chdir(workspaceDir)
})

afterEach(() => {
  process.chdir(originalCwd)
  rmSync(workspaceDir, { force: true, recursive: true })
})

test("upgrade-runtime pulls the latest harness runtime from the skill root and records it locally", () => {
  const skillRoot = resolve(join(import.meta.dir, ".."))
  const wrapperPath = join(skillRoot, "references", "harness-upgrade-runtime.ts")

  const state = initState({})
  state.projectInfo.name = "upgrade-fixture"
  state.projectInfo.displayName = "Upgrade Fixture"
  state.projectInfo.concept = "Exercise runtime upgrades."
  state.projectInfo.problem = "Existing projects need a formal upgrade path."
  state.projectInfo.goal = "Refresh harness runtime files from the current skill."
  state.projectInfo.types = ["web-app"]
  state.projectInfo.aiProvider = "none"
  state.projectInfo.teamSize = "solo"
  state.projectInfo.isGreenfield = true
  state.toolchain = buildToolchainConfig("bun", workspaceDir)
  state.toolchain.commands.test = { command: "bun run test" }
  state.toolchain.sourceRoot = "."

  write(".harness/orchestrate.ts", "// old runtime\n")
  write("AGENTS.md", "# old agents\n")
  write("CLAUDE.md", "# old agents\n")
  write("package.json", "{\n  \"name\": \"upgrade-fixture\",\n  \"private\": true,\n  \"scripts\": {}\n}\n")
  writeProjectStateToDisk(state, ".harness/state.json")

  const firstRun = Bun.spawnSync(["bun", wrapperPath, `--skill-root=${skillRoot}`], {
    cwd: workspaceDir,
    stdout: "pipe",
    stderr: "pipe",
  })

  expect(firstRun.exitCode).toBe(0)
  expect(readFileSync(join(workspaceDir, ".harness", "orchestrate.ts"), "utf-8")).toContain("--host-action-json")
  expect(existsSync(join(workspaceDir, ".harness", "upgrade-runtime.ts"))).toBe(true)
  expect(existsSync(join(workspaceDir, "turbo.json"))).toBe(true)
  expect(existsSync(join(workspaceDir, "apps", "web", "src", "app", "index.ts"))).toBe(true)
  expect(existsSync(join(workspaceDir, "packages", "shared", "src", "app", "index.ts"))).toBe(true)
  expect(readFileSync(join(workspaceDir, ".harness", "skill-source.json"), "utf-8")).toContain(skillRoot.replace(/\\/g, "\\\\"))

  const pkg = JSON.parse(readFileSync(join(workspaceDir, "package.json"), "utf-8")) as {
    scripts?: Record<string, string>
    workspaces?: string[]
  }
  expect(pkg.scripts?.["harness:upgrade-runtime"]).toBe("bun .harness/upgrade-runtime.ts")
  expect(pkg.scripts?.test).toBe("turbo run test")
  expect(pkg.workspaces).toContain("apps/*")
  expect(pkg.workspaces).toContain("packages/*")

  const secondRun = Bun.spawnSync(["bun", "harness:upgrade-runtime"], {
    cwd: workspaceDir,
    stdout: "pipe",
    stderr: "pipe",
  })

  expect(secondRun.exitCode).toBe(0)
})

test("upgrade-runtime backfills the node-npm workspace runner contract without restoring turbo", () => {
  const skillRoot = resolve(join(import.meta.dir, ".."))
  const wrapperPath = join(skillRoot, "references", "harness-upgrade-runtime.ts")

  const state = initState({})
  state.projectInfo.name = "upgrade-node-fixture"
  state.projectInfo.displayName = "Upgrade Node Fixture"
  state.projectInfo.concept = "Exercise node workspace upgrades."
  state.projectInfo.problem = "Node-managed projects need a formal workspace-runner upgrade path."
  state.projectInfo.goal = "Refresh node workspace scaffolding from the current skill."
  state.projectInfo.types = ["cli"]
  state.projectInfo.aiProvider = "none"
  state.projectInfo.teamSize = "solo"
  state.projectInfo.isGreenfield = true
  state.toolchain = buildToolchainConfig("node-npm", workspaceDir)
  state.toolchain.sourceRoot = "."

  write(".harness/orchestrate.ts", "// old runtime\n")
  write("AGENTS.md", "# old agents\n")
  write("CLAUDE.md", "# old agents\n")
  write("package.json", "{\n  \"name\": \"upgrade-node-fixture\",\n  \"private\": true,\n  \"scripts\": {\"test\": \"turbo run test\"},\n  \"devDependencies\": {\"turbo\": \"latest\", \"bun-types\": \"latest\"}\n}\n")
  writeProjectStateToDisk(state, ".harness/state.json")

  const result = Bun.spawnSync(["bun", wrapperPath, `--skill-root=${skillRoot}`], {
    cwd: workspaceDir,
    stdout: "pipe",
    stderr: "pipe",
  })

  expect(result.exitCode).toBe(0)
  expect(existsSync(join(workspaceDir, "scripts", "harness-local", "workspace-runner.mjs"))).toBe(true)
  expect(existsSync(join(workspaceDir, "turbo.json"))).toBe(false)

  const pkg = JSON.parse(readFileSync(join(workspaceDir, "package.json"), "utf-8")) as {
    devDependencies?: Record<string, string>
    packageManager?: string
    scripts?: Record<string, string>
  }

  expect(pkg.packageManager?.startsWith("npm@")).toBe(true)
  expect(pkg.scripts?.test).toBe("bun scripts/harness-local/workspace-runner.mjs test")
  expect(pkg.scripts?.build).toBe("bun scripts/harness-local/workspace-runner.mjs build")
  expect(pkg.devDependencies?.turbo).toBeUndefined()
  expect(pkg.devDependencies?.["bun-types"]).toBeUndefined()
})
