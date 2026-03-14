import { existsSync } from "fs"
import type { ProjectState } from "../../types"
import { deriveStateFromFilesystem, STATE_PATH } from "../shared"
import { readProjectStateFromDisk, writeProjectStateToDisk } from "../state-io"

export function loadState(required = true): ProjectState | null {
  if (!existsSync(STATE_PATH)) {
    if (!required) return null
    console.error("❌ .harness/state.json not found. Run: bun .harness/init.ts")
    process.exit(1)
  }

  try {
    return readProjectStateFromDisk(STATE_PATH)
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error)
    console.error(`❌ ${message}`)
    console.error("   Repair or regenerate .harness/state.json before running validation again.")
    process.exit(1)
  }
}

export function saveState(state: ProjectState): void {
  writeProjectStateToDisk(state, STATE_PATH)
}

export function syncStateFromFilesystem(state: ProjectState): ProjectState {
  return deriveStateFromFilesystem(state, {
    updateProgressTimestamp: true,
    updateValidationTimestamp: true,
  })
}
