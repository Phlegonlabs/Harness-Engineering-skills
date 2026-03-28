import { mkdirSync, writeFileSync } from "node:fs";
import path from "node:path";
import { repoRelative, writeJson } from "./shared";
import type {
	MilestoneRecord,
	TaskContractArtifact,
	TaskEvaluationArtifact,
	TaskHandoffArtifact,
	TaskRecord,
} from "./types";

function ensureArtifactDir(root: string, dirname: string): string {
	const target = path.join(root, ".harness", dirname);
	mkdirSync(target, { recursive: true });
	return target;
}

export function taskContractPath(root: string, task: TaskRecord): string {
	return path.join(ensureArtifactDir(root, "contracts"), `${task.id}.md`);
}

export function taskEvaluationPath(
	root: string,
	task: TaskRecord,
	iteration: number,
): string {
	return path.join(
		ensureArtifactDir(root, "evaluations"),
		`${task.id}-i${String(iteration).padStart(2, "0")}.json`,
	);
}

export function taskHandoffPath(
	root: string,
	task: TaskRecord,
	iteration: number,
): string {
	return path.join(
		ensureArtifactDir(root, "handoffs"),
		`${task.id}-i${String(iteration).padStart(2, "0")}.json`,
	);
}

export function buildTaskContract(
	task: TaskRecord,
	milestone: MilestoneRecord,
	now: string,
): TaskContractArtifact {
	const affectedAreas =
		task.affectedFilesOrAreas.length > 0
			? task.affectedFilesOrAreas
			: ["TBD during execution"];
	const validationChecks =
		task.validationChecks.length > 0
			? task.validationChecks
			: ["No automated validation configured"];

	return {
		version: "1.0.0",
		taskId: task.id,
		milestoneId: task.milestoneId,
		title: task.title,
		kind: task.kind,
		goal: milestone.goal,
		affectedAreas,
		deliverables: [
			`Complete: ${task.title}`,
			"Keep milestone scope explicit and avoid unrelated edits",
			"Produce a clean evaluator outcome before handoff",
		],
		outOfScope: [
			`Do not modify unrelated milestones while working on ${task.id}`,
			"Do not bypass harness validation or rule checks",
			"Do not change harness/rules without an ADR and explicit approval",
		],
		validationChecks,
		createdAt: now,
		approvedAt: now,
	};
}

export function writeTaskContract(
	root: string,
	task: TaskRecord,
	milestone: MilestoneRecord,
	now: string,
): string {
	const artifact = buildTaskContract(task, milestone, now);
	const contract = [
		`# Task Contract: ${artifact.taskId}`,
		"",
		`- Milestone: ${artifact.milestoneId} — ${milestone.title}`,
		`- Kind: ${artifact.kind}`,
		`- Created: ${artifact.createdAt}`,
		`- Approved: ${artifact.approvedAt ?? "pending"}`,
		"",
		"## Goal",
		"",
		artifact.goal,
		"",
		"## Task",
		"",
		artifact.title,
		"",
		"## Affected Areas",
		"",
		...artifact.affectedAreas.map((area) => `- ${area}`),
		"",
		"## Deliverables",
		"",
		...artifact.deliverables.map((item) => `- ${item}`),
		"",
		"## Validation Checks",
		"",
		...artifact.validationChecks.map((item) => `- ${item}`),
		"",
		"## Out Of Scope",
		"",
		...artifact.outOfScope.map((item) => `- ${item}`),
		"",
	].join("\n");

	const target = taskContractPath(root, task);
	writeFileSync(target, `${contract}\n`);
	return repoRelative(root, target);
}

export function writeTaskEvaluation(
	root: string,
	task: TaskRecord,
	artifact: TaskEvaluationArtifact,
): string {
	const target = taskEvaluationPath(root, task, artifact.iteration);
	writeJson(target, artifact);
	return repoRelative(root, target);
}

export function writeTaskHandoff(
	root: string,
	task: TaskRecord,
	artifact: TaskHandoffArtifact,
): string {
	const target = taskHandoffPath(root, task, artifact.iteration);
	writeJson(target, artifact);
	return repoRelative(root, target);
}
