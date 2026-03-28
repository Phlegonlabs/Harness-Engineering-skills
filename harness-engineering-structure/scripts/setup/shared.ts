import { basename, dirname, join, relative } from "path"
import { existsSync, mkdirSync, readdirSync, readFileSync, writeFileSync } from "fs"

export type Context = {
  projectName: string
  isGreenfield: boolean
  skipGithub: boolean
  org: string
  defaultUser: string
  today: string
  year: string
}

export type SetupLogger = {
  info: (msg: string) => void
  warn: (msg: string) => void
  error: (msg: string) => void
  created: (path: string) => void
  skipped: (path: string) => void
}

export function parseArgs(argv: string[]): Record<string, string> {
  const args: Record<string, string> = {}
  for (const arg of argv) {
    const match = arg.match(/^--(\w[\w-]*)=(.*)$/)
    if (match) {
      args[match[1]] = match[2]
    } else if (arg.startsWith("--")) {
      args[arg.slice(2)] = "true"
    }
  }
  return args
}

export function createContext(args: Record<string, string>, skillRoot: string): Context {
  const configPath = join(skillRoot, "config.json")
  let config: Record<string, any> = {}
  if (existsSync(configPath)) {
    try {
      config = JSON.parse(readFileSync(configPath, "utf-8"))
    } catch {
      // Ignore unparseable config
    }
  }

  const now = new Date()
  return {
    projectName: args.projectName ?? config.defaults?.projectName ?? basename(process.cwd()),
    isGreenfield: (args.isGreenfield ?? "true") !== "false",
    skipGithub: (args.skipGithub ?? config.defaults?.skipGithub?.toString() ?? "false") === "true",
    org: config.org?.name ?? "your-org",
    defaultUser: config.org?.defaultUser ?? "Operator",
    today: now.toISOString().slice(0, 10),
    year: String(now.getFullYear()),
  }
}

export function createLogger(): SetupLogger {
  return {
    info: (msg: string) => console.log(`  ${msg}`),
    warn: (msg: string) => console.warn(`  ⚠ ${msg}`),
    error: (msg: string) => console.error(`  ✗ ${msg}`),
    created: (path: string) => console.log(`  + ${path}`),
    skipped: (path: string) => console.log(`  - ${path} (exists)`),
  }
}

export function readTemplate(skillRoot: string, templateRelPath: string): string {
  const templatePath = join(skillRoot, "templates", templateRelPath)
  if (!existsSync(templatePath)) {
    throw new Error(`Template not found: ${templatePath}`)
  }
  return readFileSync(templatePath, "utf-8")
}

export function applyReplacements(content: string, context: Context): string {
  return content
    .replace(/\{\{projectName\}\}/g, context.projectName)
    .replace(/\{\{year\}\}/g, context.year)
    .replace(/\{\{date\}\}/g, context.today)
    .replace(/\{\{org\}\}/g, context.org)
    .replace(/\{\{defaultUser\}\}/g, context.defaultUser)
}

export function writeFileIfMissing(filePath: string, content: string, logger: SetupLogger): void {
  if (existsSync(filePath)) {
    logger.skipped(filePath)
    return
  }
  ensureDir(dirname(filePath))
  writeFileSync(filePath, content, "utf-8")
  logger.created(filePath)
}

export function writeFileAlways(filePath: string, content: string, logger: SetupLogger): void {
  ensureDir(dirname(filePath))
  writeFileSync(filePath, content, "utf-8")
  logger.created(filePath)
}

export function ensureDir(dirPath: string): void {
  if (!existsSync(dirPath)) {
    mkdirSync(dirPath, { recursive: true })
  }
}

export function writeTemplateTree(
  skillRoot: string,
  context: Context,
  templateDir: string,
  targetDir: string,
  logger: SetupLogger,
  overwrite = false,
): void {
  const templatesPath = join(skillRoot, "templates", templateDir)
  if (!existsSync(templatesPath)) return

  const entries = readdirSync(templatesPath, { withFileTypes: true, recursive: true })
  for (const entry of entries) {
    if (!entry.isFile()) continue
    const relPath = join(entry.parentPath ?? entry.path, entry.name)
    const relFromTemplates = relative(templatesPath, relPath)
    // Strip .template suffix
    const targetRelPath = relFromTemplates.replace(/\.template$/, "")
    const targetPath = join(targetDir, targetRelPath)
    const content = readFileSync(relPath, "utf-8")
    const replaced = applyReplacements(content, context)

    if (overwrite) {
      writeFileAlways(targetPath, replaced, logger)
    } else {
      writeFileIfMissing(targetPath, replaced, logger)
    }
  }
}
