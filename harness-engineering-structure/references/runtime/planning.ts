import { readFileSync, writeFileSync } from "node:fs";
import path from "node:path";
import {
	createTaskRecord,
	defaultCommandSurface,
	normalizeTaskRecord,
} from "./planning-state";
import { hasPlaceholderContent, readJson, writeJson } from "./shared";
import { baselineDiscoveryAnswers } from "./template-baseline";
import type {
	DiscoveryState,
	HarnessConfig,
	HarnessState,
	MilestoneRecord,
	TaskRecord,
} from "./types";

export function planningReadiness(root: string): {
	productReady: boolean;
	architectureReady: boolean;
	milestones: MilestoneRecord[];
} {
	const productPath = path.join(root, "docs/product.md");
	const architecturePath = path.join(root, "docs/architecture.md");
	return {
		productReady: !hasPlaceholderContent(productPath),
		architectureReady: !hasPlaceholderContent(architecturePath),
		milestones: milestonesFromProductDoc(productPath),
	};
}

export function milestonesFromProductDoc(
	productPath: string,
): MilestoneRecord[] {
	const content = readFileSync(productPath, "utf8");
	const match = content.match(
		/^## Proposed Milestones\s*([\s\S]+?)(?=^## |Z)/m,
	);
	if (!match) return [];

	const milestones: MilestoneRecord[] = [];
	let index = 1;
	let current: MilestoneRecord | null = null;

	for (const line of match[1].split(/\r?\n/)) {
		// Top-level bullet: milestone (no leading whitespace before -)
		const topMatch = line.match(/^-\s+(?:\[ \]\s+)?(.+?)\s*$/);
		if (topMatch) {
			const title = topMatch[1].trim();
			if (!title) continue;
			current = {
				id: `M${index}`,
				title,
				goal: title,
				status: "planned",
				dependsOn: [],
				parallelEligible: true,
				affectedAreas: [],
				worktreeName: null,
				taskHints: [],
			};
			milestones.push(current);
			index += 1;
			continue;
		}

		// Indented bullet: task hint (2+ spaces before -)
		const subMatch = line.match(/^\s{2,}-\s+(?:\[ \]\s+)?(.+?)\s*$/);
		if (subMatch && current) {
			const hint = subMatch[1].trim();
			if (hint) {
				current.taskHints.push(hint);
			}
		}
	}

	return milestones;
}

const KIND_PATTERNS: Array<{ pattern: RegExp; kind: string }> = [
	{
		pattern: /\b(tests?|testing|validat\w+|verify|assert)\b/i,
		kind: "testing",
	},
	{ pattern: /\b(deploy\w*|release|publish)\b/i, kind: "deployment" },
	{ pattern: /\b(review\w*|audit|inspect)\b/i, kind: "review" },
	{
		pattern: /\b(research|investigat\w+|explor\w+|analyz\w+|design)\b/i,
		kind: "research",
	},
];

function inferKind(hint: string): string {
	for (const { pattern, kind } of KIND_PATTERNS) {
		if (pattern.test(hint)) return kind;
	}
	return "implementation";
}

const SKILLS_BY_KIND: Record<string, string[]> = {
	research: ["skills/research/SKILL.md"],
	implementation: ["skills/implementation/SKILL.md"],
	testing: ["skills/testing/SKILL.md", "skills/code-review/SKILL.md"],
	review: ["skills/code-review/SKILL.md"],
	deployment: ["skills/deployment/SKILL.md"],
};

function detectAreas(hint: string, workspaces: string[]): string[] {
	return workspaces.filter(
		(ws) => hint.includes(ws) || hint.includes(ws.split("/").pop() ?? ""),
	);
}

