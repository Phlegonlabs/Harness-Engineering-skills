/**
 * Toolchain Registry — RT-16
 *
 * Default command presets per ecosystem.
 */

import type { ToolchainConfig, SupportedEcosystem } from "../types.js"

type ToolchainPreset = Omit<ToolchainConfig, "ecosystem">

const PACKAGE_MANAGER_LABELS: Partial<Record<SupportedEcosystem, string>> = {
  bun: "Bun",
  "node-npm": "npm",
  "node-pnpm": "pnpm",
  python: "pip",
  go: "Go modules",
  rust: "Cargo",
  "kotlin-gradle": "Gradle",
  "java-gradle": "Gradle",
  "java-maven": "Maven",
  ruby: "Bundler",
  "csharp-dotnet": "dotnet",
  swift: "Swift PM",
  flutter: "pub",
  custom: "Custom",
}

const ROOT_SCRIPT_PREFIXES: Partial<Record<SupportedEcosystem, string>> = {
  bun: "bun run",
  "node-npm": "npm run",
  "node-pnpm": "pnpm run",
}

const WORKSPACE_MODEL_LABELS: Partial<Record<SupportedEcosystem, string>> = {
  bun: "Monorepo (Bun workspaces + Turborepo)",
  "node-npm": "Monorepo (npm workspaces + Harness workspace runner)",
  "node-pnpm": "Monorepo (pnpm workspaces + Harness workspace runner)",
  python: "Monorepo (Python)",
  go: "Monorepo (Go modules)",
  rust: "Monorepo (Cargo workspace)",
  "kotlin-gradle": "Monorepo (Gradle)",
  "java-gradle": "Monorepo (Gradle)",
  "java-maven": "Monorepo (Maven)",
  ruby: "Monorepo (Bundler)",
  "csharp-dotnet": "Monorepo (.NET)",
  swift: "Monorepo (Swift PM)",
  flutter: "Monorepo (Flutter)",
  custom: "Monorepo",
}

const TURBO_WORKSPACE_ECOSYSTEMS = new Set<SupportedEcosystem>([
  "bun",
])

const WORKSPACE_FIRST_ECOSYSTEMS = new Set<SupportedEcosystem>([
  "bun",
  "node-npm",
  "node-pnpm",
])

