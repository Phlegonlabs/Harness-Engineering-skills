import { afterEach, expect } from "bun:test";
import { spawn, spawnSync } from "node:child_process";
import {
	cpSync,
	existsSync,
	mkdtempSync,
	readFileSync,
	rmSync,
	statSync,
} from "node:fs";
import os from "node:os";
import path from "node:path";
import { saveState, writeProgressDoc } from "./planning";
import { baselineDiscoveryAnswers } from "./template-baseline";
import type { DiscoveryAnswerBatch, HarnessState } from "./types";

const tempRoots: string[] = [];

function cleanupProcessesForPath(targetPath: string): void {
	if (process.platform !== "win32") return;
	const escapedPath = targetPath.replace(/'/g, "''");
	spawnSync(
		"powershell",
		[
			"-NoProfile",
			"-Command",
			[
				"$targets = Get-CimInstance Win32_Process | Where-Object {",
				`  $_.CommandLine -and $_.CommandLine -like '*${escapedPath}*' -and`,
				"  @('bun.exe','node.exe','turbo.exe') -contains $_.Name",
				"}",
				"$targets | ForEach-Object {",
				"  Stop-Process -Id $_.ProcessId -Force -ErrorAction SilentlyContinue",
				"}",
			].join("\n"),
		],
		{ stdio: "ignore" },
	);
}

afterEach(() => {
	for (const root of tempRoots.splice(0)) {
		cleanupProcessesForPath(root);
		rmSync(root, { recursive: true, force: true });
	}
});

export interface CommandResult {
	code: number;
	stdout: string;
	stderr: string;
}

export function cloneRepo(repoRoot: string): string {
	const tempRoot = mkdtempSync(path.join(os.tmpdir(), "harness-command-flow-"));
	tempRoots.push(tempRoot);
	cpSync(repoRoot, tempRoot, {
		recursive: true,
		filter: (source) => {
			const relative = path.relative(repoRoot, source);
			if (!relative) return true;
			const segments = relative.split(path.sep);
			return !segments.some((segment) =>
				[".git", "node_modules", ".turbo", ".worktrees", "dist"].includes(
					segment,
				),
			);
		},
	});
	expect(runCommand(tempRoot, ["git", "init"]).code).toBe(0);
	expect(
		runCommand(tempRoot, ["git", "config", "user.email", "tests@example.com"])
			.code,
	).toBe(0);
	expect(
		runCommand(tempRoot, ["git", "config", "user.name", "Harness Tests"]).code,
	).toBe(0);
	expect(runCommand(tempRoot, ["git", "add", "."]).code).toBe(0);
	expect(
		runCommand(tempRoot, ["git", "commit", "-m", "chore(test): seed temp repo"])
			.code,
	).toBe(0);
	const install = runCommand(tempRoot, ["bun", "install"]);
	expect(install.code).toBe(0);
	return tempRoot;
}

export function runCommand(
	cwd: string,
	args: readonly [string, ...string[]],
	options?: { input?: string },
): CommandResult {
	const [command, ...commandArgs] = args;
	const result = spawnSync(command, commandArgs, {
		cwd,
		encoding: "utf8",
		env: {
			...process.env,
			HARNESS_SKIP_COMMAND_FLOW: "1",
		},
		input: options?.input,
	});
	cleanupProcessesForPath(cwd);
	return {
		code: result.status ?? 1,
		stdout: result.stdout ?? "",
		stderr: result.stderr ?? "",
	};
}

export async function expectPersistentBoot(
	cwd: string,
	args: readonly [string, ...string[]],
): Promise<void> {
	const [command, ...commandArgs] = args;
	const child = spawn(command, commandArgs, {
		cwd,
		env: {
			...process.env,
			HARNESS_SKIP_COMMAND_FLOW: "1",
		},
		stdio: ["ignore", "pipe", "pipe"],
	});
	let stdout = "";
	let stderr = "";
	child.stdout.on("data", (chunk) => {
		stdout += chunk.toString();
	});
	child.stderr.on("data", (chunk) => {
		stderr += chunk.toString();
	});

	const exit = new Promise<number | null>((resolve) => {
		child.once("exit", (code) => resolve(code));
	});
	const survived = await Promise.race([
		exit.then((code) => ({ survived: false, code })),
		new Promise<{ survived: true }>((resolve) =>
			setTimeout(() => resolve({ survived: true }), 1500),
		),
	]);

	if ("survived" in survived && survived.survived) {
		if (process.platform === "win32") {
			spawnSync("taskkill", ["/F", "/T", "/PID", String(child.pid)], {
				stdio: "ignore",
			});
		} else {
			child.kill("SIGTERM");
		}
		await exit;
		cleanupProcessesForPath(cwd);
		expect(true).toBe(true);
		return;
	}

	cleanupProcessesForPath(cwd);
	throw new Error(
		`Persistent command exited early.\nSTDOUT:\n${stdout}\nSTDERR:\n${stderr}`,
	);
}

export function readState(root: string): HarnessState {
	return JSON.parse(
		readFileSync(path.join(root, ".harness/state.json"), "utf8"),
	) as HarnessState;
}

export function firstTaskId(root: string): string {
	return readState(root).tasks[0]?.id ?? "";
}

export function commitAll(root: string, message: string): void {
	expect(runCommand(root, ["git", "add", "."]).code).toBe(0);
	const commit = runCommand(root, ["git", "commit", "-m", message]);
	expect(commit.code).toBe(0);
}

export function answerDiscovery(
	root: string,
	projectName: string,
): CommandResult {
	const payload: DiscoveryAnswerBatch = {
		answers: Object.entries(baselineDiscoveryAnswers(projectName)).map(
			([id, value]) => ({ id, value }),
		),
	};
	return runCommand(
		root,
		["bun", "run", "harness:discover", "--answer-from-stdin"],
		{ input: JSON.stringify(payload) },
	);
}

export function pumpMilestoneToDone(root: string, milestoneId: string): void {
	for (let attempt = 0; attempt < 10; attempt += 1) {
		const state = readState(root);
		const pending = state.tasks.filter(
			(task) => task.milestoneId === milestoneId && task.status !== "done",
		);
		if (pending.length === 0) return;
		expect(runCommand(root, ["bun", "run", "harness:orchestrate"]).code).toBe(
			0,
		);
		const activeTask = readState(root).tasks.find((task) =>
			["in_progress", "evaluation_pending"].includes(task.status),
		);
		expect(activeTask?.milestoneId).toBe(milestoneId);
		expect(
			runCommand(root, [
				"bun",
				"run",
				"harness:evaluate",
				"--task",
				activeTask?.id ?? "",
			]).code,
		).toBe(0);
	}
	throw new Error(
		`Milestone ${milestoneId} did not reach done within 10 iterations.`,
	);
}

export function markMilestoneDone(root: string, milestoneId: string): void {
	const state = readState(root);
	for (const task of state.tasks.filter(
		(entry) => entry.milestoneId === milestoneId,
	)) {
		task.status = "done";
		task.contractStatus = "approved";
		task.evaluatorStatus = "passed";
		task.stallCount = 0;
		task.iteration = Math.max(task.iteration, 1);
	}
	saveState(root, state);
	writeProgressDoc(
		root,
		state.milestones,
		state.tasks,
		state.execution.activeWorktrees,
	);
}

export function worktreePath(root: string, relativePath: string): string {
	return path.join(root, relativePath);
}

export function expectPathRemoved(target: string): void {
	expect(existsSync(target)).toBe(false);
}

export function expectPathExists(target: string): void {
	expect(existsSync(target)).toBe(true);
	expect(statSync(target).isDirectory() || statSync(target).isFile()).toBe(
		true,
	);
}
