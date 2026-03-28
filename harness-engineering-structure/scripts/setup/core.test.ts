import { describe, expect, test } from "bun:test"
import { parseArgs, createContext, applyReplacements } from "./shared"

describe("parseArgs", () => {
  test("parses --key=value pairs", () => {
    const args = parseArgs(["--projectName=my-app", "--isGreenfield=false"])
    expect(args.projectName).toBe("my-app")
    expect(args.isGreenfield).toBe("false")
  })

  test("parses boolean flags", () => {
    const args = parseArgs(["--skipGithub"])
    expect(args.skipGithub).toBe("true")
  })

  test("returns empty object for no args", () => {
    const args = parseArgs([])
    expect(Object.keys(args).length).toBe(0)
  })
})

describe("createContext", () => {
  test("uses provided projectName", () => {
    const ctx = createContext({ projectName: "test-project" }, "/fake/skill/root")
    expect(ctx.projectName).toBe("test-project")
  })

  test("defaults isGreenfield to true", () => {
    const ctx = createContext({}, "/fake/skill/root")
    expect(ctx.isGreenfield).toBe(true)
  })

  test("sets isGreenfield to false when specified", () => {
    const ctx = createContext({ isGreenfield: "false" }, "/fake/skill/root")
    expect(ctx.isGreenfield).toBe(false)
  })

  test("populates year and today", () => {
    const ctx = createContext({}, "/fake/skill/root")
    expect(ctx.year).toMatch(/^\d{4}$/)
    expect(ctx.today).toMatch(/^\d{4}-\d{2}-\d{2}$/)
  })
})

describe("applyReplacements", () => {
  test("replaces {{projectName}}", () => {
    const ctx = createContext({ projectName: "my-app" }, "/fake")
    const result = applyReplacements("name: {{projectName}}", ctx)
    expect(result).toBe("name: my-app")
  })

  test("replaces {{year}}", () => {
    const ctx = createContext({}, "/fake")
    const result = applyReplacements("Copyright {{year}}", ctx)
    expect(result).toMatch(/Copyright \d{4}/)
  })

  test("replaces multiple occurrences", () => {
    const ctx = createContext({ projectName: "test" }, "/fake")
    const result = applyReplacements("{{projectName}} and {{projectName}}", ctx)
    expect(result).toBe("test and test")
  })
})