function tasksFromHints(
	suffix: string,
	milestone: MilestoneRecord,
	hints: string[],
	workspaces: string[],
): TaskRecord[] {
	const tasks: TaskRecord[] = [];
	let seq = 1;

	// Always start with a research task
	const researchId = `T${suffix}${String(seq).padStart(2, "0")}`;
	tasks.push(
		createTaskRecord({
			id: researchId,
			milestoneId: milestone.id,
			title: `Refine milestone design for ${milestone.title}`,
			kind: "research",
			status: "pending",
			dependsOn: [],
			affectedFilesOrAreas: [],
			requiredSkills: ["skills/research/SKILL.md"],
			validationChecks: [],
		}),
	);
	seq += 1;

	// One task per hint
	for (const hint of hints) {
		const kind = inferKind(hint);
		const id = `T${suffix}${String(seq).padStart(2, "0")}`;
		const prevId = tasks[tasks.length - 1].id;
		tasks.push(
			createTaskRecord({
				id,
				milestoneId: milestone.id,
				title: hint,
				kind,
				status: "pending",
				dependsOn: [prevId],
				affectedFilesOrAreas: detectAreas(hint, workspaces),
				requiredSkills: SKILLS_BY_KIND[kind] ?? [
					"skills/implementation/SKILL.md",
				],
				validationChecks:
					kind === "research" ? [] : ["bun run harness:validate"],
			}),
		);
		seq += 1;
	}

	// Always end with a validation task
	const valId = `T${suffix}${String(seq).padStart(2, "0")}`;
	const lastId = tasks[tasks.length - 1].id;
	tasks.push(
		createTaskRecord({
			id: valId,
			milestoneId: milestone.id,
			title: `Validate ${milestone.title}`,
			kind: "testing",
			status: "pending",
			dependsOn: [lastId],
			affectedFilesOrAreas: [],
			requiredSkills: [
				"skills/testing/SKILL.md",
				"skills/code-review/SKILL.md",
			],
			validationChecks: ["bun run harness:validate"],
		}),
	);

	return tasks;
}

function fallbackTasks(
	suffix: string,
	milestone: MilestoneRecord,
): TaskRecord[] {
	return [
		createTaskRecord({
			id: `T${suffix}01`,
			milestoneId: milestone.id,
			title: `Refine milestone design for ${milestone.title}`,
			kind: "research",
			status: "pending",
			dependsOn: [],
			affectedFilesOrAreas: [],
			requiredSkills: ["skills/research/SKILL.md"],
			validationChecks: [],
		}),
		createTaskRecord({
			id: `T${suffix}02`,
			milestoneId: milestone.id,
			title: `Implement ${milestone.title}`,
			kind: "implementation",
			status: "pending",
			dependsOn: [`T${suffix}01`],
			affectedFilesOrAreas: [],
			requiredSkills: ["skills/implementation/SKILL.md"],
			validationChecks: ["bun run harness:validate"],
		}),
		createTaskRecord({
			id: `T${suffix}03`,
			milestoneId: milestone.id,
			title: `Validate ${milestone.title}`,
			kind: "testing",
			status: "pending",
			dependsOn: [`T${suffix}02`],
			affectedFilesOrAreas: [],
			requiredSkills: [
				"skills/testing/SKILL.md",
				"skills/code-review/SKILL.md",
			],
			validationChecks: ["bun run harness:validate"],
		}),
	];
}

export function defaultTasks(
	milestones: MilestoneRecord[],
	config?: HarnessConfig,
): TaskRecord[] {
	const workspaces = config?.default_workspaces ?? [];
	return milestones.flatMap((milestone) => {
		const suffix = milestone.id.slice(1);
		if (milestone.taskHints && milestone.taskHints.length > 0) {
			return tasksFromHints(suffix, milestone, milestone.taskHints, workspaces);
		}
		return fallbackTasks(suffix, milestone);
	});
}

