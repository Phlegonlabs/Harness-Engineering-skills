import { afterEach, describe, expect, it } from "bun:test";
import { execFileSync } from "node:child_process";
import { mkdirSync, mkdtempSync, rmSync, writeFileSync } from "node:fs";
import os from "node:os";
import path from "node:path";
import { gitHasCommits } from "./shared";
import type { DependencyRules, ValidationContext } from "./types";
import { runLayerLint } from "./validation-layering";

const tempRoots: string[] = [];
const defaultRules = loadRules();

afterEach(() => {
	for (const root of tempRoots.splice(0)) {
		rmSync(root, { recursive: true, force: true });
	}
});

function loadRules(): DependencyRules {
	return JSON.parse(
		execFileSync(
			"node",
			[
				"-e",
				"process.stdout.write(require('node:fs').readFileSync(process.argv[1], 'utf8'))",
				path.join(process.cwd(), "harness/rules/dependency-layers.json"),
			],
			{ encoding: "utf8" },
		),
	) as DependencyRules;
}

function createRepo(
	files: Record<string, string>,
	options?: {
		sharedExports?: Record<string, string>;
	},
): string {
	const root = mkdtempSync(path.join(os.tmpdir(), "harness-validation-"));
	tempRoots.push(root);
	const sharedExports = options?.sharedExports ?? {
		".": "./src/index.ts",
	};
	const baseFiles: Record<string, string> = {
		"apps/api/package.json": JSON.stringify(
			{
				name: "@repo/api",
				private: true,
				dependencies: { "@repo/shared": "workspace:*" },
			},
			null,
			2,
		),
		"packages/shared/package.json": JSON.stringify(
			{ name: "@repo/shared", private: true, exports: sharedExports },
			null,
			2,
		),
	};
	for (const [relativePath, content] of Object.entries({
		...baseFiles,
		...files,
	})) {
		const absolutePath = path.join(root, relativePath);
		mkdirSync(path.dirname(absolutePath), { recursive: true });
		writeFileSync(absolutePath, `${content}\n`);
	}
	return root;
}

function context(
	root: string,
	rules: DependencyRules = defaultRules,
): ValidationContext {
	return {
		repoRoot: root,
		config: {
			version: "1.0.0",
			level: 2,
			project_name: "test",
			workspace_roots: ["apps", "packages"],
			default_workspaces: ["apps/api", "packages/shared"],
			layers: ["types", "config", "repo", "service", "runtime", "ui"],
			validation: {
				structural_tests: true,
				linters: true,
				entropy_scans: true,
				doc_freshness_days: 30,
			},
			commit_format: "conventional",
			required_files: [],
		},
		dependencyRules: rules,
		fileSizeRules: { default_limit: 500, rules: [], excluded_patterns: [] },
		namingRules: { rules: [], excluded_patterns: [], case_patterns: {} },
		forbiddenRules: { rules: [] },
	};
}

function captureLint(root: string, rules?: DependencyRules) {
	const lines: string[] = [];
	const original = console.log;
	console.log = (...args: unknown[]) => {
		lines.push(args.join(" "));
	};
	try {
		return {
			code: runLayerLint(context(root, rules)),
			output: lines.join("\n"),
		};
	} finally {
		console.log = original;
	}
}

describe("runLayerLint", () => {
	it("allows declared workspace entrypoints to remain unlayered", () => {
		const root = createRepo({
			"apps/api/src/index.ts": "export * from './runtime/index';",
			"apps/api/src/runtime/index.ts": "export const api = 'ok';",
			"packages/shared/src/index.ts": "export * from './service/greeting';",
			"packages/shared/src/service/greeting.ts":
				"export const greeting = 'hi';",
		});

		const result = captureLint(root);

		expect(result.code).toBe(0);
		expect(result.output).toContain("PASS: No layer boundary violations.");
	});

	it("fails when a workspace source file is not covered by a layer or allowlist", () => {
		const root = createRepo({
			"apps/api/src/routes/health.ts": "export const health = true;",
		});

		const result = captureLint(root);

		expect(result.code).toBe(1);
		expect(result.output).toContain(
			"UNCOVERED SOURCE FILE: apps/api/src/routes/health.ts",
		);
	});

	it("fails on cross-workspace relative imports", () => {
		const root = createRepo({
			"apps/api/src/runtime/index.ts":
				"export { greeting } from '../../../../packages/shared/src/service/greeting';",
			"packages/shared/src/service/greeting.ts":
				"export const greeting = 'hi';",
		});

		const result = captureLint(root);

		expect(result.code).toBe(1);
		expect(result.output).toContain(
			"WORKSPACE VIOLATION: apps/api/src/runtime/index.ts",
		);
		expect(result.output).toContain(
			"relative and internal-path imports must stay within apps/api",
		);
	});

	it("allows package-root and exported-subpath imports across workspaces", () => {
		const root = createRepo(
			{
				"apps/api/src/runtime/index.ts":
					"export { greeting } from '@repo/shared';\nexport { createWorkspaceGreeting } from '@repo/shared/service';",
				"packages/shared/src/index.ts":
					"export { greeting } from './service/greeting';",
				"packages/shared/src/service/greeting.ts":
					"export const greeting = 'hi';\nexport const createWorkspaceGreeting = () => 'hello';",
			},
			{
				sharedExports: {
					".": "./src/index.ts",
					"./service": "./src/service/greeting.ts",
				},
			},
		);

		const result = captureLint(root);

		expect(result.code).toBe(0);
	});

	it("fails on non-exported package subpaths", () => {
		const root = createRepo({
			"apps/api/src/runtime/index.ts":
				"export { greeting } from '@repo/shared/src/service/greeting';",
			"packages/shared/src/service/greeting.ts":
				"export const greeting = 'hi';",
		});

		const result = captureLint(root);

		expect(result.code).toBe(1);
		expect(result.output).toContain(
			"@repo/shared/src/service/greeting is not an exported entrypoint",
		);
	});
});

describe("gitHasCommits", () => {
	it("returns false for a repository with no commits", () => {
		const root = mkdtempSync(path.join(os.tmpdir(), "harness-git-state-"));
		tempRoots.push(root);
		execFileSync("git", ["init"], { cwd: root, stdio: "ignore" });

		expect(gitHasCommits(root)).toBe(false);
	});
});
