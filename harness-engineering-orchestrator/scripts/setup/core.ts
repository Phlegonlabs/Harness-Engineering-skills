import { join } from "path"
import { existsSync, mkdirSync, readdirSync, readFileSync, writeFileSync, chmodSync } from "fs"
import { initState } from "../../references/harness-init"
import { ensureEnvLocalSkeleton } from "../../references/runtime/env-local"
import { getManagedDocSpecs, getManagedSkillSpecs, syncManagedFiles } from "../../references/runtime/generated-files"
import { syncLocalBootstrapManifest } from "../../references/runtime/local-bootstrap"
import { writeHarnessSkillRoot } from "../../references/runtime/skill-source"
import { deriveStateFromFilesystem, getHarnessCriticalTotal, STATE_PATH } from "../../references/runtime/shared"
import { readProjectStateFromDisk } from "../../references/runtime/state-io"
import {
  buildToolchainConfig,
  detectEcosystem,
  isConfiguredToolchainCommand,
} from "../../references/runtime/toolchain-detect"
import {
  isTurboWorkspaceEcosystem,
  isWorkspaceFirstEcosystem,
  usesHarnessWorkspaceRunner,
} from "../../references/runtime/toolchain-registry"
import { buildClaudeSettings, stringifyClaudeSettings } from "../../references/runtime/hooks/claude-config"
import { CODEX_CONFIG_TOML, CODEX_GUARDIAN_RULES } from "../../references/runtime/hooks/codex-config"
import type { GitHubState, ProjectState, SupportedEcosystem, ToolchainConfig } from "../../references/harness-types"
import {
  countPrdMilestones,
  createContext,
  existingState,
  readTemplate,
  type Context,
  type SetupLogger,
  normalizeTextFileContent,
  writeFileAlways,
  writeFileIfMissing,
  writeTemplateTree,
} from "./shared"

type SetupParams = {
  context: Context
  skillRoot: string
  logger: SetupLogger
}

type RuntimeUpgradeParams = {
  logger: SetupLogger
  skillRoot: string
}

function toolchainIsConfigured(toolchain?: ToolchainConfig): boolean {
  if (!toolchain) return false
  return ["install", "typecheck", "lint", "format", "test", "build"].every(key =>
    isConfiguredToolchainCommand(toolchain.commands[key as keyof ToolchainConfig["commands"]]),
  )
}

export function resolveInitialToolchain(
  context: Context,
  currentToolchain?: ToolchainConfig,
): ToolchainConfig {
  if (toolchainIsConfigured(currentToolchain)) {
    return currentToolchain
  }

  const ecosystem =
    normalizeContextEcosystem(context)
    ?? detectEcosystem(process.cwd())
    ?? (context.isGreenfield ? "bun" : "custom")
  const toolchain = buildToolchainConfig(
    ecosystem,
    process.cwd(),
  )
  if (context.isGreenfield && isWorkspaceFirstEcosystem(toolchain.ecosystem)) {
    toolchain.sourceRoot = "."
  }
  if (context.isGreenfield && toolchain.ecosystem === "bun") {
    toolchain.commands.test = { command: "bun run test" }
  }
  return toolchain
}

function syncClaudeMirrorFromAgents(logger: SetupLogger): void {
  if (!existsSync("AGENTS.md")) return

  const agentsContent = readFileSync("AGENTS.md", "utf-8")
  writeFileAlways("CLAUDE.md", agentsContent, logger)
}

function workspacePackageName(projectName: string, workspace: string): string {
  return `@${projectName}/${workspace}`
}

function createWorkspaceScripts(): Record<string, string> {
  return {
    typecheck: "tsc --project ../../tsconfig.json --noEmit",
    lint: "biome check src tests",
    format: "biome format --write src tests",
    "format:check": "biome format src tests",
    test: "bun test",
    build: "bun build ./src/app/index.ts --outdir ./dist",
  }
}

function createWorkspaceSummarySource(context: Context, workspace: string, label: string): string {
  return `export interface ScaffoldSummary {
  name: string;
  projectType: string;
  description: string;
  workspace: string;
}

const scaffoldDescription = [
  ${JSON.stringify(context.projectDisplayName)},
  " prepared as a ${label} workspace in the Harness Engineering and Orchestrator workflow.",
].join("");

export const scaffoldSummary: ScaffoldSummary = {
  name: ${JSON.stringify(context.projectName)},
  projectType: ${JSON.stringify(context.projectTypeLabel)},
  description: scaffoldDescription,
  workspace: ${JSON.stringify(workspace)},
};

export function getScaffoldSummary(): ScaffoldSummary {
  return scaffoldSummary;
}
`
}

function createWorkspaceSummaryTest(context: Context, workspace: string): string {
  return `import { expect, test } from "bun:test";
import { getScaffoldSummary } from "../../src/app/index";

test("scaffold summary exposes project metadata", () => {
  const summary = getScaffoldSummary();

  expect(summary.name).toBe(${JSON.stringify(context.projectName)});
  expect(summary.projectType).toContain("Monorepo");
  expect(summary.projectType.length).toBeGreaterThan(0);
  expect(summary.description.length).toBeGreaterThan(0);
  expect(summary.workspace).toBe(${JSON.stringify(workspace)});
});
`
}

