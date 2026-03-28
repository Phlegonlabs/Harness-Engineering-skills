import { afterEach, describe, expect, it } from "bun:test";
import {
	existsSync,
	mkdirSync,
	mkdtempSync,
	rmSync,
	writeFileSync,
} from "node:fs";
import os from "node:os";
import path from "node:path";
import { evaluateTask, orchestrateTask } from "./orchestration";
import { loadState } from "./planning";
import type { HarnessState } from "./types";

const tempRoots: string[] = [];

afterEach(() => {
	for (const root of tempRoots.splice(0)) {
		rmSync(root, { recursive: true, force: true });
	}
});

function createRepo(validationChecks: string[]): string {
	const root = mkdtempSync(path.join(os.tmpdir(), "harness-orchestration-"));
	tempRoots.push(root);

	const state: HarnessState = {
		version: "1.0.0",
		projectInfo: {
			projectName: "test-project",
			harnessLevel: "standard",
			runtime: "bun",
			primaryDocs: {
				product: "docs/product.md",
				architecture: "docs/architecture.md",
				progress: "docs/progress.md",
			},
			commandSurface: [],
		},
		planning: {
			phase: "PLANNING",
			docsReady: { product: true, architecture: true, backlog: true },
			approvals: { planApproved: false, currentPhaseApproved: false },
		},
		discovery: {
			stage: "COMPLETE",
			status: "ready_for_plan",
			currentQuestionIds: [],
			answered: {},
			history: [],
			readiness: {
				productReady: true,
				architectureReady: true,
				planReady: true,
			},
			lastUpdatedAt: new Date().toISOString(),
		},
		milestones: [
			{
				id: "M1",
				title: "Test milestone",
				goal: "Test milestone goal",
				status: "planned",
				dependsOn: [],
				parallelEligible: true,
				affectedAreas: [],
				worktreeName: null,
				taskHints: [],
			},
		],
		tasks: [
			{
				id: "T101",
				milestoneId: "M1",
				title: "Implement the test feature",
				kind: "implementation",
				status: "pending",
				dependsOn: [],
				affectedFilesOrAreas: ["apps/api"],
				requiredSkills: ["skills/implementation/SKILL.md"],
				validationChecks,
				iteration: 0,
				contractStatus: "missing",
				evaluatorStatus: "pending",
				stallCount: 0,
				lastCheckpointAt: null,
				artifacts: {
					contractPath: null,
					latestEvaluationPath: null,
					latestHandoffPath: null,
				},
			},
		],
		execution: {
			activeMilestones: [],
			activeWorktrees: [],
			maxParallelMilestones: 2,
		},
		skills: {
			registry: "harness/skills/registry.json",
			progressiveDisclosure: true,
			loaded: [],
		},
	};

	const files: Record<string, string> = {
		".harness/state.json": `${JSON.stringify(state, null, "\t")}\n`,
		"harness/skills/registry.json": `${JSON.stringify(
			{
				strategy: "test",
				phases: { EXECUTING: ["skills/implementation/SKILL.md"] },
				taskKinds: { implementation: ["skills/implementation/SKILL.md"] },
			},
			null,
			2,
		)}\n`,
	};

	for (const [relativePath, content] of Object.entries(files)) {
		const absolutePath = path.join(root, relativePath);
		mkdirSync(path.dirname(absolutePath), { recursive: true });
		writeFileSync(absolutePath, content);
	}

	return root;
}

describe("orchestration lifecycle", () => {
	it("prepares pending tasks with a contract and handoff artifact", () => {
		const root = createRepo(["bun --version"]);

		const result = orchestrateTask(root);
		const state = loadState(root);
		const task = state.tasks[0];

		expect(result?.task.id).toBe("T101");
		expect(task.status).toBe("in_progress");
		expect(task.iteration).toBe(1);
		expect(task.contractStatus).toBe("approved");
		expect(task.artifacts.contractPath).toBeTruthy();
		expect(task.artifacts.latestHandoffPath).toBeTruthy();
		expect(existsSync(path.join(root, task.artifacts.contractPath ?? ""))).toBe(
			true,
		);
		expect(
			existsSync(path.join(root, task.artifacts.latestHandoffPath ?? "")),
		).toBe(true);
	});

	it("marks tasks done when evaluator checks pass", () => {
		const root = createRepo(["bun --version"]);
		orchestrateTask(root);

		const result = evaluateTask("T101", root);
		const state = loadState(root);
		const task = state.tasks[0];

		expect(result?.task.id).toBe("T101");
		expect(task.status).toBe("done");
		expect(task.evaluatorStatus).toBe("passed");
		expect(task.artifacts.latestEvaluationPath).toBeTruthy();
		expect(
			existsSync(path.join(root, task.artifacts.latestEvaluationPath ?? "")),
		).toBe(true);
	});

	it("blocks tasks after repeated evaluator failures", () => {
		const root = createRepo(['node -e "process.exit(1)"']);
		orchestrateTask(root);

		const first = evaluateTask("T101", root);
		const second = evaluateTask("T101", root);
		const state = loadState(root);
		const task = state.tasks[0];

		expect(first?.task.evaluatorStatus).toBe("failed");
		expect(second?.task.evaluatorStatus).toBe("failed");
		expect(task.status).toBe("blocked");
		expect(task.stallCount).toBe(2);
	});
});
