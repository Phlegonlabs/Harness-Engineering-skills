import { afterEach, describe, expect, it } from "bun:test";
import { rmSync } from "node:fs";
import { orchestrateTask } from "./orchestration";
import {
	createRepo,
	createRepoWithTasks,
	makeTask,
} from "./orchestration-test-fixtures";
import { buildHarnessStatus } from "./status";

const tempRoots: string[] = [];

describe("harness status", () => {
	afterEach(() => {
		for (const root of tempRoots.splice(0)) {
			rmSync(root, { recursive: true, force: true });
		}
	});
	it("reports the active task and suggested skills", () => {
		const root = createRepo(["bun --version"], tempRoots);
		orchestrateTask(root);

		const status = buildHarnessStatus(root);

		expect(status.activeTask?.id).toBe("T101");
		expect(status.activeTask?.status).toBe("in_progress");
		expect(status.suggestedSkills).toContain("skills/implementation/SKILL.md");
		expect(status.progress.inProgress).toBe(1);
	});

	it("surfaces blocked tasks when no active task can proceed", () => {
		const root = createRepoWithTasks(
			[
				makeTask({
					id: "T101",
					status: "blocked",
					stallCount: 2,
					iteration: 3,
				}),
				makeTask({ id: "T102", dependsOn: ["T101"] }),
			],
			tempRoots,
		);

		const status = buildHarnessStatus(root);

		expect(status.activeTask).toBeNull();
		expect(status.blockedTasks).toHaveLength(1);
		expect(status.nextAction).toContain("harness:unblock");
	});

	it("recommends planning when the repo is ready but has no tasks yet", () => {
		const root = createRepoWithTasks([], tempRoots);

		const status = buildHarnessStatus(root);

		expect(status.phase).toBe("PLANNING");
		expect(status.activeTask).toBeNull();
		expect(status.nextAction).toContain("harness:plan");
	});
});
