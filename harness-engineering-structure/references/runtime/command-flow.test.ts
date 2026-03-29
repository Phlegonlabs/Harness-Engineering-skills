import { describe, expect, it, setDefaultTimeout } from "bun:test";
import { existsSync, readFileSync } from "node:fs";
import path from "node:path";
import { repoRoot } from "./shared";
import {
	answerDiscovery,
	cloneRepo,
	commitAll,
	expectPersistentBoot,
	firstTaskId,
	markMilestoneDone,
	readState,
	runCommand,
	worktreePath,
} from "./test-support";

const root = repoRoot();
const describeCommandFlow =
	process.env.HARNESS_SKIP_COMMAND_FLOW === "1" ? describe.skip : describe;
setDefaultTimeout(90000);

describeCommandFlow("command flow", () => {
	it("keeps the pre-init command surface honest", () => {
		const tempRoot = cloneRepo(root);
		for (const hook of ["pre-commit", "commit-msg", "pre-push"]) {
			expect(existsSync(path.join(tempRoot, ".git/hooks", hook))).toBe(true);
		}
		for (const command of [
			["bun", "run", "harness:doctor"],
			["bun", "run", "harness:lint"],
			["bun", "run", "harness:structural"],
			["bun", "run", "harness:entropy"],
			["bun", "run", "harness:validate"],
			["bun", "run", "harness:self-review"],
			["bun", "run", "harness:status", "--json"],
			["bun", "run", "harness:state-recover", "--list"],
			["bun", "run", "build"],
			["bun", "run", "lint"],
			["bun", "run", "lint:root"],
			["bun", "run", "lint:biome"],
			["bun", "run", "typecheck"],
			["bun", "run", "typecheck:root"],
			["bun", "run", "test"],
			["bun", "run", "check"],
			["bun", "run", "format:check"],
			["bun", "run", "harness:discover"],
		] as const) {
			expect(runCommand(tempRoot, command).code).toBe(0);
		}

		const plan = runCommand(tempRoot, ["bun", "run", "harness:plan"]);
		expect(plan.code).toBe(1);
		expect(plan.stdout).toContain("PLAN BLOCKED");

		const orchestrate = runCommand(tempRoot, [
			"bun",
			"run",
			"harness:orchestrate",
		]);
		expect(orchestrate.code).toBe(1);
		expect(orchestrate.stdout).toContain("ORCHESTRATE BLOCKED");

		const evaluate = runCommand(tempRoot, ["bun", "run", "harness:evaluate"]);
		expect(evaluate.code).toBe(1);
		expect(evaluate.stdout).toContain("EVALUATE BLOCKED");
	});

	it("initializes without an owner and still validates the ready baseline", () => {
		const tempRoot = cloneRepo(root);
		expect(
			runCommand(tempRoot, [
				"bun",
				"run",
				"harness:init",
				"--",
				"sample-project",
			]).code,
		).toBe(0);

		const status = JSON.parse(
			runCommand(tempRoot, ["bun", "run", "harness:status", "--json"]).stdout,
		) as { phase: string; nextAction: string };

		expect(status.phase).toBe("READY");
		expect(status.nextAction).toContain("harness:plan");
		expect(
			readFileSync(path.join(tempRoot, ".github/CODEOWNERS"), "utf8"),
		).not.toContain("@your-org/engineering");
		expect(
			readFileSync(path.join(tempRoot, "README.md"), "utf8"),
		).not.toContain("@your-org/engineering");
		expect(runCommand(tempRoot, ["bun", "run", "harness:validate"]).code).toBe(
			0,
		);
	});

	it("supports the full post-init root and workspace command surface", async () => {
		const tempRoot = cloneRepo(root);
		expect(
			runCommand(tempRoot, [
				"bun",
				"run",
				"harness:init",
				"--",
				"sample-project",
				"--owner",
				"@acme/engineering",
			]).code,
		).toBe(0);
		expect(
			readFileSync(path.join(tempRoot, ".github/CODEOWNERS"), "utf8"),
		).toContain("@acme/engineering");
		expect(
			readFileSync(path.join(tempRoot, "apps/api/AGENTS.md"), "utf8"),
		).toContain("@sample-project/shared");
		expect(
			readFileSync(
				path.join(tempRoot, "docs/internal/observability.md"),
				"utf8",
			),
		).toContain("@sample-project/shared");
		expect(
			readFileSync(
				path.join(tempRoot, "harness/rules/forbidden-patterns.json"),
				"utf8",
			),
		).toContain("@sample-project/shared");
		expect(
			runCommand(tempRoot, ["bun", "run", "harness:install-hooks"]).code,
		).toBe(0);
		expect(runCommand(tempRoot, ["bun", "run", "format"]).code).toBe(0);
		expect(runCommand(tempRoot, ["bun", "run", "format:check"]).code).toBe(0);
		expect(runCommand(tempRoot, ["bun", "run", "check"]).code).toBe(0);
		expect(runCommand(tempRoot, ["bun", "run", "harness:plan"]).code).toBe(0);
		expect(
			runCommand(tempRoot, ["bun", "run", "harness:status", "--json"]).code,
		).toBe(0);
		expect(runCommand(tempRoot, ["bun", "run", "check"]).code).toBe(0);
		expect(runCommand(tempRoot, ["bun", "run", "format:check"]).code).toBe(0);
		expect(
			runCommand(tempRoot, ["bun", "run", "harness:orchestrate"]).code,
		).toBe(0);
		expect(
			runCommand(tempRoot, [
				"bun",
				"run",
				"harness:evaluate",
				"--task",
				firstTaskId(tempRoot),
			]).code,
		).toBe(0);
		expect(
			runCommand(tempRoot, ["bun", "run", "harness:state-recover", "--list"])
				.code,
		).toBe(0);
		expect(runCommand(tempRoot, ["bun", "run", "check"]).code).toBe(0);
		expect(
			runCommand(tempRoot, ["bun", "run", "harness:validate:full"]).code,
		).toBe(0);

		for (const workspace of [
			"apps/api",
			"apps/web",
			"packages/shared",
		] as const) {
			const workspaceRoot = path.join(tempRoot, workspace);
			expect(runCommand(workspaceRoot, ["bun", "run", "build"]).code).toBe(0);
			expect(runCommand(workspaceRoot, ["bun", "run", "lint"]).code).toBe(0);
			expect(runCommand(workspaceRoot, ["bun", "run", "typecheck"]).code).toBe(
				0,
			);
			expect(runCommand(workspaceRoot, ["bun", "run", "test"]).code).toBe(0);
		}

		await expectPersistentBoot(tempRoot, ["bun", "run", "dev"]);
		await expectPersistentBoot(path.join(tempRoot, "apps/api"), [
			"bun",
			"run",
			"dev",
		]);
		await expectPersistentBoot(path.join(tempRoot, "apps/web"), [
			"bun",
			"run",
			"dev",
		]);
	});

	it("supports the discovery path before planning", () => {
		const tempRoot = cloneRepo(root);
		expect(
			runCommand(tempRoot, ["bun", "run", "harness:discover", "--reset"]).code,
		).toBe(0);
		expect(answerDiscovery(tempRoot, "sample-project").code).toBe(0);
		expect(runCommand(tempRoot, ["bun", "run", "harness:plan"]).code).toBe(0);
	});

	it("writes profile-specific layer rules during init", () => {
		const tempRoot = cloneRepo(root);
		expect(
			runCommand(tempRoot, [
				"bun",
				"run",
				"harness:init",
				"--",
				"sample-cli",
				"--profile",
				"cli",
			]).code,
		).toBe(0);

		const config = JSON.parse(
			readFileSync(path.join(tempRoot, "harness/config.json"), "utf8"),
		) as { layers: string[] };
		const rules = JSON.parse(
			readFileSync(
				path.join(tempRoot, "harness/rules/dependency-layers.json"),
				"utf8",
			),
		) as { layers: Array<{ name: string }> };

		expect(config.layers).toEqual(["types", "config", "service", "runtime"]);
		expect(rules.layers.map((layer) => layer.name)).toEqual([
			"types",
			"config",
			"service",
			"runtime",
		]);
	});

	it("dispatches and merges a completed milestone through a worktree", () => {
		const tempRoot = cloneRepo(root);
		expect(
			runCommand(tempRoot, [
				"bun",
				"run",
				"harness:init",
				"--",
				"sample-project",
			]).code,
		).toBe(0);
		expect(runCommand(tempRoot, ["bun", "run", "harness:plan"]).code).toBe(0);
		expect(runCommand(tempRoot, ["bun", "run", "check"]).code).toBe(0);
		commitAll(tempRoot, "chore(template): initialize sample project");

		expect(
			runCommand(tempRoot, [
				"bun",
				"run",
				"harness:parallel-dispatch",
				"--",
				"--apply",
			]).code,
		).toBe(0);
		commitAll(tempRoot, "harness(dispatch): record active worktrees");
		const dispatchedState = readState(tempRoot);
		const activeWorktree = dispatchedState.execution.activeWorktrees.find(
			(entry) => entry.milestoneId === "M1",
		);
		expect(activeWorktree).toBeTruthy();

		const milestoneRoot = worktreePath(
			tempRoot,
			activeWorktree?.worktree ?? "",
		);
		markMilestoneDone(milestoneRoot, "M1");
		expect(runCommand(milestoneRoot, ["bun", "run", "format"]).code).toBe(0);
		expect(runCommand(milestoneRoot, ["bun", "run", "check"]).code).toBe(0);
		commitAll(milestoneRoot, "harness(m1): complete milestone");

		expect(
			runCommand(tempRoot, [
				"bun",
				"run",
				"harness:merge-milestone",
				"--",
				"M1",
			]).code,
		).toBe(0);
		const mergedState = readState(tempRoot);
		expect(
			mergedState.milestones.find((milestone) => milestone.id === "M1")?.status,
		).toBe("complete");
		expect(
			mergedState.execution.activeWorktrees.some(
				(entry) => entry.milestoneId === "M1",
			),
		).toBe(false);
	});
});