function writeWorkspaceScaffold(
  context: Context,
  logger: SetupLogger,
  packageDir: string,
  workspace: string,
  label: string,
): void {
  mkdirSync(join(packageDir, "src", "types"), { recursive: true })
  mkdirSync(join(packageDir, "src", "config"), { recursive: true })
  mkdirSync(join(packageDir, "src", "lib"), { recursive: true })
  mkdirSync(join(packageDir, "src", "services"), { recursive: true })
  mkdirSync(join(packageDir, "src", "app"), { recursive: true })
  mkdirSync(join(packageDir, "tests", "unit"), { recursive: true })

  const packagePath = join(packageDir, "package.json").replace(/\\/g, "/")
  const nextPackage = {
    name: workspacePackageName(context.projectName, workspace),
    version: "0.1.0",
    private: true,
    type: "module",
    description: `${context.projectDisplayName} ${label} workspace.`,
    scripts: createWorkspaceScripts(),
  }

  if (!existsSync(packagePath)) {
    writeFileIfMissing(
      packagePath,
      `${JSON.stringify(nextPackage, null, 2)}\n`,
      logger,
    )
  } else {
    try {
      const currentPackage = JSON.parse(readFileSync(packagePath, "utf-8")) as Record<string, unknown>
      const currentScripts =
        typeof currentPackage.scripts === "object" && currentPackage.scripts !== null
          ? (currentPackage.scripts as Record<string, string>)
          : {}

      const mergedPackage = {
        ...currentPackage,
        name:
          typeof currentPackage.name === "string" && currentPackage.name.trim().length > 0
            ? currentPackage.name
            : nextPackage.name,
        version:
          typeof currentPackage.version === "string" && currentPackage.version.trim().length > 0
            ? currentPackage.version
            : nextPackage.version,
        private:
          typeof currentPackage.private === "boolean" ? currentPackage.private : nextPackage.private,
        type:
          typeof currentPackage.type === "string" && currentPackage.type.trim().length > 0
            ? currentPackage.type
            : nextPackage.type,
        description:
          typeof currentPackage.description === "string" && currentPackage.description.trim().length > 0
            ? currentPackage.description
            : nextPackage.description,
        scripts: {
          ...nextPackage.scripts,
          ...currentScripts,
        },
      }

      writeFileAlways(packagePath, `${JSON.stringify(mergedPackage, null, 2)}\n`, logger)
    } catch {
      writeFileAlways(packagePath, `${JSON.stringify(nextPackage, null, 2)}\n`, logger)
    }
  }

  writeFileIfMissing(
    join(packageDir, "README.md").replace(/\\/g, "/"),
    `# ${context.projectDisplayName} — ${label}\n\nWorkspace placeholder. Add real implementation here when the milestone reaches this surface.\n`,
    logger,
  )
  writeFileIfMissing(
    join(packageDir, "src", "app", "index.ts").replace(/\\/g, "/"),
    createWorkspaceSummarySource(context, workspace, label),
    logger,
  )
  writeFileIfMissing(
    join(packageDir, "tests", "unit", "scaffold-smoke.test.ts").replace(/\\/g, "/"),
    createWorkspaceSummaryTest(context, workspace),
    logger,
  )
}

function copyDirectory(sourceDir: string, targetDir: string): void {
  mkdirSync(targetDir, { recursive: true })

  for (const entry of readdirSync(sourceDir, { withFileTypes: true })) {
    const sourcePath = join(sourceDir, entry.name)
    const targetPath = join(targetDir, entry.name)

    if (entry.isDirectory()) {
      copyDirectory(sourcePath, targetPath)
    } else {
      writeFileSync(targetPath, normalizeTextFileContent(readFileSync(sourcePath, "utf-8")))
    }
  }
}

function requiredEnvironmentCommands(ecosystem: SupportedEcosystem): Array<[string, string, string]> {
  const commands: Array<[string, string, string]> = [
    [
      "bun",
      "Bun",
      process.platform === "win32"
        ? 'PowerShell: powershell -c "irm bun.sh/install.ps1 | iex"'
        : "curl -fsSL https://bun.sh/install | bash",
    ],
    [
      "git",
      "Git",
      process.platform === "win32"
        ? "https://git-scm.com/download/win"
        : "brew install git (macOS) / sudo apt install git (Linux)",
    ],
  ]

  switch (ecosystem) {
    case "node-npm":
      commands.push(["npm", "npm", "Install Node.js/npm from https://nodejs.org/"])
      break
    case "node-pnpm":
      commands.push(["pnpm", "pnpm", "Install pnpm: https://pnpm.io/installation"])
      break
  }

  return commands
}

async function checkEnv(logger: SetupLogger, ecosystem: SupportedEcosystem): Promise<void> {
  logger.step("Environment validation")

  for (const [cmd, label, install] of requiredEnvironmentCommands(ecosystem)) {
    const result = inspectCommandVersion(cmd)
    if (!result.ok) {
      logger.error(`${label} is not installed. Please install: ${install}`)
    }

    logger.log(`${label} installed: ${result.version}`)
  }
}

export function inspectCommandVersion(cmd: string): { ok: boolean; version: string } {
  try {
    const proc = Bun.spawnSync([cmd, "--version"], { stdout: "pipe", stderr: "pipe" })
    if (proc.exitCode !== 0) {
      return { ok: false, version: "" }
    }

    return {
      ok: true,
      version: new TextDecoder().decode(proc.stdout).trim().split(/\r?\n/)[0] ?? "",
    }
  } catch {
    return { ok: false, version: "" }
  }
}

function normalizeContextEcosystem(context: Context): SupportedEcosystem {
  return context.ecosystem as SupportedEcosystem
}

function packageManagerBinary(ecosystem: SupportedEcosystem): string | undefined {
  switch (ecosystem) {
    case "bun":
      return "bun"
    case "node-npm":
      return "npm"
    case "node-pnpm":
      return "pnpm"
    default:
      return undefined
  }
}

function packageManagerFallback(ecosystem: SupportedEcosystem): string | undefined {
  switch (ecosystem) {
    case "bun":
      return "bun@1.0.0"
    case "node-npm":
      return "npm@latest"
    case "node-pnpm":
      return "pnpm@latest"
    default:
      return undefined
  }
}

function packageManagerField(ecosystem: SupportedEcosystem): string | undefined {
  const binary = packageManagerBinary(ecosystem)
  if (!binary) return undefined

  const detected = inspectCommandVersion(binary).version.trim()
  if (!detected) return packageManagerFallback(ecosystem)

  const version = detected.split(/\s+/).find(part => /^\d+(\.\d+){0,2}/.test(part))
  return `${binary}@${version ?? detected}`
}

