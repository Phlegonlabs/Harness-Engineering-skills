import { repoRoot, run } from "./shared";

function changedFiles(root: string): string[] {
	const staged = run(
		"git",
		["-C", root, "diff", "--cached", "--name-only"],
		root,
	);
	const workingTree = (() => {
		try {
			return run("git", ["-C", root, "diff", "--name-only", "HEAD"], root);
		} catch {
			return "";
		}
	})();
	const untracked = run(
		["git"][0],
		["-C", root, "ls-files", "--others", "--exclude-standard"],
		root,
	);
	const combined = [
		...staged.split(/\r?\n/),
		...workingTree.split(/\r?\n/),
		...untracked.split(/\r?\n/),
	]
		.map((value) => value.trim())
		.filter(Boolean);
	if (combined.length > 0) {
		return [...new Set(combined)];
	}

	return [];
}

function hasMatch(files: string[], pattern: RegExp): boolean {
	return files.some((file) => pattern.test(file));
}

const root = repoRoot();
const files = changedFiles(root);

console.log("harness self-review");
console.log("════════════════════════════════════════════");

if (files.length === 0) {
	console.log("INFO: No staged or working-tree changes detected.");
	process.exit(0);
}

const sourceChanged = hasMatch(files, /^(apps|packages)\/.+/);
const docsChanged = hasMatch(
	files,
	/^docs\/|(^|\/)AGENTS\.md$|(^|\/)(CODEX|CLAUDE)\.md$/,
);
const testsChanged = hasMatch(files, /\.(test|spec)\.[cm]?[jt]sx?$/);
const architectureDocsChanged = hasMatch(
	files,
	/^docs\/architecture\.md$|^docs\/decisions\/.+\.md$/,
);
const workflowChanged = hasMatch(files, /^\.github\/workflows\/.+\.ya?ml$/);
const rulesChanged = hasMatch(files, /^harness\/rules\/.+\.json$/);

console.log("Changed files:");
for (const file of files) {
	console.log(`- ${file}`);
}

console.log("");
console.log("Checklist:");
console.log(
	sourceChanged
		? "- Architecture consistency: changed code still needs a layer-model review."
		: "- Architecture consistency: no source-layer changes detected.",
);
console.log(
	testsChanged
		? "- Testing coverage: matching test changes detected."
		: "- Testing coverage: no test-file changes detected.",
);
console.log(
	docsChanged
		? "- Documentation sync: documentation changed alongside the code."
		: "- Documentation sync: no doc changes detected.",
);
console.log(
	architectureDocsChanged
		? "- Architecture decisions: architecture or ADR docs changed."
		: "- Architecture decisions: no architecture or ADR updates detected.",
);
console.log(
	workflowChanged || rulesChanged
		? "- Approval boundaries: workflow or rule changes are present; confirm prior approval."
		: "- Approval boundaries: no workflow or harness rule changes detected.",
);

const warnings: string[] = [];
if (sourceChanged && !testsChanged) {
	warnings.push(
		"Source files changed without matching test-file changes. Confirm coverage is still adequate.",
	);
}
if (sourceChanged && !docsChanged) {
	warnings.push(
		"Source files changed without documentation updates. Confirm no docs drift was introduced.",
	);
}
if ((workflowChanged || rulesChanged) && !docsChanged) {
	warnings.push(
		"Workflow or rule changes were made without doc updates. Confirm the operator docs still match runtime behavior.",
	);
}

console.log("");
if (warnings.length === 0) {
	console.log("PASS: Self-review checklist is clear.");
	process.exit(0);
}

console.log("WARN:");
for (const warning of warnings) {
	console.log(`- ${warning}`);
}
