import { execFileSync } from "node:child_process";
import {
	existsSync,
	mkdirSync,
	readdirSync,
	readFileSync,
	writeFileSync,
} from "node:fs";
import path from "node:path";

const textExtensions = new Set([
	".md",
	".txt",
	".json",
	".yml",
	".yaml",
	".ts",
	".tsx",
	".js",
	".jsx",
	".css",
	".scss",
	".html",
	".xml",
	".toml",
	".ini",
	".cfg",
	".conf",
	".env",
]);

export function repoRoot(): string {
	try {
		return execFileSync("git", ["rev-parse", "--show-toplevel"], {
			encoding: "utf8",
		}).trim();
	} catch {
		return process.cwd();
	}
}

export function repoRelative(root: string, target: string): string {
	return path.relative(root, target).split(path.sep).join("/");
}

export function normalizeRelativePath(target: string): string {
	return target.replace(/\\/g, "/").replace(/^\.\//, "");
}

export function workspacePrefixForPath(
	relativePath: string,
	workspaceRoots: string[],
): string | null {
	const normalized = normalizeRelativePath(relativePath);
	const segments = normalized.split("/");
	if (segments.length < 3) return null;
	if (!workspaceRoots.includes(segments[0])) return null;
	return `${segments[0]}/${segments[1]}`;
}

export function workspaceRelativePath(
	relativePath: string,
	workspaceRoots: string[],
): string | null {
	const prefix = workspacePrefixForPath(relativePath, workspaceRoots);
	if (!prefix) return null;
	const normalized = normalizeRelativePath(relativePath);
	return normalized.slice(prefix.length + 1);
}

export function readJson<T>(target: string): T {
	return JSON.parse(readFileSync(target, "utf8")) as T;
}

export function writeJson(target: string, value: unknown): void {
	mkdirSync(path.dirname(target), { recursive: true });
	writeFileSync(target, `${JSON.stringify(value, null, "\t")}\n`);
}

export function writeSection(label: string): void {
	console.log("");
	console.log("════════════════════════════════════════════");
	console.log(`  ${label}`);
	console.log("════════════════════════════════════════════");
}

export function check(
	level: "PASS" | "FAIL" | "WARN" | "INFO",
	message: string,
): void {
	console.log(`  ${level}: ${message}`);
}

function walkFiles(root: string): string[] {
	const files: string[] = [];
	for (const entry of readdirSync(root, { withFileTypes: true })) {
		const fullPath = path.join(root, entry.name);
		if (entry.name === ".git") continue;
		if (entry.isDirectory()) {
			files.push(...walkFiles(fullPath));
		} else {
			files.push(fullPath);
		}
	}
	return files;
}

export function trackedFiles(root: string): string[] {
	try {
		const tracked = execFileSync("git", ["-C", root, "ls-files"], {
			encoding: "utf8",
			stdio: ["ignore", "pipe", "pipe"],
		});
		const untracked = execFileSync(
			"git",
			["-C", root, "ls-files", "--others", "--exclude-standard"],
			{
				encoding: "utf8",
				stdio: ["ignore", "pipe", "pipe"],
			},
		);
		return [...new Set(`${tracked}\n${untracked}`.split(/\r?\n/))]
			.map((line) => line.trim())
			.filter(Boolean)
			.filter((relativePath) => existsSync(path.join(root, relativePath)));
	} catch {
		return walkFiles(root).map((file) => repoRelative(root, file));
	}
}

export function globToRegex(pattern: string): RegExp {
	const escaped = pattern
		.replace(/[.+^${}()|[\]\\]/g, "\\$&")
		.replace(/\*\*\//g, "__DOUBLE_STAR_DIR__")
		.replace(/\*\*/g, "__DOUBLE_STAR__")
		.replace(/\*/g, "[^/]*")
		.replace(/\?/g, ".")
		.replace(/__DOUBLE_STAR_DIR__/g, "(.+/)?")
		.replace(/__DOUBLE_STAR__/g, ".*");
	return new RegExp(`^${escaped}$`);
}

export function isTextFile(target: string): boolean {
	const ext = path.extname(target).toLowerCase();
	if (textExtensions.has(ext)) return true;
	return [
		"Dockerfile",
		"Makefile",
		"LICENSE",
		".gitignore",
		".editorconfig",
	].includes(path.basename(target));
}

export function lineCount(target: string): number {
	if (!existsSync(target)) return 0;
	return readFileSync(target, "utf8").split(/\r?\n/).length;
}

export function markdownLinks(target: string): string[] {
	const content = readFileSync(target, "utf8");
	return [...content.matchAll(/\[[^\]]+\]\(([^)]+)\)/g)]
		.map((match) => match[1])
		.filter(Boolean);
}

export function hasPlaceholderContent(target: string): boolean {
	const content = readFileSync(target, "utf8");
	return [
		"[PROJECT_NAME]",
		"[Describe",
		"[Capability",
		"[Metric",
		"[Question",
		"[External system",
		"[Interface",
		"[your build command]",
		"[date]",
		"[name]",
	].some((needle) => content.includes(needle));
}

export function lastCommitUnix(
	root: string,
	relativePath: string,
): number | null {
	if (!gitHasCommits(root)) {
		return null;
	}
	try {
		return Number(
			run(
				"git",
				["-C", root, "log", "-1", "--format=%at", "--", relativePath],
				root,
			),
		);
	} catch {
		return null;
	}
}

export function gitHasCommits(root: string): boolean {
	try {
		run("git", ["-C", root, "rev-parse", "--verify", "HEAD"], root);
		return true;
	} catch {
		return false;
	}
}

export function run(
	command: string,
	args: string[],
	cwd: string = repoRoot(),
): string {
	return execFileSync(command, args, {
		cwd,
		encoding: "utf8",
		stdio: ["ignore", "pipe", "pipe"],
	}).trim();
}

export function runPassthrough(
	command: string,
	args: string[],
	cwd: string = repoRoot(),
): number {
	try {
		execFileSync(command, args, { cwd, stdio: "inherit" });
		return 0;
	} catch (error) {
		const status =
			typeof error === "object" && error && "status" in error
				? (error as { status?: number }).status
				: 1;
		return status ?? 1;
	}
}

export function ensureCleanMainWorktree(root: string): boolean {
	return run("git", ["-C", root, "status", "--porcelain"]) === "";
}

export function slugify(value: string): string {
	return value
		.toLowerCase()
		.replace(/[^a-z0-9]+/g, "-")
		.replace(/^-+|-+$/g, "");
}

export function exists(target: string): boolean {
	return existsSync(target);
}
