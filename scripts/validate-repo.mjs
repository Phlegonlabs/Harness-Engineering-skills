import { execFileSync } from "child_process"
import path from "path"
import { fileURLToPath } from "url"

const scriptDir = path.dirname(fileURLToPath(import.meta.url))
const repoRoot = path.resolve(scriptDir, "..")

function runStep(label, file, args) {
  console.log(`\n==> ${label}`)
  execFileSync(file, args, {
    cwd: repoRoot,
    stdio: "inherit",
  })
}

runStep("Check whitespace and conflict markers", "git", ["diff", "--check"])

runStep("Run orchestrator tracked tests", process.execPath, ["harness-engineering-orchestrator/scripts/run-tracked-tests.mjs"])
runStep("Run orchestrator skill contract check", process.execPath, ["harness-engineering-orchestrator/scripts/check-skill-contract.mjs"])

runStep("Run structure tracked tests", process.execPath, ["harness-engineering-structure/scripts/run-tracked-tests.mjs"])
runStep("Run structure skill contract check", process.execPath, ["harness-engineering-structure/scripts/check-skill-contract.mjs"])