function workspaceRunnerCommand(scriptName: string): string {
  return `bun scripts/harness-local/workspace-runner.mjs ${scriptName}`
}

function workspaceFirstRootScripts(ecosystem: SupportedEcosystem): Record<string, string> {
  if (isTurboWorkspaceEcosystem(ecosystem)) {
    return {
      "check:deps": "dependency-cruiser --config .dependency-cruiser.cjs . --output-type err-long",
      "typecheck": "turbo run typecheck",
      "lint": "turbo run lint",
      "format": "turbo run format",
      "format:check": "turbo run format:check",
      "test": "turbo run test",
      "build": "turbo run build",
    }
  }

  if (usesHarnessWorkspaceRunner(ecosystem)) {
    return {
      "check:deps": "dependency-cruiser --config .dependency-cruiser.cjs . --output-type err-long",
      "typecheck": workspaceRunnerCommand("typecheck"),
      "lint": workspaceRunnerCommand("lint"),
      "format": workspaceRunnerCommand("format"),
      "format:check": workspaceRunnerCommand("format:check"),
      "test": workspaceRunnerCommand("test"),
      "build": workspaceRunnerCommand("build"),
    }
  }

  return {
    "check:deps": "dependency-cruiser --config .dependency-cruiser.cjs . --output-type err-long",
  }
}

function workspaceFirstDevDependencies(ecosystem: SupportedEcosystem): Record<string, string> {
  const shared = {
    "@biomejs/biome": "latest",
    "@types/node": "latest",
    "dependency-cruiser": "latest",
    "typescript": "latest",
  }

  if (isTurboWorkspaceEcosystem(ecosystem)) {
    return {
      ...shared,
      "bun-types": "latest",
      "turbo": "latest",
    }
  }

  if (usesHarnessWorkspaceRunner(ecosystem)) {
    return shared
  }

  return {}
}

const MANAGED_ROOT_SCRIPT_KEYS = [
  "check:deps",
  "typecheck",
  "lint",
  "format",
  "format:check",
  "test",
  "build",
] as const

const MANAGED_DEV_DEP_KEYS = [
  "@biomejs/biome",
  "@types/node",
  "bun-types",
  "dependency-cruiser",
  "turbo",
  "typescript",
] as const

function createContextForState(state: ProjectState, skillRoot: string): Context {
  return createContext(
    {
      aiProvider: state.projectInfo.aiProvider,
      designReference: state.projectInfo.designReference ?? "",
      designStyle: state.projectInfo.designStyle ?? "",
      displayName: state.projectInfo.displayName,
      ecosystem: state.toolchain.ecosystem,
      goal: state.projectInfo.goal,
      isGreenfield: String(state.projectInfo.isGreenfield),
      name: state.projectInfo.name,
      problem: state.projectInfo.problem,
      teamSize: state.projectInfo.teamSize,
      type: state.projectInfo.types.join(","),
    },
    skillRoot,
  )
}

function copyHarnessRuntime(skillRoot: string, logger: SetupLogger): void {
  logger.step("Initialize .harness/")
  mkdirSync(".harness", { recursive: true })

  const entryFiles = [
    ["harness-types.ts", ".harness/types.ts"],
      ["harness-init.ts", ".harness/init.ts"],
      ["harness-stage.ts", ".harness/stage.ts"],
      ["harness-approve.ts", ".harness/approve.ts"],
      ["harness-advance.ts", ".harness/advance.ts"],
    ["harness-state.ts", ".harness/state.ts"],
    ["harness-validate.ts", ".harness/validate.ts"],
    ["harness-orchestrator.ts", ".harness/orchestrator.ts"],
    ["harness-orchestrate.ts", ".harness/orchestrate.ts"],
    ["harness-compact.ts", ".harness/compact.ts"],
    ["harness-add-surface.ts", ".harness/add-surface.ts"],
    ["harness-audit.ts", ".harness/audit.ts"],
    ["harness-sync-docs.ts", ".harness/sync-docs.ts"],
    ["harness-sync-skills.ts", ".harness/sync-skills.ts"],
    ["harness-api-add.ts", ".harness/api-add.ts"],
    ["harness-merge-milestone.ts", ".harness/merge-milestone.ts"],
    ["harness-resume.ts", ".harness/resume.ts"],
    ["harness-learn.ts", ".harness/learn.ts"],
    ["harness-metrics.ts", ".harness/metrics.ts"],
    ["harness-entropy-scan.ts", ".harness/entropy-scan.ts"],
    ["harness-scope-change.ts", ".harness/scope-change.ts"],
    ["harness-upgrade-runtime.ts", ".harness/upgrade-runtime.ts"],
  ] as const

  for (const [sourceFile, destination] of entryFiles) {
    const content = readFileSync(join(skillRoot, "references", sourceFile), "utf-8")
    writeFileAlways(destination, content, logger)
  }

  copyDirectory(join(skillRoot, "references", "runtime"), join(process.cwd(), ".harness", "runtime"))
  logger.log("Synced .harness/runtime/")
}

function syncRuntimeManagedFiles(context: Context, skillRoot: string, logger: SetupLogger): void {
  writeFileAlways("AGENTS.md", readTemplate(skillRoot, context, "AGENTS.md.template"), logger)
  syncClaudeMirrorFromAgents(logger)
  writeFileAlways(
    "scripts/harness-local/restore.ts",
    readTemplate(skillRoot, context, "scripts/harness-local/restore.ts.template"),
    logger,
  )
}

function copyAgentSpecs(skillRoot: string, logger: SetupLogger): void {
  logger.step("Sync agents/")
  copyDirectory(join(skillRoot, "agents"), join(process.cwd(), "agents"))
  logger.log("Synced agents/")
}

