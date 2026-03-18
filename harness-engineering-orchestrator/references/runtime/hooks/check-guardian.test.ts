import { afterEach, beforeEach, expect, test } from "bun:test"
import { mkdtempSync, mkdirSync, rmSync, writeFileSync } from "fs"
import { tmpdir } from "os"
import { dirname, join } from "path"
import type { ProjectState } from "../../types"
import { initState } from "../state-core"
import { collectCodexNotifyWarnings, getCodexNotifySourceFiles } from "./check-guardian"

let originalCwd = ""
let workspaceDir = ""

function write(path: string, content: string): void {
  const fullPath = join(workspaceDir, path)
  mkdirSync(dirname(fullPath), { recursive: true })
  writeFileSync(fullPath, content)
}

function writeState(state: ProjectState): void {
  write(".harness/state.json", `${JSON.stringify(state, null, 2)}\n`)
}

beforeEach(() => {
  originalCwd = process.cwd()
  workspaceDir = mkdtempSync(join(tmpdir(), "harness-check-guardian-"))
  process.chdir(workspaceDir)
})

afterEach(() => {
  process.chdir(originalCwd)
  rmSync(workspaceDir, { recursive: true, force: true })
})

test("getCodexNotifySourceFiles respects monorepo source roots outside src/", () => {
  const state = initState({})
  state.toolchain.sourceRoot = "packages/api/src"
  state.toolchain.sourceExtensions = [".ts"]

  write("packages/api/src/index.ts", 'console.log("api")\n')
  write("src/index.ts", 'console.log("web")\n')

  const files = getCodexNotifySourceFiles(state)

  expect(files).toContain("packages/api/src/index.ts")
  expect(files).not.toContain("src/index.ts")
})

test("getCodexNotifySourceFiles scans from project root when sourceRoot is .", () => {
  const state = initState({})
  state.toolchain.sourceRoot = "."
  state.toolchain.sourceExtensions = [".ts"]

  write("packages/api/src/index.ts", 'console.log("api")\n')

  const files = getCodexNotifySourceFiles(state)

  expect(files).toContain("packages/api/src/index.ts")
})

test("collectCodexNotifyWarnings uses toolchain sourceRoot and sourceExtensions", () => {
  const state = initState({})
  state.phase = "EXECUTING"
  state.toolchain.sourceRoot = "src/main/java"
  state.toolchain.sourceExtensions = [".java"]

  writeState(state)
  write("src/main/java/App.java", 'class App { String endpoint = "http://example.com"; }\n')
  write("src/index.ts", 'const endpoint = "http://ignored.example.com";\n')

  const warnings = collectCodexNotifyWarnings(state)

  expect(warnings.some(warning => warning.includes("src/main/java/App.java"))).toBe(true)
  expect(warnings.some(warning => warning.includes("src/index.ts"))).toBe(false)
})
