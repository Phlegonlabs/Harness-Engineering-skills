import { execFileSync } from "child_process"
import path from "path"
import { fileURLToPath } from "url"

const scriptDir = path.dirname(fileURLToPath(import.meta.url))
const repoRoot = path.resolve(scriptDir, "..", "..")

const trackedFiles = execFileSync("git", ["ls-files", "harness-engineering-structure"], {
  cwd: repoRoot,
  encoding: "utf8",
})
  .split(/\r?\n/)
  .filter(Boolean)
  .filter(file => file.endsWith(".test.ts"))

if (trackedFiles.length === 0) {
  console.log("No tracked test files found under harness-engineering-structure. Skipping.")
  process.exit(0)
}

execFileSync("bun", ["test", ...trackedFiles], {
  cwd: repoRoot,
  stdio: "inherit",
})
