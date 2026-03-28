import { evaluateTask } from "./orchestration";
import { repoRoot } from "./shared";

const taskArgIndex = process.argv.indexOf("--task");
const taskId =
	taskArgIndex >= 0 && process.argv.length > taskArgIndex + 1
		? process.argv[taskArgIndex + 1]
		: undefined;

const result = evaluateTask(taskId, repoRoot());

if (!result) {
	console.log("No active task available for evaluation.");
	process.exit(0);
}

console.log("Evaluator Status");
console.log(`  Phase: ${result.phase}`);
console.log(`  Task: ${result.task.id} — ${result.task.title}`);
console.log(`  Milestone: ${result.milestone.id}`);
console.log(`  Status: ${result.task.status}`);
console.log(`  Iteration: ${result.task.iteration}`);
console.log(`  Evaluator: ${result.task.evaluatorStatus}`);
console.log(
	`  Evaluation artifact: ${result.task.artifacts.latestEvaluationPath ?? "-"}`,
);
console.log(
	`  Handoff artifact: ${result.task.artifacts.latestHandoffPath ?? "-"}`,
);
console.log(`  Next action: ${result.nextAction}`);