function ensureProjectStructure(logger: SetupLogger): void {
  logger.step("Create directory structure")

  for (const dir of [
    "docs",
    "docs/prd",
    "docs/prd/versions",
    "docs/architecture",
    "docs/architecture/versions",
    "docs/progress",
    "docs/ai",
    "docs/public",
    "docs/adr",
    "docs/design",
    "docs/gitbook",
    "docs/gitbook/getting-started",
    "docs/gitbook/guides",
    "docs/gitbook/api-reference",
    "docs/gitbook/architecture",
    "docs/gitbook/changelog",
    ".github",
    ".github/workflows",
    ".github/ISSUE_TEMPLATE",
    "apps",
    "packages",
    "packages/shared",
  ]) {
    mkdirSync(dir, { recursive: true })
    logger.log(`Created ${dir}/`)
  }
}

function ensureMonorepoBaseline({ context, logger }: SetupParams): void {
  logger.step("Create monorepo workspace baseline")

  for (const workspace of context.workspaceApps) {
    writeWorkspaceScaffold(context, logger, join("apps", workspace), workspace, workspace)
  }

  mkdirSync("packages/shared/api", { recursive: true })
  writeWorkspaceScaffold(context, logger, "packages/shared", "shared", "shared")
  writeFileIfMissing(
    "packages/shared/api/README.md",
    `# ${context.projectDisplayName} — shared API wrappers\n\nPlace agent-facing API wrappers in subdirectories under this folder. Each service should expose one stable contract for agent workflows.\n`,
    logger,
  )
  if (normalizeContextEcosystem(context) === "bun") {
    writeFileIfMissing(
      "bunfig.toml",
      "[install]\nlinker = \"isolated\"\n",
      logger,
    )
  }
}

function writeAgentSkillScaffold({ context, skillRoot, logger }: SetupParams): void {
  if (!context.hasAgentProject) return

  logger.step("Create agent skill scaffold")
  writeFileIfMissing("SKILLS.md", readTemplate(skillRoot, context, "SKILLS.md.template"), logger)
  writeFileIfMissing(
    "skills/api-wrapper/SKILL.md",
    readTemplate(skillRoot, context, "skills/api-wrapper/SKILL.md.template"),
    logger,
  )
}

function writeCoreFiles({ context, skillRoot, logger }: SetupParams): void {
  logger.step("Generate core documents")

  writeFileIfMissing("package.json", readTemplate(skillRoot, context, "package.json.template"), logger)
  const agents = readTemplate(skillRoot, context, "AGENTS.md.template")
  writeFileIfMissing("AGENTS.md", agents, logger)
  syncClaudeMirrorFromAgents(logger)
  writeFileIfMissing("README.md", readTemplate(skillRoot, context, "README.md.template"), logger)
  writeFileIfMissing(".env.example", readTemplate(skillRoot, context, "_env.example.template"), logger)
  writeFileIfMissing(
    ".github/PULL_REQUEST_TEMPLATE.md",
    readTemplate(skillRoot, context, "PULL_REQUEST_TEMPLATE.md.template"),
    logger,
  )
  writeFileIfMissing(
    ".github/workflows/ci.yml",
    readTemplate(skillRoot, context, ".github/workflows/ci.yml.template"),
    logger,
  )
  writeFileIfMissing(
    ".github/workflows/release.yml",
    readTemplate(skillRoot, context, ".github/workflows/release.yml.template"),
    logger,
  )
  writeTemplateTree(skillRoot, context, ".github/ISSUE_TEMPLATE", ".github/ISSUE_TEMPLATE", logger)

  writeTemplateTree(skillRoot, context, "docs", "docs", logger, relativePath =>
    context.isUiProject || relativePath !== "design/DESIGN_SYSTEM.md.template",
  )
  writeTemplateTree(skillRoot, context, "scripts", "scripts", logger)

  writeFileIfMissing(
    ".dependency-cruiser.cjs",
    readTemplate(skillRoot, context, ".dependency-cruiser.cjs.template"),
    logger,
  )
  if (isTurboWorkspaceEcosystem(normalizeContextEcosystem(context))) {
    writeFileIfMissing("turbo.json", readTemplate(skillRoot, context, "turbo.json.template"), logger)
  }
  if (normalizeContextEcosystem(context) === "node-pnpm") {
    writeFileIfMissing("pnpm-workspace.yaml", readTemplate(skillRoot, context, "pnpm-workspace.yaml.template"), logger)
  }
  writeFileIfMissing("gitbook.yaml", readTemplate(skillRoot, context, "gitbook.yaml.template"), logger)
  writeFileIfMissing("biome.json", readTemplate(skillRoot, context, "biome.json.template"), logger)
  writeFileIfMissing("tsconfig.json", readTemplate(skillRoot, context, "tsconfig.json.template"), logger)
  writeFileIfMissing("CONTRIBUTING.md", readTemplate(skillRoot, context, "CONTRIBUTING.md.template"), logger)
  writeFileIfMissing("SECURITY.md", readTemplate(skillRoot, context, "SECURITY.md.template"), logger)
  writeFileIfMissing("LICENSE", readTemplate(skillRoot, context, "LICENSE.template"), logger)
}

const CLAUDE_SETTINGS_JSON = stringifyClaudeSettings(buildClaudeSettings())

