import { afterEach, describe, expect, it } from "bun:test";
import { existsSync, readFileSync, rmSync } from "node:fs";
import path from "node:path";
import { orchestrateTask } from "./orchestration";
import { createRepo } from "./orchestration-test-fixtures";
import { loadState, saveState } from "./planning";
import { listStateSnapshots, recoverStateSnapshot } from "./state-recovery";

const tempRoots: string[] = [];

afterEach(() => {
	for (const root of tempRoots.splice(0)) {
		rmSync(root, { recursive: true, force: true });
	}
});

describe("state recovery", () => {
	it("creates a snapshot before mutating state", () => {
		const root = createRepo(["bun --version"], tempRoots);
		orchestrateTask(root);

		const snapshots = listStateSnapshots(root);

		expect(snapshots.length).toBeGreaterThan(0);
		expect(snapshots[0]?.trigger).toBe("pre-save");
		expect(existsSync(path.join(root, snapshots[0]?.path ?? ""))).toBe(true);
	});

	it("restores the latest snapshot on demand", () => {
		const root = createRepo(["bun --version"], tempRoots);
		const original = readFileSync(
			path.join(root, ".harness/state.json"),
			"utf8",
		);
		const state = loadState(root);
		state.planning.phase = "EXECUTING";
		saveState(root, state);

		const restored = recoverStateSnapshot(root, { latest: true });
		const recovered = readFileSync(
			path.join(root, ".harness/state.json"),
			"utf8",
		);

		expect(restored?.fileName).toBeTruthy();
		expect(recovered).toBe(original);
	});
});
