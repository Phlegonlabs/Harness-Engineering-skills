import path from "node:path";
import {
	defaultTasks,
	loadState,
	planningReadiness,
	saveState,
	writeProgressDoc,
} from "./planning";
import { defaultCommandSurface } from "./planning-state";
import { readJson, repoRoot } from "./shared";
import type { HarnessConfig } from "./types";

const root = repoRoot();
const readiness = planningReadiness(root);

if (
	!readiness.productReady ||
	!readiness.architectureReady ||
	readiness.milestones.length === 0
) {
	console.log("PLAN BLOCKED");
	console.log(`  Product ready: ${readiness.productReady}`);
	console.log(`  Architecture ready: ${readiness.architectureReady}`);
	console.log(`  Milestones listed: ${readiness.milestones.length > 0}`);
	process.exit(1);
}

const config = readJson<HarnessConfig>(path.join(root, "harness/config.json"));
const state = loadState(root);
const tasks = defaultTasks(readiness.milestones, config);

state.projectInfo.projectName = config.project_name;
state.projectInfo.runtime = "bun";
state.projectInfo.commandSurface = defaultCommandSurface();
state.planning.phase = "PLANNING";
state.planning.docsReady = { product: true, architecture: true, backlog: true };
state.milestones = readiness.milestones;
state.tasks = tasks;
saveState(root, state);
writeProgressDoc(root, readiness.milestones, tasks);
console.log("PASS: Planning surfaces synchronized.");