function installHooks(skillRoot: string, logger: SetupLogger): void {
  logger.step("Install hooks (Git + Claude Code + Codex CLI)")

  // Git hooks — only if .git exists
  if (existsSync(".git")) {
    const shims: Record<string, string> = {
      "pre-commit":
        "#!/bin/sh\nbun .harness/runtime/hooks/check-guardian.ts --hook pre-commit\n",
      "commit-msg":
        '#!/bin/sh\nbun .harness/runtime/hooks/check-guardian.ts --hook commit-msg "$1"\n',
      "pre-push":
        "#!/bin/sh\nbun .harness/runtime/hooks/check-guardian.ts --hook pre-push\n",
      "post-commit":
        "#!/bin/sh\nbun .harness/runtime/hooks/check-guardian.ts --hook post-commit\n",
    }
    const hooksDir = join(".git", "hooks")
    mkdirSync(hooksDir, { recursive: true })
    for (const [name, content] of Object.entries(shims)) {
      const hookPath = join(hooksDir, name)
      writeFileSync(hookPath, content)
      try {
        chmodSync(hookPath, 0o755)
      } catch {
        // chmod may fail on Windows
      }
    }
    logger.log(
      "Git hooks installed (pre-commit, commit-msg, pre-push, post-commit)",
    )
  }

  // .claude/settings.local.json
  mkdirSync(".claude", { recursive: true })
  writeFileIfMissing(
    ".claude/settings.local.json",
    CLAUDE_SETTINGS_JSON,
    logger,
  )

  // Codex guardrail config + local runtime defaults (not orchestration lifecycle config)
  mkdirSync(".codex", { recursive: true })
  writeFileIfMissing(".codex/config.toml", CODEX_CONFIG_TOML, logger)
  mkdirSync(join(".codex", "rules"), { recursive: true })
  writeFileIfMissing(join(".codex", "rules", "guardian.rules"), CODEX_GUARDIAN_RULES, logger)
}

function updatePackageJson(logger: SetupLogger, ecosystem: SupportedEcosystem): void {
  logger.step("Update package.json scripts")

  if (!existsSync("package.json")) {
    logger.warn("package.json does not exist, skipping scripts update")
    return
  }

  const pkg = JSON.parse(readFileSync("package.json", "utf-8")) as {
    devDependencies?: Record<string, string>
    packageManager?: string
    scripts?: Record<string, string>
    workspaces?: string[]
  }

  const workspaceDefaults = workspaceFirstRootScripts(ecosystem)

  const currentScripts = pkg.scripts ?? {}
  const preservedScripts = Object.fromEntries(
    Object.entries(currentScripts).filter(([key]) =>
      !MANAGED_ROOT_SCRIPT_KEYS.includes(key as typeof MANAGED_ROOT_SCRIPT_KEYS[number]) &&
      !key.startsWith("harness:"),
    ),
  )
  const harnessScripts = {
    "harness:init": "bun .harness/init.ts",
    "harness:init:prd": "bun .harness/init.ts --from-prd",
    "harness:stage": "bun .harness/stage.ts",
    "harness:approve": "bun .harness/approve.ts",
    "harness:sync-backlog": "bun .harness/init.ts --sync-from-prd",
    "harness:advance": "bun .harness/advance.ts",
    "harness:add-surface": "bun .harness/add-surface.ts",
    "harness:autoflow": "bun .harness/orchestrator.ts --auto",
    "harness:audit": "bun .harness/audit.ts",
    "harness:sync-docs": "bun .harness/sync-docs.ts",
    "harness:sync-skills": "bun .harness/sync-skills.ts",
    "harness:api:add": "bun .harness/api-add.ts",
    "harness:state": "bun .harness/state.ts",
    "harness:env": "bun .harness/validate.ts --env",
    "harness:validate": "bun .harness/validate.ts",
    "harness:validate:phase": "bun .harness/validate.ts --phase",
    "harness:validate:task": "bun .harness/validate.ts --task",
    "harness:validate:milestone": "bun .harness/validate.ts --milestone",
    "harness:guardian": "bun .harness/validate.ts --guardian",
    "harness:resume": "bun .harness/resume.ts",
    "harness:learn": "bun .harness/learn.ts",
    "harness:metrics": "bun .harness/metrics.ts",
    "harness:entropy-scan": "bun .harness/entropy-scan.ts",
    "harness:scope-change": "bun .harness/scope-change.ts",
    "harness:upgrade-runtime": "bun .harness/upgrade-runtime.ts",
    "harness:orchestrator": "bun .harness/orchestrator.ts",
    "harness:orchestrate": "bun .harness/orchestrate.ts",
    "harness:merge-milestone": "bun .harness/merge-milestone.ts",
    "harness:compact": "bun .harness/compact.ts",
    "harness:compact:milestone": "bun .harness/compact.ts --milestone",
    "harness:compact:status": "bun .harness/compact.ts --status",
    "harness:hooks:install": "bun scripts/harness-local/restore.ts",
  }

  pkg.scripts = {
    ...workspaceDefaults,
    ...preservedScripts,
    ...harnessScripts,
  }

  if (isWorkspaceFirstEcosystem(ecosystem)) {
    const currentWorkspaces = Array.isArray(pkg.workspaces)
      ? pkg.workspaces.filter((entry): entry is string => typeof entry === "string")
      : []
    pkg.workspaces = Array.from(new Set([...currentWorkspaces, "apps/*", "packages/*"]))
    const preservedDevDependencies = Object.fromEntries(
      Object.entries(pkg.devDependencies ?? {}).filter(([key]) =>
        !MANAGED_DEV_DEP_KEYS.includes(key as typeof MANAGED_DEV_DEP_KEYS[number]),
      ),
    )
    pkg.devDependencies = {
      ...workspaceFirstDevDependencies(ecosystem),
      ...preservedDevDependencies,
    }
  }
  const nextPackageManager = packageManagerField(ecosystem)
  if (nextPackageManager) {
    const binary = packageManagerBinary(ecosystem) ?? ""
    if (!pkg.packageManager || (binary && pkg.packageManager.startsWith(`${binary}@`))) {
      pkg.packageManager = nextPackageManager
    }
  }

  writeFileSync("package.json", `${JSON.stringify(pkg, null, 2)}\n`)
  logger.log("harness:* scripts added to package.json")
}

function backfillWorkspaceFirstBaseline(params: SetupParams): void {
  if (!isWorkspaceFirstEcosystem(normalizeContextEcosystem(params.context))) {
    return
  }

  ensureProjectStructure(params.logger)
  writeCoreFiles(params)
  ensureMonorepoBaseline(params)
}

