#!/usr/bin/env bun
/**
 * .harness/state.ts
 *
 * Controlled state mutation entrypoint for interactive phases, hand-offs, and tests.
 * Supports:
 * - viewing the current state
 * - updating phase
 * - deep-merging a JSON patch into .harness/state.json
 */

import { existsSync, readFileSync } from "fs"
import type { Phase, ProjectState } from "./types"
import { readState, updateState } from "./runtime/state-core"

type CliArgs = {
  patch?: string
  patchFile?: string
  phase?: Phase
  show: boolean
}

function parseArgs(argv: string[]): CliArgs {
  const args: CliArgs = { show: false }

  for (let index = 0; index < argv.length; index++) {
    const current = argv[index]
    if (!current?.startsWith("--")) continue

    const [rawKey, inlineValue] = current.slice(2).split("=", 2)
    const nextValue = inlineValue ?? argv[index + 1]
    const consumesNext = inlineValue === undefined && nextValue && !nextValue.startsWith("--")

    switch (rawKey) {
      case "patch":
        args.patch = inlineValue ?? (consumesNext ? nextValue : undefined)
        break
      case "patchFile":
        args.patchFile = inlineValue ?? (consumesNext ? nextValue : undefined)
        break
      case "phase":
        args.phase = (inlineValue ?? (consumesNext ? nextValue : undefined)) as Phase | undefined
        break
      case "show":
        args.show = true
        break
      default:
        throw new Error(`Unknown flag --${rawKey}`)
    }

    if (consumesNext) index++
  }

  return args
}

function readPatch(args: CliArgs): Partial<ProjectState> {
  if (args.patch && args.patchFile) {
    throw new Error("Use either --patch or --patchFile, not both.")
  }

  if (args.patchFile) {
    if (!existsSync(args.patchFile)) {
      throw new Error(`Patch file not found: ${args.patchFile}`)
    }
    return JSON.parse(readFileSync(args.patchFile, "utf-8")) as Partial<ProjectState>
  }

  if (args.patch) {
    return JSON.parse(args.patch) as Partial<ProjectState>
  }

  return {}
}

function mergePhase(
  patch: Partial<ProjectState>,
  phase: Phase | undefined,
): Partial<ProjectState> {
  if (!phase) return patch
  return { ...patch, phase }
}

const args = parseArgs(process.argv.slice(2))

if (args.show) {
  console.log(JSON.stringify(readState(), null, 2))
  process.exit(0)
}

const patch = mergePhase(readPatch(args), args.phase)
if (Object.keys(patch).length === 0) {
  console.error("Usage: bun .harness/state.ts --show | --phase=EXECUTING | --patch='{\"phase\":\"TECH_STACK\"}'")
  process.exit(1)
}

const next = updateState(patch)
console.log(`✅ state updated (${next.phase})`)
