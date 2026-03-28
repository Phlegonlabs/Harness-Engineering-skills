import { existsSync, mkdirSync } from "node:fs";
import path from "node:path";
import { loadState, saveState } from "./planning";
import { repoRoot, runPassthrough, slugify } from "./shared";

const root = repoRoot();
const apply = process.argv.includes("--apply");
const maxArg = process.argv.find((value) => value.startsWith("--max="));
const max = maxArg ? Number(maxArg.split("=")[1]) : 2;
const state = loadState(root);
const active = new Set(state.execution.activeMilestones);

const eligible = state.milestones.filter(
	(milestone) =>
		milestone.status === "planned" &&
		milestone.parallelEligible &&
		!active.has(milestone.id),
);
console.log(`Eligible milestones: ${eligible.length}`);
eligible.forEach((milestone) => {
	console.log(`  ${milestone.id}: ${milestone.title}`);
});

if (!apply) process.exit(0);

mkdirSync(path.join(root, ".worktrees"), { recursive: true });
for (const milestone of eligible.slice(0, max)) {
	const branch = `milestone/${milestone.id.toLowerCase()}-${slugify(milestone.title)}`;
	const worktreePath = path.join(
		root,
		".worktrees",
		milestone.id.toLowerCase(),
	);
	const branchExists =
		runPassthrough(
			"git",
			["-C", root, "rev-parse", "--verify", branch],
			root,
		) === 0;
	if (!branchExists) {
		if (
			runPassthrough(
				"git",
				["-C", root, "worktree", "add", "-b", branch, worktreePath, "HEAD"],
				root,
			) !== 0
		)
			process.exit(1);
	} else if (!existsSync(worktreePath)) {
		if (
			runPassthrough(
				"git",
				["-C", root, "worktree", "add", worktreePath, branch],
				root,
			) !== 0
		)
			process.exit(1);
	}

	milestone.status = "active";
	milestone.worktreeName = `.worktrees/${milestone.id.toLowerCase()}`;
	state.execution.activeMilestones.push(milestone.id);
	state.execution.activeWorktrees.push({
		milestoneId: milestone.id,
		worktree: milestone.worktreeName,
		branch,
		status: "active",
	});
	console.log(`Dispatched ${milestone.id} -> ${milestone.worktreeName}`);
}

saveState(root, state);