function setupGitignore(logger: SetupLogger): void {
  logger.step("Create/update .gitignore")

  const requiredEntries = [
    "node_modules/",
    ".env",
    ".env.local",
    ".env.*.local",
    ".env.production",
    "dist/",
    ".next/",
    ".turbo/",
    ".harness/*.log",
    ".harness/",
    ".claude/",
    ".codex/",
    "AGENTS.md",
    "CLAUDE.md",
    "agents/",
    "SKILLS.md",
    "skills/",
    "docs/ai/",
    "docs/progress/",
    "docs/PROGRESS.md",
  ]

  if (!existsSync(".gitignore")) {
    writeFileIfMissing(
      ".gitignore",
      `# Dependencies
node_modules/

# Environment
.env
.env.local
.env.*.local
.env.production

# Build outputs
dist/
.next/
.turbo/

# OS
.DS_Store
Thumbs.db

# IDE
.vscode/
.idea/
*.swp

# Harness
.harness/
.harness/*.log
.claude/
.codex/
AGENTS.md
CLAUDE.md
agents/
SKILLS.md
skills/
docs/ai/
docs/progress/
docs/PROGRESS.md
`,
      logger,
    )
    return
  }

  const current = readFileSync(".gitignore", "utf-8")
  const missing = requiredEntries.filter(entry => !current.includes(entry))
  if (missing.length === 0) {
    logger.log(".gitignore already contains required rules")
    return
  }

  writeFileAlways(
    ".gitignore",
    `${current.trimEnd()}\n\n# Harness required entries\n${missing.join("\n")}\n`,
    logger,
  )
}

function spawnQuiet(cmd: string[]): { ok: boolean; stdout: string; stderr: string } {
  const proc = Bun.spawnSync(cmd, { stdout: "pipe", stderr: "pipe" })
  return {
    ok: proc.exitCode === 0,
    stdout: new TextDecoder().decode(proc.stdout).trim(),
    stderr: new TextDecoder().decode(proc.stderr).trim(),
  }
}

function ensureGitRepository(logger: SetupLogger): void {
  logger.step("Initialize Git")

  const repoCheck = spawnQuiet(["git", "rev-parse", "--is-inside-work-tree"])
  if (repoCheck.ok && repoCheck.stdout === "true") {
    logger.log("Git repo already exists")
    return
  }

  const initResult = spawnQuiet(["git", "init", "-b", "main"])
  if (initResult.ok) {
    logger.log("Created git repo (main)")
    return
  }

  const fallbackInit = spawnQuiet(["git", "init"])
  if (!fallbackInit.ok) {
    logger.error(`git init failed: ${fallbackInit.stderr || initResult.stderr}`)
  }

  const branchRename = spawnQuiet(["git", "branch", "-M", "main"])
  if (!branchRename.ok) {
    logger.warn(`git branch -M main failed: ${branchRename.stderr}`)
  }
  logger.log("Created git repo (main)")
}

function hasLocalCommit(): boolean {
  return spawnQuiet(["git", "rev-parse", "--verify", "HEAD"]).ok
}

function hasDependencyCruiserCiSupport(): boolean {
  if (!existsSync(".dependency-cruiser.cjs")) return false
  if (!existsSync(".github/workflows/ci.yml")) return false
  if (!existsSync("package.json")) return false

  const workflow = readFileSync(".github/workflows/ci.yml", "utf-8")
  const pkg = JSON.parse(readFileSync("package.json", "utf-8")) as {
    scripts?: Record<string, string>
  }

  return workflow.includes("bun run check:deps") && Boolean(pkg.scripts?.["check:deps"])
}

