import { join } from "path"
import { existsSync, readFileSync, writeFileSync, chmodSync } from "fs"
import {
  applyReplacements,
  ensureDir,
  readTemplate,
  writeFileAlways,
  writeFileIfMissing,
  writeTemplateTree,
  type Context,
  type SetupLogger,
} from "./shared"

type SetupParams = {
  context: Context
  skillRoot: string
  logger: SetupLogger
}

export async function runSetup({ context, skillRoot, logger }: SetupParams): Promise<void> {
  const cwd = process.cwd()
  logger.info(`Setting up ${context.projectName} (${context.isGreenfield ? "greenfield" : "hydration"})`)

  if (context.isGreenfield) {
    await runGreenfield({ context, skillRoot, logger })
  } else {
    await runHydration({ context, skillRoot, logger })
  }

  logger.info("")
  logger.info("Setup complete. Next steps:")
  logger.info("  bun install")
  logger.info("  bun run harness:doctor")
  logger.info("  bun run harness:validate")
}

async function runGreenfield({ context, skillRoot, logger }: SetupParams): Promise<void> {
  const cwd = process.cwd()

  // Write all template files
  logger.info("Scaffolding project structure...")
  writeTemplateTree(skillRoot, context, ".", cwd, logger, true)

  // Copy harness runtime files
  logger.info("Copying harness runtime...")
  copyHarnessRuntime(skillRoot, cwd, logger)

  // Copy harness rules
  logger.info("Copying validation rules...")
  copyHarnessRules(skillRoot, cwd, logger)

  // Install git hooks
  installGitHooks(cwd, logger)
}

async function runHydration({ context, skillRoot, logger }: SetupParams): Promise<void> {
  const cwd = process.cwd()

  // Harness directory (always overwrite — these are the skill's runtime)
  logger.info("Adding harness infrastructure...")

  // Copy runtime files
  copyHarnessRuntime(skillRoot, cwd, logger)
  copyHarnessRules(skillRoot, cwd, logger)

  // Harness config
  const configContent = applyReplacements(
    readTemplate(skillRoot, "harness/config.json.template"),
    context,
  )
  writeFileAlways(join(cwd, "harness/config.json"), configContent, logger)

  // Documentation (don't overwrite existing)
  logger.info("Adding documentation templates...")
  writeTemplateTree(skillRoot, context, "docs", join(cwd, "docs"), logger, false)

  // Agent entry points (don't overwrite)
  for (const file of ["AGENTS.md", "CLAUDE.md"]) {
    const content = applyReplacements(
      readTemplate(skillRoot, `${file}.template`),
      context,
    )
    writeFileIfMissing(join(cwd, file), content, logger)
  }

  // State file (don't overwrite)
  const stateContent = applyReplacements(
    readTemplate(skillRoot, ".harness/state.json.template"),
    context,
  )
  writeFileIfMissing(join(cwd, ".harness/state.json"), stateContent, logger)

  // CI workflows (don't overwrite)
  writeTemplateTree(skillRoot, context, ".github", join(cwd, ".github"), logger, false)

  // Claude config (don't overwrite)
  writeTemplateTree(skillRoot, context, ".claude", join(cwd, ".claude"), logger, false)

  // Git hooks
  logger.info("Adding git hooks...")
  writeTemplateTree(skillRoot, context, "harness/hooks", join(cwd, "harness/hooks"), logger, true)
  writeTemplateTree(skillRoot, context, "hooks", join(cwd, "hooks"), logger, false)
  installGitHooks(cwd, logger)

  // Skills (in-project phase skills, don't overwrite)
  writeTemplateTree(skillRoot, context, "skills", join(cwd, "skills"), logger, false)

  logger.info("Hydration complete. Run harness:doctor to check health.")
}

function copyHarnessRuntime(skillRoot: string, targetRoot: string, logger: SetupLogger): void {
  const runtimeEntries = [
    "shared.ts",
    "doctor.ts",
    "validate.ts",
    "init.ts",
    "discover.ts",
    "discovery.ts",
    "discovery-questions.ts",
    "discovery-renderers.ts",
    "plan.ts",
    "planning.ts",
    "planning-state.ts",
    "orchestrate.ts",
    "orchestration.ts",
    "orchestration-artifacts.ts",
    "evaluate.ts",
    "parallel-dispatch.ts",
    "merge-milestone.ts",
    "install-hooks.ts",
    "template-baseline.ts",
    "lint-all.ts",
    "lint-layers.ts",
    "lint-file-size.ts",
    "lint-forbidden.ts",
    "lint-naming.ts",
    "lint-docs-freshness.ts",
    "test-all.ts",
    "test-architecture.ts",
    "test-doc-links.ts",
    "test-required-files.ts",
    "test-runtime.ts",
    "entropy-all.ts",
    "scan-drift.ts",
    "scan-orphans.ts",
    "scan-consistency.ts",
    "validation.ts",
    "validation-layering.ts",
    "validation-entropy.ts",
    "types.ts",
  ]

  const sourceDir = join(skillRoot, "references", "runtime")
  const targetDir = join(targetRoot, "harness", "runtime")
  ensureDir(targetDir)

  for (const entry of runtimeEntries) {
    const sourcePath = join(sourceDir, entry)
    if (existsSync(sourcePath)) {
      const content = readFileSync(sourcePath, "utf-8")
      writeFileAlways(join(targetDir, entry), content, logger)
    }
  }

  // Also copy types.ts to the root references level
  const typesSource = join(skillRoot, "references", "types.ts")
  if (existsSync(typesSource)) {
    const content = readFileSync(typesSource, "utf-8")
    writeFileAlways(join(targetDir, "types.ts"), content, logger)
  }
}

function copyHarnessRules(skillRoot: string, targetRoot: string, logger: SetupLogger): void {
  const rules = [
    "dependency-layers.json",
    "file-size-limits.json",
    "forbidden-patterns.json",
    "naming-conventions.json",
  ]

  const sourceDir = join(skillRoot, "references", "rules")
  const targetDir = join(targetRoot, "harness", "rules")
  ensureDir(targetDir)

  for (const rule of rules) {
    const sourcePath = join(sourceDir, rule)
    if (existsSync(sourcePath)) {
      const content = readFileSync(sourcePath, "utf-8")
      writeFileAlways(join(targetDir, rule), content, logger)
    }
  }
}

function installGitHooks(targetRoot: string, logger: SetupLogger): void {
  const hooksDir = join(targetRoot, ".git", "hooks")
  if (!existsSync(join(targetRoot, ".git"))) {
    logger.warn("No .git directory found — skipping hook installation")
    return
  }

  ensureDir(hooksDir)
  const hookSources = join(targetRoot, "harness", "hooks")

  for (const hookName of ["pre-commit", "commit-msg", "pre-push"]) {
    const sourcePath = join(hookSources, hookName)
    if (existsSync(sourcePath)) {
      const targetPath = join(hooksDir, hookName)
      const content = readFileSync(sourcePath, "utf-8")
      writeFileAlways(targetPath, content, logger)
      try {
        chmodSync(targetPath, 0o755)
      } catch {
        // chmod may not work on Windows
      }
    }
  }
}
