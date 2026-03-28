import { loadState, saveState } from "./planning";
import { ensureCleanMainWorktree, repoRoot, runPassthrough } from "./shared";

const root = repoRoot();
const milestoneId = process.argv.at(-1);
if (!milestoneId || !/^M\d+$/.test(milestoneId)) {
	console.error("Usage: bun run harness:merge-milestone -- M1");
	process.exit(1);
}

const state = loadState(root);
const milestone = state.milestones.find((entry) => entry.id === milestoneId);
const active = state.execution.activeWorktrees.find(
	(entry) => entry.milestoneId === milestoneId,
);

if (!milestone || !active) {
	console.error(`Milestone ${milestoneId} does not have an active worktree.`);
	process.exit(1);
}

if (!ensureCleanMainWorktree(root)) {
	console.error("Main worktree is not clean. Commit or stash changes first.");
	process.exit(1);
}

if (
	runPassthrough(
		"git",
		["-C", root, "merge", "--no-ff", active.branch],
		root,
	) !== 0
)
	process.exit(1);
runPassthrough(
	"git",
	["-C", root, "worktree", "remove", active.worktree, "--force"],
	root,
);
runPassthrough("git", ["-C", root, "branch", "-d", active.branch], root);

milestone.status = "complete";
milestone.worktreeName = null;
state.execution.activeMilestones = state.execution.activeMilestones.filter(
	(entry) => entry !== milestoneId,
);
state.execution.activeWorktrees = state.execution.activeWorktrees.filter(
	(entry) => entry.milestoneId !== milestoneId,
);
saveState(root, state);
console.log(`Merged milestone ${milestoneId}.`);
