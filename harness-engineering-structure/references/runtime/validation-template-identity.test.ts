import { afterEach, describe, expect, it } from "bun:test";
import { mkdirSync, mkdtempSync, rmSync, writeFileSync } from "node:fs";
import os from "node:os";
import path from "node:path";
import type { ValidationContext } from "./types";
import { runTemplateIdentityTest } from "./validation";

const tempRoots: string[] = [];

function createRepo(files: Record<string, string>): string {
	const root = mkdtempSync(path.join(os.tmpdir(), "harness-template-id-"));
	tempRoots.push(root);
	for (const [relativePath, content] of Object.entries(files)) {
		const absolutePath = path.join(root, relativePath);
		mkdirSync(path.dirname(absolutePath), { recursive: true });
		writeFileSync(absolutePath, `${content}\n`);
	}
	return root;
}

function context(root: string, projectName: string): ValidationContext {
	return {
		repoRoot: root,
		config: {
			version: "1.0.0",
			level: 2,
			project_name: projectName,
			project_owner: "",
			workspace_roots: ["apps", "packages"],
			default_workspaces: ["apps/api", "apps/web", "packages/shared"],
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
		dependencyRules: {
			internal_import_roots: [],
			internal_import_aliases: {},
			layers: [],
		},
		fileSizeRules: { default_limit: 500, rules: [], excluded_patterns: [] },
		namingRules: { rules: [], excluded_patterns: [], case_patterns: {} },
		forbiddenRules: { rules: [] },
	};
}

function captureTemplateIdentity(root: string, projectName = "sample-project") {
	const lines: string[] = [];
	const original = console.log;
	console.log = (...args: unknown[]) => {
		lines.push(args.join(" "));
	};
	try {
		return {
			code: runTemplateIdentityTest(context(root, projectName)),
			output: lines.join("\n"),
		};
	} finally {
		console.log = original;
	}
}

describe("runTemplateIdentityTest", () => {
	afterEach(() => {
		for (const root of tempRoots.splice(0)) {
			rmSync(root, { recursive: true, force: true });
		}
	});
	it("skips the scan for the pre-init template scaffold", () => {
		const root = createRepo({
			"README.md": "# Harness Engineering Repo Template",
		});

		const result = captureTemplateIdentity(root, "harness-template");

		expect(result.code).toBe(0);
		expect(result.output).toContain("pre-init scaffold");
	});

	it("fails when initialized project-facing files still contain template markers", () => {
		const root = createRepo({
			"README.md": "# Sample Project",
			".env.example": "PROJECT_NAME=sample-project",
			".github/CODEOWNERS": "* @your-org/engineering",
			"apps/api/AGENTS.md": "Import from @harness-template/shared.",
			"apps/web/AGENTS.md": "# web",
			"packages/shared/AGENTS.md": "# shared",
			"docs/product.md": "# Product",
			"docs/architecture.md": "# Architecture",
			"docs/progress.md": "# Progress",
			"docs/internal/observability.md": "Use @sample-project/shared.",
			"harness/rules/forbidden-patterns.json": '{"rules":[]}',
			LICENSE: "sample-project contributors",
			"package.json": '{"name":"sample-project"}',
			"packages/shared/package.json": '{"name":"@sample-project/shared"}',
		});

		const result = captureTemplateIdentity(root);

		expect(result.code).toBe(1);
		expect(result.output).toContain(
			"TEMPLATE IDENTITY LEAK: .github/CODEOWNERS",
		);
		expect(result.output).toContain(
			"TEMPLATE IDENTITY LEAK: apps/api/AGENTS.md",
		);
	});

	it("passes when initialized project-facing files are fully personalized", () => {
		const root = createRepo({
			"README.md": "# Sample Project",
			".env.example": "PROJECT_NAME=sample-project",
			".github/CODEOWNERS": "* @acme/engineering",
			"apps/api/AGENTS.md": "Import from @sample-project/shared.",
			"apps/web/AGENTS.md": "Import from @sample-project/shared.",
			"packages/shared/AGENTS.md":
				"Cross-workspace imports go through @sample-project/shared.",
			"docs/product.md": "# Product",
			"docs/architecture.md": "# Architecture",
			"docs/progress.md": "# Progress",
			"docs/internal/observability.md": "Use @sample-project/shared.",
			"harness/rules/forbidden-patterns.json":
				'{"rules":[{"message":"Use @sample-project/shared instead."}]}',
			LICENSE: "sample-project contributors",
			"package.json": '{"name":"sample-project"}',
			"packages/shared/package.json": '{"name":"@sample-project/shared"}',
		});

		const result = captureTemplateIdentity(root);

		expect(result.code).toBe(0);
		expect(result.output).toContain("No template identity leaks");
	});
});
