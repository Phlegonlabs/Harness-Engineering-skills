import type { SpikeChecklist, TaskChecklist } from "../types"

export function createEmptyTaskChecklist(): TaskChecklist {
  return {
    prdDodMet: false,
    typecheckPassed: false,
    lintPassed: false,
    formatPassed: false,
    testsPassed: false,
    buildPassed: false,
    fileSizeOk: false,
    noForbiddenPatterns: false,
    atomicCommitDone: false,
    progressUpdated: false,
  }
}

export function createEmptySpikeChecklist(): SpikeChecklist {
  return {
    evaluationNoteWritten: false,
    adrGenerated: false,
  }
}

export function mergeTaskChecklist(
  current?: Partial<TaskChecklist> | null,
  updates?: Partial<TaskChecklist>,
): TaskChecklist {
  return {
    ...createEmptyTaskChecklist(),
    ...(current ?? {}),
    ...(updates ?? {}),
  }
}

export function mergeSpikeChecklist(
  current?: Partial<SpikeChecklist> | null,
  updates?: Partial<SpikeChecklist>,
): SpikeChecklist {
  return {
    ...createEmptySpikeChecklist(),
    ...(current ?? {}),
    ...(updates ?? {}),
  }
}
