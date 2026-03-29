import { loadState } from "./planning";
import { repoRoot } from "./shared";
import type {
	HarnessProgressSummary,
	HarnessState,
	HarnessStatusSnapshot,
	HarnessTaskSummary,
	TaskRecord,
} from "./types";

const MAX_TASK_ITERATIONS = 5;

function dependenciesMet(task: TaskRecord, tasks: TaskRecord[]): boolean {
	return task.dependsOn.every((dependencyId) => {
		const dependency = tasks.find((entry) => entry.id === dependencyId);
		return dependency?.status === "done";
	});
}

function toTaskSummary(task: TaskRecord): HarnessTaskSummary {
	return {
		id: task.id,
		title: task.title,
		kind: task.kind,
		status: task.status,
		iteration: task.iteration,
		maxIterations: MAX_TASK_ITERATIONS,
		stallCount: task.stallCount,
		milestoneId: task.milestoneId,
		contractPath: task.artifacts.contractPath,
		latestEvaluationPath: task.artifacts.latestEvaluationPath,
		latestHandoffPath: task.artifacts.latestHandoffPath,
		requiredSkills: task.requiredSkills,
	};
}

function activeTask(state: HarnessState): TaskRecord | null {
	for (const status of [
		"evaluation_pending",
		"in_progress",
		"pending",
	] as const) {
		const match = state.tasks.find(
			(task) => task.status === status && dependenciesMet(task, state.tasks),
		);
		if (match) return match;
	}
	return null;
}

function progress(state: HarnessState): HarnessProgressSummary {
	return {
		totalTasks: state.tasks.length,
		pending: state.tasks.filter((task) => task.status === "pending").length,
		inProgress: state.tasks.filter((task) => task.status === "in_progress")
			.length,
		evaluationPending: state.tasks.filter(
			(task) => task.status === "evaluation_pending",
		).length,
		blocked: state.tasks.filter((task) => task.status === "blocked").length,
		done: state.tasks.filter((task) => task.status === "done").length,
		totalMilestones: state.milestones.length,
		activeMilestones: state.milestones.filter(
			(milestone) => milestone.status === "active",
		).length,
		completedMilestones: state.milestones.filter(
			(milestone) => milestone.status === "complete",
		).length,
	};
}

function nextAction(state: HarnessState, active: TaskRecord | null): string {
	if (state.tasks.length === 0 && !state.discovery.readiness.planReady) {
		return "Run bun run harness:init -- <name> or complete discovery before planning.";
	}
	if (state.tasks.length === 0) {
		return "Run bun run harness:plan to materialize the backlog.";
	}
	if (active?.status === "pending" || active?.status === "in_progress") {
		return `Implement ${active.id}, then run bun run harness:evaluate --task ${active.id}.`;
	}
	if (active?.status === "evaluation_pending") {
		return `Run bun run harness:evaluate --task ${active.id} to complete evaluation.`;
	}
	if (state.tasks.some((task) => task.status === "blocked")) {
		return "Inspect the latest evaluation artifact, fix the blocker, then run bun run harness:unblock --task <id>.";
	}
	return "All current tasks are complete. Run bun run harness:plan after updating docs to refresh the backlog.";
}

function normalizedPhase(state: HarnessState): string {
	if (state.tasks.length === 0 && !state.discovery.readiness.planReady) {
		return "DISCOVERY";
	}
	return state.planning.phase;
}

export function buildHarnessStatus(
	root: string = repoRoot(),
): HarnessStatusSnapshot {
	const state = loadState(root);
	const currentTask = activeTask(state);
	return {
		projectName: state.projectInfo.projectName,
		phase: normalizedPhase(state),
		activeTask: currentTask ? toTaskSummary(currentTask) : null,
		blockedTasks: state.tasks
			.filter((task) => task.status === "blocked")
			.map(toTaskSummary),
		suggestedSkills: currentTask
			? [...new Set([...state.skills.loaded, ...currentTask.requiredSkills])]
			: [...state.skills.loaded],
		nextAction: nextAction(state, currentTask),
		validationStatus: "unknown",
		progress: progress(state),
		activeWorktrees: state.execution.activeWorktrees,
		discovery: state.discovery.readiness,
	};
}

function renderSummary(status: HarnessStatusSnapshot): string {
	const lines = [
		"Harness Status",
		`  Project: ${status.projectName}`,
		`  Phase: ${status.phase}`,
		`  Tasks: ${status.progress.done}/${status.progress.totalTasks} done, ${status.progress.blocked} blocked`,
		`  Milestones: ${status.progress.completedMilestones}/${status.progress.totalMilestones} complete`,
	];
	if (status.activeTask) {
		lines.push(
			`  Active: ${status.activeTask.id} — ${status.activeTask.title}`,
			`  Kind: ${status.activeTask.kind} | Status: ${status.activeTask.status} | Iteration: ${status.activeTask.iteration}/${status.activeTask.maxIterations} | Stalls: ${status.activeTask.stallCount}`,
			`  Contract: ${status.activeTask.contractPath ?? "-"}`,
			`  Evaluation: ${status.activeTask.latestEvaluationPath ?? "-"}`,
			`  Handoff: ${status.activeTask.latestHandoffPath ?? "-"}`,
		);
	}
	if (status.blockedTasks.length > 0) {
		lines.push("  Blocked:");
		for (const task of status.blockedTasks) {
			lines.push(`    ${task.id} — ${task.title}`);
		}
	}
	if (status.suggestedSkills.length > 0) {
		lines.push(`  Suggested skills: ${status.suggestedSkills.join(", ")}`);
	}
	lines.push(`  Next action: ${status.nextAction}`);
	return lines.join("\n");
}

if (import.meta.main) {
	const args = process.argv.slice(2);
	const root = repoRoot();
	const status = buildHarnessStatus(root);

	if (args.includes("--json")) {
		console.log(JSON.stringify(status, null, 2));
		process.exit(0);
	}

	console.log(renderSummary(status));
}
