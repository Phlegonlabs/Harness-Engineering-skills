import { readFileSync } from "node:fs";
import path from "node:path";
import { trackedFiles } from "./shared";
import type { ValidationContext } from "./types";

export function runDriftScan(context: ValidationContext): number {
	let warnings = 0;
	for (const [relativePath, token] of [
		["AGENTS.md", "agent-entry.md"],
		["CLAUDE.md", "agent-entry.md"],
		["AGENTS.md", "orchestrator-workflow.md"],
		["CLAUDE.md", "orchestrator-workflow.md"],
	] as const) {
		if (
			!readFileSync(path.join(context.repoRoot, relativePath), "utf8").includes(
				token,
			)
		) {
			warnings += 1;
			console.log(`DRIFT: ${relativePath} is missing reference ${token}.`);
		}
	}
	console.log(
		warnings > 0
			? `WARN: ${warnings} drift warning(s).`
			: "PASS: No drift detected.",
	);
	return 0;
}

export function runOrphanScan(context: ValidationContext): number {
	let warnings = 0;
	const docs = trackedFiles(context.repoRoot).filter(
		(file) =>
			/^docs\/.+\.md$/.test(file) && !file.startsWith("docs/templates/"),
	);
	const markdown = trackedFiles(context.repoRoot).filter((file) =>
		file.endsWith(".md"),
	);
	for (const relativePath of docs) {
		const basename = path.basename(relativePath);
		const referenced = markdown.some((candidate) => {
			if (candidate === relativePath) return false;
			const content = readFileSync(
				path.join(context.repoRoot, candidate),
				"utf8",
			);
			return content.includes(relativePath) || content.includes(basename);
		});
		if (!referenced) {
			warnings += 1;
			console.log(`ORPHAN: ${relativePath}`);
		}
	}
	console.log(
		warnings > 0
			? `WARN: ${warnings} orphan(s) detected.`
			: "PASS: No orphans detected.",
	);
	return 0;
}

export function runConsistencyScan(context: ValidationContext): number {
	let warnings = 0;
	const expected = /feat.*fix.*docs.*refactor.*test.*chore.*harness/s;
	for (const relativePath of [
		"docs/internal/agent-entry.md",
		"AGENTS.md",
		"CLAUDE.md",
		"CONTRIBUTING.md",
	]) {
		if (
			!expected.test(
				readFileSync(path.join(context.repoRoot, relativePath), "utf8"),
			)
		) {
			warnings += 1;
			console.log(
				`INCONSISTENT: ${relativePath} does not list the canonical commit types.`,
			);
		}
	}
	console.log(
		warnings > 0
			? `WARN: ${warnings} consistency issue(s) found.`
			: "PASS: No consistency issues found.",
	);
	return 0;
}