async function setupGitHub({ context, logger }: SetupParams): Promise<Partial<GitHubState>> {
  logger.step("GitHub remote automation")

  const result: Partial<GitHubState> = {
    orgName: context.org,
    repoName: context.repo,
    visibility: context.visibility,
  }

  // 1. --skipGithub flag
  if (context.skipGithub) {
    logger.warn("--skipGithub is set, skipping GitHub automation")
    return result
  }

  // 2. Check gh CLI
  const ghCheck = spawnQuiet(["gh", "--version"])
  if (!ghCheck.ok) {
    logger.warn("gh CLI is not installed, skipping GitHub automation (install: https://cli.github.com/)")
    return result
  }
  logger.log(`gh CLI installed: ${ghCheck.stdout.split(/\r?\n/)[0]}`)

  // 3. Check gh auth
  const authCheck = spawnQuiet(["gh", "auth", "status"])
  if (!authCheck.ok) {
    logger.warn("gh is not authenticated, skipping GitHub automation (run: gh auth login)")
    return result
  }
  logger.log("gh authenticated")

  // 4. Determine owner/repo
  const owner = context.org
  const repo = context.repo
  const fullName = context.githubRepo || `${owner}/${repo}`

  // Check if remote origin already exists
  const remoteCheck = spawnQuiet(["git", "remote", "get-url", "origin"])
  const remoteAlreadyExists = remoteCheck.ok

  if (remoteAlreadyExists) {
    logger.log(`remote origin already exists: ${remoteCheck.stdout}`)
    result.remoteUrl = remoteCheck.stdout
    result.remoteAdded = true
    result.repoCreated = true
  } else if (context.githubRepo) {
    // Use existing repo specified via --githubRepo
    logger.log(`Using specified existing repo: ${context.githubRepo}`)
    result.repoCreated = true
    result.remoteUrl = `https://github.com/${context.githubRepo}`
  } else {
    // Create new repo
    const createArgs = [
      "gh", "repo", "create", fullName,
      `--${context.visibility}`,
      "--description", context.projectDescription,
    ]
    if (hasLocalCommit()) {
      createArgs.push("--source", ".", "--push")
    }

    const createResult = spawnQuiet(createArgs)
    if (createResult.ok) {
      logger.log(`GitHub repo created: ${fullName}`)
      result.repoCreated = true
      result.remoteUrl = `https://github.com/${fullName}`
      if (hasLocalCommit()) {
        result.remoteAdded = true
        result.pushed = true
      }
    } else {
      // Repo might already exist — try to continue
      logger.warn(`gh repo create failed (may already exist): ${createResult.stderr}`)
      result.remoteUrl = `https://github.com/${fullName}`
    }
  }

  // 5. Ensure remote origin is set
  if (!result.remoteAdded) {
    const url = result.remoteUrl || `https://github.com/${fullName}`
    const addRemote = spawnQuiet(["git", "remote", "add", "origin", url])
    if (addRemote.ok) {
      logger.log(`remote origin set: ${url}`)
      result.remoteAdded = true
      result.remoteUrl = url
    } else {
      logger.warn(`Failed to set remote origin: ${addRemote.stderr}`)
    }
  }

  // 6. Push (if not already pushed by gh repo create --push)
  if (result.remoteAdded && !result.pushed && hasLocalCommit()) {
    const pushResult = spawnQuiet(["git", "push", "-u", "origin", "main"])
    if (pushResult.ok) {
      logger.log("Pushed to origin/main")
      result.pushed = true
    } else {
      logger.warn(`Push failed (run git push manually later): ${pushResult.stderr}`)
    }
  } else if (result.remoteAdded && !result.pushed) {
    logger.warn("No commits yet, skipping initial push; run git push after the first commit")
  }

  // 7. Branch protection
  const protectResult = spawnQuiet([
    "gh", "api", "-X", "PUT",
    `repos/${fullName}/branches/main/protection`,
    "-f", "required_status_checks[strict]=true",
    "-f", "required_status_checks[contexts][]=ci",
    "-f", "enforce_admins=false",
    "-f", "required_pull_request_reviews[required_approving_review_count]=0",
    "-f", "restrictions=null",
  ])
  if (protectResult.ok) {
    logger.log("branch protection configured (main)")
    result.branchProtection = true
  } else {
    logger.warn(`branch protection setup failed (requires repo admin permissions): ${protectResult.stderr}`)
  }

  // 8. Labels
  const labels = [
    { name: "milestone", color: "0E8A16", description: "Milestone tracking" },
    { name: "task", color: "1D76DB", description: "Task tracking" },
    { name: "blocked", color: "D93F0B", description: "Blocked by external dependency" },
    { name: "spike", color: "FBCA04", description: "Research / investigation" },
    { name: "design-review", color: "C5DEF5", description: "Needs design review" },
    { name: "harness", color: "5319E7", description: "Harness Engineering and Orchestrator managed" },
  ]
  let labelsOk = true
  for (const label of labels) {
    const labelResult = spawnQuiet([
      "gh", "label", "create", label.name,
      "--color", label.color,
      "--description", label.description,
      "--force",
    ])
    if (!labelResult.ok) labelsOk = false
  }
  if (labelsOk) {
    logger.log(`Labels created (${labels.length} total)`)
    result.labelsCreated = true
  } else {
    logger.warn("Some labels failed to create")
  }

  // 9. Issue templates are already written by writeCoreFiles
  result.issueTemplatesCreated = true

  // 10. Repo settings (description + topics)
  spawnQuiet([
    "gh", "repo", "edit", fullName,
    "--description", context.projectDescription,
    "--add-topic", "harness-engineering-orchestrator",
  ])

  return result
}

function writeInitialState(context: Context, logger: SetupLogger, githubResult?: Partial<GitHubState>): void {
  logger.step("Sync .harness/state.json")

  const prd = existsSync("docs/prd/03-requirements.md")
    ? readFileSync("docs/prd/03-requirements.md", "utf-8")
    : existsSync("docs/PRD.md")
      ? readFileSync("docs/PRD.md", "utf-8")
      : ""
  const milestoneCount = Math.max(1, countPrdMilestones(prd))
  const current = existingState()
  const defaults = initState({})
  const harnessLevel = current?.projectInfo.harnessLevel ?? defaults.projectInfo.harnessLevel
  const toolchain = resolveInitialToolchain(context, current?.toolchain)

  const next = initState({
    ...(current ?? {}),
    phase: current?.phase && current.phase !== "DISCOVERY" ? current.phase : "SCAFFOLD",
    projectInfo: {
      ...(current?.projectInfo ?? {}),
      name: context.projectName,
      displayName: context.projectDisplayName,
      concept: current?.projectInfo.concept ?? context.projectConcept,
      problem: current?.projectInfo.problem ?? context.projectProblem,
      goal: current?.projectInfo.goal ?? context.projectGoal,
      types: current?.projectInfo.types?.length ? current.projectInfo.types : context.projectTypes,
      aiProvider: current?.projectInfo.aiProvider ?? context.aiProvider,
      teamSize: current?.projectInfo.teamSize ?? context.teamSize,
      isGreenfield: current?.projectInfo.isGreenfield ?? context.isGreenfield,
      designStyle: current?.projectInfo.designStyle ?? context.designStyle,
      designReference: current?.projectInfo.designReference ?? context.designReference,
      harnessLevel,
    },
    docs: {
      ...(current?.docs ?? defaults.docs),
      prd: {
        path: "docs/PRD.md",
        exists: true,
        version: current?.docs.prd.version ?? "v1.0",
        milestoneCount,
      },
      architecture: {
        path: "docs/ARCHITECTURE.md",
        exists: true,
        version: current?.docs.architecture.version ?? "v1.0",
        dependencyLayers:
          current?.docs.architecture.dependencyLayers?.length
            ? current.docs.architecture.dependencyLayers
            : ["types", "config", "lib", "services", "app"],
        ciValidated: hasDependencyCruiserCiSupport(),
      },
      progress: {
        path: "docs/PROGRESS.md",
        exists: true,
        lastUpdated: context.nowIso,
      },
      gitbook: {
        path: "docs/gitbook/",
        initialized: true,
        summaryExists: true,
      },
      readme: {
        path: "README.md",
        exists: true,
        isFinal: current?.docs.readme.isFinal ?? false,
      },
      design: context.isUiProject
        ? {
            systemPath: "docs/design/DESIGN_SYSTEM.md",
            exists: existsSync("docs/design/DESIGN_SYSTEM.md"),
            milestoneSpecs: current?.docs.design?.milestoneSpecs ?? [],
          }
        : undefined,
      adrs: Array.from(
        new Set([...(current?.docs.adrs ?? []), "docs/adr/ADR-001-initial-tech-stack.md"]),
      ),
    },
    scaffold: {
      ...(current?.scaffold ?? defaults.scaffold),
      agentsMdExists: true,
      claudeMdExists: true,
      envExampleExists: true,
      ciExists: true,
      cdExists: existsSync(".github/workflows/release.yml"),
      prTemplateExists: true,
      depCheckConfigured: existsSync(".dependency-cruiser.cjs"),
      githubSetup: githubResult?.repoCreated ?? current?.scaffold.githubSetup ?? false,
    },
    roadmap: current?.roadmap ?? defaults.roadmap,
    validation: {
      ...(current?.validation ?? defaults.validation),
      criticalTotal: getHarnessCriticalTotal(harnessLevel.level),
    },
    github: {
      ...(current?.github ?? defaults.github),
      orgName: context.org,
      repoName: context.repo,
      visibility: context.visibility,
      ...githubResult,
    },
    toolchain,
  })

  writeFileAlways(".harness/state.json", `${JSON.stringify(next, null, 2)}\n`, logger)
}

