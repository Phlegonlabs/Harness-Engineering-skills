import { orchestrateTask } from "./orchestration";
import { repoRoot } from "./shared";

const result = orchestrateTask(repoRoot());

if (!result) {
	console.log("No pending tasks.");
	process.exit(0);
}

console.log("Orchestrator Status");
console.log(`  Phase: ${result.phase}`);
console.log(`  Task: ${result.task.id} — ${result.task.title}`);
console.log(`  Milestone: ${result.milestone.id}`);
console.log(`  Status: ${result.task.status}`);
console.log(`  Iteration: ${result.task.iteration}`);
console.log(`  Contract: ${result.task.artifacts.contractPath ?? "-"}`);
console.log(`  Handoff: ${result.task.artifacts.latestHandoffPath ?? "-"}`);
console.log(`  Suggested skills: ${result.skills.join(", ")}`);
console.log(`  Next action: ${result.nextAction}`);
