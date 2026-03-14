#!/usr/bin/env bun

import { getManagedDocSpecs, syncManagedFiles } from "./runtime/generated-files"
import { readState, writeState } from "./runtime/state-core"

const state = readState()
const results = syncManagedFiles(getManagedDocSpecs(state))
const updated = writeState(state)

const changed = results.filter(result => result.changed).length
console.log(`✅ sync-docs complete (${changed}/${results.length} file(s) changed)`)
console.log(`   Phase: ${updated.phase}`)