export const TOOLCHAIN_PRESETS: Partial<Record<SupportedEcosystem, ToolchainPreset>> = {
  bun: {
    language: "typescript",
    packageManager: "bun",
    commands: {
      install: { command: "bun install" },
      typecheck: { command: "bun run typecheck" },
      lint: { command: "bun run lint" },
      format: { command: "bun run format:check" },
      test: { command: "bun test" },
      build: { command: "bun run build" },
      depCheck: { command: "bun run dep-check", optional: true },
    },
    sourceExtensions: [".ts", ".tsx", ".js", ".jsx"],
    sourceRoot: "src",
    manifestFile: "package.json",
    lockFile: "bun.lockb",
    forbiddenPatterns: [
      { pattern: "console\\.log", reason: "Use structured logging", severity: "warn" },
      { pattern: "any(?!\\w)", reason: "Avoid untyped any", severity: "warn" },
    ],
    ignorePatterns: ["node_modules/", "dist/", ".harness/"],
  },
  "node-npm": {
    language: "typescript",
    packageManager: "npm",
    commands: {
      install: { command: "npm install" },
      typecheck: { command: "npm run typecheck" },
      lint: { command: "npm run lint" },
      format: { command: "npm run format:check" },
      test: { command: "npm test" },
      build: { command: "npm run build" },
    },
    sourceExtensions: [".ts", ".tsx", ".js", ".jsx"],
    sourceRoot: "src",
    manifestFile: "package.json",
    lockFile: "package-lock.json",
    forbiddenPatterns: [
      { pattern: "console\\.log", reason: "Use structured logging", severity: "warn" },
    ],
    ignorePatterns: ["node_modules/", "dist/", ".harness/"],
  },
  "node-pnpm": {
    language: "typescript",
    packageManager: "pnpm",
    commands: {
      install: { command: "pnpm install" },
      typecheck: { command: "pnpm run typecheck" },
      lint: { command: "pnpm run lint" },
      format: { command: "pnpm run format:check" },
      test: { command: "pnpm test" },
      build: { command: "pnpm run build" },
    },
    sourceExtensions: [".ts", ".tsx", ".js", ".jsx"],
    sourceRoot: "src",
    manifestFile: "package.json",
    lockFile: "pnpm-lock.yaml",
    forbiddenPatterns: [],
    ignorePatterns: ["node_modules/", "dist/", ".harness/"],
  },
  python: {
    language: "python",
    packageManager: "pip",
    commands: {
      install: { command: "pip install -e '.[dev]'" },
      typecheck: { command: "mypy .", optional: true },
      lint: { command: "ruff check ." },
      format: { command: "ruff format --check ." },
      test: { command: "pytest" },
      build: { command: "python -m build", optional: true },
    },
    sourceExtensions: [".py"],
    sourceRoot: "src",
    manifestFile: "pyproject.toml",
    lockFile: "poetry.lock",
    forbiddenPatterns: [
      { pattern: "import \\*", reason: "Avoid wildcard imports", severity: "warn" },
      { pattern: "print\\(", reason: "Use logging module", severity: "warn" },
    ],
    ignorePatterns: ["__pycache__/", "*.pyc", ".venv/", "dist/", ".harness/"],
  },
  go: {
    language: "go",
    packageManager: "go",
    commands: {
      install: { command: "go mod download" },
      typecheck: { command: "go vet ./..." },
      lint: { command: "golangci-lint run" },
      format: { command: "test -z \"$(gofmt -l .)\"" },
      test: { command: "go test ./..." },
      build: { command: "go build ./..." },
    },
    sourceExtensions: [".go"],
    sourceRoot: ".",
    manifestFile: "go.mod",
    lockFile: "go.sum",
    forbiddenPatterns: [
      { pattern: "fmt\\.Print", reason: "Use structured logging", severity: "warn" },
    ],
    ignorePatterns: ["/bin/", "/vendor/", ".harness/"],
  },
  rust: {
    language: "rust",
    packageManager: "cargo",
    commands: {
      install: { command: "cargo fetch" },
      typecheck: { command: "cargo check" },
      lint: { command: "cargo clippy -- -D warnings" },
      format: { command: "cargo fmt --check" },
      test: { command: "cargo test" },
      build: { command: "cargo build" },
    },
    sourceExtensions: [".rs"],
    sourceRoot: "src",
    manifestFile: "Cargo.toml",
    lockFile: "Cargo.lock",
    forbiddenPatterns: [
      { pattern: "unwrap\\(\\)", reason: "Handle errors explicitly", severity: "warn" },
      { pattern: "println!", reason: "Use tracing/log crate", severity: "warn" },
    ],
    ignorePatterns: ["/target/", ".harness/"],
  },
  "kotlin-gradle": {
    language: "kotlin",
    packageManager: "gradle",
    commands: {
      install: { command: "./gradlew dependencies" },
      typecheck: { command: "./gradlew compileKotlin" },
      lint: { command: "./gradlew detekt" },
      format: { command: "./gradlew ktlintCheck" },
      test: { command: "./gradlew test" },
      build: { command: "./gradlew build" },
    },
    sourceExtensions: [".kt", ".kts"],
    sourceRoot: "src/main/kotlin",
    manifestFile: "build.gradle.kts",
    forbiddenPatterns: [],
    ignorePatterns: ["build/", ".gradle/", ".harness/"],
  },
  "java-gradle": {
    language: "java",
    packageManager: "gradle",
    commands: {
      install: { command: "./gradlew dependencies" },
      typecheck: { command: "./gradlew compileJava" },
      lint: { command: "./gradlew checkstyleMain" },
      format: { command: "./gradlew spotlessCheck", optional: true },
      test: { command: "./gradlew test" },
      build: { command: "./gradlew build" },
    },
    sourceExtensions: [".java"],
    sourceRoot: "src/main/java",
    manifestFile: "build.gradle",
    forbiddenPatterns: [],
    ignorePatterns: ["build/", ".gradle/", ".harness/"],
  },
  "java-maven": {
    language: "java",
    packageManager: "maven",
    commands: {
      install: { command: "mvn dependency:resolve" },
      typecheck: { command: "mvn compile" },
      lint: { command: "mvn checkstyle:check" },
      format: { command: "mvn spotless:check", optional: true },
      test: { command: "mvn test" },
      build: { command: "mvn package" },
    },
    sourceExtensions: [".java"],
    sourceRoot: "src/main/java",
    manifestFile: "pom.xml",
    forbiddenPatterns: [],
    ignorePatterns: ["target/", ".harness/"],
  },
}

export function isTurboWorkspaceEcosystem(ecosystem?: SupportedEcosystem): boolean {
  return Boolean(ecosystem && TURBO_WORKSPACE_ECOSYSTEMS.has(ecosystem))
}

export function isWorkspaceFirstEcosystem(ecosystem?: SupportedEcosystem): boolean {
  return Boolean(ecosystem && WORKSPACE_FIRST_ECOSYSTEMS.has(ecosystem))
}

export function usesHarnessWorkspaceRunner(ecosystem?: SupportedEcosystem): boolean {
  return isWorkspaceFirstEcosystem(ecosystem) && !isTurboWorkspaceEcosystem(ecosystem)
}

export function packageManagerLabelForEcosystem(ecosystem?: SupportedEcosystem): string {
  return PACKAGE_MANAGER_LABELS[ecosystem ?? "custom"] ?? "Custom"
}

export function rootScriptPrefixForEcosystem(ecosystem?: SupportedEcosystem): string | undefined {
  return ROOT_SCRIPT_PREFIXES[ecosystem ?? "custom"]
}

export function workspaceModelForEcosystem(ecosystem?: SupportedEcosystem): string {
  return WORKSPACE_MODEL_LABELS[ecosystem ?? "custom"] ?? "Monorepo"
}
