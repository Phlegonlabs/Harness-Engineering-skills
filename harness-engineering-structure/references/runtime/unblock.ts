import { unblockTask } from "./orchestration";
import { repoRoot } from "./shared";

const taskArgIndex = process.argv.indexOf("--task");
const taskId =
	taskArgIndex >= 0 && process.argv.length > taskArgIndex + 1
		? process.argv[taskArgIndex + 1]
		: undefined;

if (!taskId) {
	console.error("Usage: bun run harness:unblock --task <id>");
	process.exit(1);
}

const root = repoRoot();
const task = unblockTask(taskId, root);

if (!task) {
	console.log("UNBLOCK FAILED");
	console.log(`  Task ${taskId} is not blocked or does not exist.`);
	process.exit(1);
}

console.log(
	`Unblocked task ${task.id}. Run bun run harness:orchestrate to continue.`,
);
