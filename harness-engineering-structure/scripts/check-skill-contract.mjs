import { readFileSync, existsSync } from "fs"
import path from "path"
import { fileURLToPath } from "url"

const scriptDir = path.dirname(fileURLToPath(import.meta.url))
const repoRoot = path.resolve(scriptDir, "..")
const manifest = JSON.parse(
  readFileSync(path.join(scriptDir, "contract-manifest.json"), "utf8"),
)

if (!existsSync(path.join(repoRoot, "SKILL.md"))) {
  console.error("Error: SKILL.md not found in skill root.")
  process.exit(1)
}

function read(relativePath) {
  const fullPath = path.join(repoRoot, relativePath)
  if (!existsSync(fullPath)) return null
  return readFileSync(fullPath, "utf8")
}

const errors = []

// Check required text in files
for (const check of manifest.requiredText) {
  const content = read(check.file)
  if (!content) {
    errors.push(`Missing file: ${check.file}`)
  } else if (!content.includes(check.text)) {
    errors.push(`Missing required text in ${check.file}: ${check.text}`)
  }
}

// Check forbidden text in files
for (const check of manifest.forbiddenText) {
  const content = read(check.file)
  if (content && content.includes(check.text)) {
    errors.push(`Found forbidden text in ${check.file}: ${check.text}`)
  }
}

// Check agent files exist
for (const agentId of manifest.agentIds) {
  const agentPath = `agents/${agentId}.md`
  if (!existsSync(path.join(repoRoot, agentPath))) {
    errors.push(`Missing agent file: ${agentPath}`)
  }
}

// Check required rule files exist
for (const rulePath of manifest.requiredRules) {
  if (!existsSync(path.join(repoRoot, rulePath))) {
    errors.push(`Missing rule file: ${rulePath}`)
  }
}

// Check required runtime entries exist
for (const runtimePath of manifest.requiredRuntimeEntries) {
  if (!existsSync(path.join(repoRoot, runtimePath))) {
    errors.push(`Missing runtime entry: ${runtimePath}`)
  }
}

// Check package.json template has required scripts
const pkgTemplate = read("templates/package.json.template")
if (pkgTemplate) {
  for (const scriptName of manifest.requiredTemplateScripts) {
    if (!pkgTemplate.includes(`"${scriptName}"`)) {
      errors.push(`package.json template missing script: ${scriptName}`)
    }
  }
} else {
  errors.push("Missing templates/package.json.template")
}

if (errors.length > 0) {
  console.error("Skill contract check failed:\n")
  for (const error of errors) {
    console.error(`- ${error}`)
  }
  process.exit(1)
}

console.log("Skill contract check passed.")
