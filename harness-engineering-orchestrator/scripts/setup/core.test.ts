import { expect, test } from "bun:test"
import { inspectCommandVersion } from "./core"

test("inspectCommandVersion returns a clean failure result for missing executables", () => {
  const result = inspectCommandVersion("definitely-not-a-real-command-xyz")

  expect(result.ok).toBe(false)
  expect(result.version).toBe("")
})
