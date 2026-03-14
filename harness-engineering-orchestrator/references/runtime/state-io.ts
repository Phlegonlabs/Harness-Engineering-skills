import { existsSync, mkdirSync, readFileSync, renameSync, rmSync, writeFileSync } from "fs"
import { dirname } from "path"
import type { ProjectState } from "../types"
import { STATE_PATH } from "./shared"

const STATE_READ_RETRIES = 3

function ensureParentDir(filePath: string): void {
  const dir = dirname(filePath)
  if (dir && dir !== ".") mkdirSync(dir, { recursive: true })
}

function readStateText(filePath: string): string {
  let lastError: unknown

  for (let attempt = 0; attempt < STATE_READ_RETRIES; attempt++) {
    try {
      return readFileSync(filePath, "utf-8")
    } catch (error) {
      lastError = error
    }
  }

  throw lastError instanceof Error ? lastError : new Error(String(lastError))
}

function replaceFile(targetPath: string, content: string): void {
  ensureParentDir(targetPath)

  const tempPath = `${targetPath}.${process.pid}.${Date.now()}.tmp`
  const backupPath = `${targetPath}.${process.pid}.${Date.now()}.bak`
  writeFileSync(tempPath, content)

  let movedCurrentAside = false

  try {
    if (existsSync(targetPath)) {
      rmSync(backupPath, { force: true })
      renameSync(targetPath, backupPath)
      movedCurrentAside = true
    }

    renameSync(tempPath, targetPath)

    if (movedCurrentAside && existsSync(backupPath)) {
      rmSync(backupPath, { force: true })
    }
  } catch (error) {
    if (existsSync(tempPath)) {
      rmSync(tempPath, { force: true })
    }

    if (movedCurrentAside && !existsSync(targetPath) && existsSync(backupPath)) {
      renameSync(backupPath, targetPath)
    }

    throw error
  }
}

export function readProjectStateFromDisk(filePath = STATE_PATH): ProjectState {
  for (let attempt = 0; attempt < STATE_READ_RETRIES; attempt++) {
    try {
      return JSON.parse(readStateText(filePath)) as ProjectState
    } catch (error) {
      if (attempt === STATE_READ_RETRIES - 1) {
        const detail = error instanceof Error ? error.message : String(error)
        throw new Error(
          `State file is unreadable (${filePath}). The JSON is invalid or was interrupted during a previous write. ${detail}`,
        )
      }
    }
  }

  throw new Error(`State file is unreadable (${filePath}).`)
}

export function writeProjectStateToDisk(state: ProjectState, filePath = STATE_PATH): void {
  replaceFile(filePath, `${JSON.stringify(state, null, 2)}\n`)
}