function syncManagedArtifacts(logger: SetupLogger, skillRoot?: string): void {
  const state = existingState()
  if (!state) return

  logger.step("Sync managed docs / skills")
  syncManagedFiles(getManagedDocSpecs(state))
  syncManagedFiles(getManagedSkillSpecs(state))
  ensureEnvLocalSkeleton(state)
  syncClaudeMirrorFromAgents(logger)
  if (skillRoot) {
    writeHarnessSkillRoot(skillRoot)
  }
  const manifest = syncLocalBootstrapManifest()
  logger.log(
    `${manifest.changed ? "Updated" : "Verified"} ${manifest.path} (${manifest.fileCount} local file(s) captured)`,
  )
  logger.log("Managed docs and skills synchronized")
}

export async function runRuntimeUpgrade(params: RuntimeUpgradeParams): Promise<void> {
  const { logger, skillRoot } = params

  if (!existsSync(STATE_PATH)) {
    logger.error(".harness/state.json does not exist. Run Harness setup before upgrading the runtime.")
  }

  const currentState = readProjectStateFromDisk(STATE_PATH)
  const context = createContextForState(currentState, skillRoot)

  console.log(`\n${"═".repeat(55)}`)
  console.log("  🔄 Harness Runtime Upgrade")
  console.log(`${"═".repeat(55)}`)

  await checkEnv(logger, currentState.toolchain.ecosystem)
  copyHarnessRuntime(skillRoot, logger)
  copyAgentSpecs(skillRoot, logger)
  syncRuntimeManagedFiles(context, skillRoot, logger)
  backfillWorkspaceFirstBaseline({ context, skillRoot, logger })
  writeAgentSkillScaffold({ context, skillRoot, logger })
  setupGitignore(logger)
  updatePackageJson(logger, currentState.toolchain.ecosystem)
  installHooks(skillRoot, logger)

  const state = deriveStateFromFilesystem(readProjectStateFromDisk(STATE_PATH), {
    updateProgressTimestamp: false,
    updateValidationTimestamp: false,
  })
  syncManagedFiles(getManagedDocSpecs(state))
  syncManagedFiles(getManagedSkillSpecs(state))
  ensureEnvLocalSkeleton(state)
  syncClaudeMirrorFromAgents(logger)
  writeHarnessSkillRoot(skillRoot)
  const manifest = syncLocalBootstrapManifest()

  logger.log(
    `${manifest.changed ? "Updated" : "Verified"} ${manifest.path} (${manifest.fileCount} local file(s) captured)`,
  )
  logger.log("Harness runtime, agents, and managed local files upgraded")

  console.log(`\n${"═".repeat(55)}`)
  console.log("  ✅ Harness runtime upgrade complete")
  console.log(`${"═".repeat(55)}\n`)
}

export async function runSetup(params: SetupParams): Promise<void> {
  const { context, skillRoot, logger } = params

  console.log(`\n${"═".repeat(55)}`)
  console.log(`  🔨 Harness Setup — ${context.projectDisplayName} (${context.projectTypeLabel})`)
  console.log(`${"═".repeat(55)}`)

  await checkEnv(logger, normalizeContextEcosystem(context))
  copyHarnessRuntime(skillRoot, logger)
  copyAgentSpecs(skillRoot, logger)
  ensureProjectStructure(logger)
  writeCoreFiles(params)
  ensureMonorepoBaseline(params)
  writeAgentSkillScaffold(params)
  setupGitignore(logger)
  updatePackageJson(logger, normalizeContextEcosystem(context))
  ensureGitRepository(logger)
  installHooks(skillRoot, logger)
  const githubResult = await setupGitHub(params)
  writeInitialState(context, logger, githubResult)
  syncManagedArtifacts(logger, skillRoot)

  console.log(`\n${"═".repeat(55)}`)
  console.log("  ✅ Harness initialization complete")
  console.log("")
  console.log("  Next steps:")
  console.log(`    1. ${context.installCommand}`)
  console.log("    2. Review the generated apps/* and packages/shared workspace placeholders")
  console.log("    3. Fill in actual content for docs/prd/ and docs/architecture/")
  console.log("    4. bun harness:advance")
  console.log("    5. bun harness:env")
  console.log("    6. bun harness:validate --phase EXECUTING")
  console.log("    7. git tag v0.1.0 && git push origin v0.1.0  (first release)")
  console.log(`${"═".repeat(55)}\n`)
}