export function stateTemplate(projectName: string): HarnessState {
	const answered = baselineDiscoveryAnswers(projectName);
	const discovery: DiscoveryState = {
		stage: "COMPLETE",
		status: "ready_for_plan",
		currentQuestionIds: [],
		answered,
		history: [],
		readiness: {
			productReady: true,
			architectureReady: true,
			planReady: true,
		},
		lastUpdatedAt: new Date().toISOString(),
	};

	return {
		version: "1.0.0",
		projectInfo: {
			projectName,
			harnessLevel: "standard",
			runtime: "bun",
			primaryDocs: {
				product: "docs/product.md",
				architecture: "docs/architecture.md",
				progress: "docs/progress.md",
			},
			commandSurface: defaultCommandSurface(),
		},
		planning: {
			phase: "READY",
			docsReady: {
				product: true,
				architecture: true,
				backlog: false,
			},
			approvals: {
				planApproved: false,
				currentPhaseApproved: false,
			},
		},
		discovery,
		milestones: [],
		tasks: [],
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
}

export function loadState(root: string): HarnessState {
	const state = readJson<Partial<HarnessState>>(
		path.join(root, ".harness/state.json"),
	);
	if (!state.discovery) {
		const fallback = {
			...(state as HarnessState),
			discovery: stateTemplate(
				state.projectInfo?.projectName ?? "harness-template",
			).discovery,
		};
		fallback.tasks = (fallback.tasks ?? []).map(normalizeTaskRecord);
		fallback.projectInfo.commandSurface =
			fallback.projectInfo.commandSurface?.length > 0
				? [
						...new Set([
							...fallback.projectInfo.commandSurface,
							"bun run harness:evaluate",
						]),
					]
				: defaultCommandSurface();
		return fallback;
	}
	const normalized = state as HarnessState;
	normalized.tasks = (normalized.tasks ?? []).map(normalizeTaskRecord);
	normalized.projectInfo.commandSurface =
		normalized.projectInfo.commandSurface?.length > 0
			? [
					...new Set([
						...normalized.projectInfo.commandSurface,
						"bun run harness:evaluate",
					]),
				]
			: defaultCommandSurface();
	return normalized;
}

export function saveState(root: string, state: HarnessState): void {
	writeJson(path.join(root, ".harness/state.json"), state);
}

export function writeProgressDoc(
	root: string,
	milestones: MilestoneRecord[],
	tasks: TaskRecord[],
): void {
	const progress = [
		"# Delivery Progress",
		"",
		"> Generated from `bun run harness:plan`. Edit the PRD or architecture first,",
		"> then re-run planning to resync milestones and placeholder tasks.",
		"",
		"---",
		"",
		"## Planning Status",
		"",
		"| Surface | Status | Notes |",
		"|--------|--------|-------|",
		"| `docs/product.md` | Ready | PRD is complete enough to execute |",
		"| `docs/architecture.md` | Ready | Architecture is complete enough to execute |",
		"| Backlog sync | Ready | Milestones and tasks are synchronized |",
		"",
		"---",
		"",
		"## Milestones",
		"",
		"| Milestone | Goal | Status | Depends On | Parallel | Worktree |",
		"|-----------|------|--------|------------|----------|----------|",
		...milestones.map(
			(milestone) =>
				`| ${milestone.id} | ${milestone.goal} | ${milestone.status} | ${milestone.dependsOn.join(", ") || "-"} | ${milestone.parallelEligible ? "Yes" : "No"} | ${milestone.worktreeName ?? "-"} |`,
		),
		"",
		"---",
		"",
		"## Tasks",
		"",
		"| Task | Milestone | Kind | Status | Validation | Notes |",
		"|------|-----------|------|--------|------------|-------|",
		...tasks.map(
			(task) =>
				`| ${task.id} | ${task.milestoneId} | ${task.kind} | ${task.status} | ${task.validationChecks.join("<br>") || "-"} | Skills: ${task.requiredSkills.join(", ")} |`,
		),
		"",
		"---",
		"",
		"## Active Worktrees",
		"",
		"| Worktree | Milestone | Branch | Status |",
		"|----------|-----------|--------|--------|",
		"| - | - | - | No active milestone worktrees |",
		"",
		"---",
		"",
		"## Activity Log",
		"",
		`- Planning synchronized on ${new Date().toISOString()}.`,
	].join("\n");

	writeFileSync(path.join(root, "docs/progress.md"), `${progress}\n`);
}
