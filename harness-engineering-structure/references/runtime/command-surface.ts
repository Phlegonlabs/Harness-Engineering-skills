import path from "node:path";
import { readJson, repoRoot, writeTextFile } from "./shared";
import type {
	CommandDefinition,
	CommandSurfaceFragment,
	CommandSurfaceRegistry,
	NormalizedCommandDefinition,
} from "./types";

function commandSurfacePath(root: string): string {
	return path.join(root, "harness/command-surface.json");
}

export function loadCommandSurface(
	root: string = repoRoot(),
): CommandSurfaceRegistry & { commands: CommandDefinition[] } {
	const registry = readJson<CommandSurfaceRegistry>(commandSurfacePath(root));
	const commands = registry.includes.flatMap(
		(relativePath) =>
			readJson<CommandSurfaceFragment>(path.join(root, relativePath)).commands,
	);
	return { ...registry, commands };
}

function normalizeCommand(
	command: CommandDefinition,
): NormalizedCommandDefinition {
	const scope = command.id.startsWith("workspace.") ? "workspace" : "root";
	const workspaceKind = command.id.startsWith("workspace.app.")
		? "app"
		: command.id.startsWith("workspace.package.")
			? "package"
			: undefined;
	const mode =
		command.id.endsWith(".dev") || command.id === "root.dev"
			? "persistent"
			: "one_shot";
	const mutatesRepo = [
		"root.harness-init",
		"root.harness-install-hooks",
		"root.harness-discover",
		"root.harness-discover-reset",
		"root.harness-plan",
		"root.harness-state-recover",
		"root.harness-orchestrate",
		"root.harness-evaluate",
		"root.harness-parallel-dispatch",
		"root.harness-merge-milestone",
		"root.format",
	].includes(command.id);

	return {
		...command,
		scope,
		workspaceKind,
		mode,
		mutatesRepo,
		missingPrereqBehavior:
			command.requires.length > 0 ? "expected_block" : "n/a",
		successMode: mode === "persistent" ? "persistent_boot" : "exit_zero",
	};
}

export function listCommandSurface(
	root: string = repoRoot(),
): NormalizedCommandDefinition[] {
	return loadCommandSurface(root).commands.map(normalizeCommand);
}

export function findCommandDefinition(
	commandId: string,
	root: string = repoRoot(),
): NormalizedCommandDefinition | null {
	return (
		listCommandSurface(root).find((command) => command.id === commandId) ?? null
	);
}

export function defaultCommandSurface(root: string = repoRoot()): string[] {
	return listCommandSurface(root).map((command) => command.display);
}

function renderTable(commands: NormalizedCommandDefinition[]): string[] {
	return [
		"| Command | Mode | Requires | Missing Prereq | Success | Summary |",
		"|---------|------|----------|----------------|---------|---------|",
		...commands.map((command) => {
			const requires =
				command.requires.length > 0 ? command.requires.join(", ") : "-";
			const workspace = command.workspaceKind
				? `${command.scope}:${command.workspaceKind}`
				: command.scope;
			return `| \`${command.display}\` | ${workspace} / ${command.mode} | ${requires} | ${command.missingPrereqBehavior} | ${command.successMode} | ${command.summary} |`;
		}),
	];
}

export function renderCommandSurfaceDoc(root: string = repoRoot()): string {
	const commands = listCommandSurface(root);
	const rootCommands = commands.filter((command) => command.scope === "root");
	const workspaceCommands = commands.filter(
		(command) => command.scope === "workspace",
	);

	return [
		"# Command Surface",
		"",
		"This document is generated from `harness/command-surface.json`.",
		"A command is considered healthy when it either succeeds with its prerequisites met",
		"or blocks clearly when those prerequisites are missing.",
		"This contract applies equally to Codex and Claude sessions.",
		"",
		"---",
		"",
		"## Root Commands",
		"",
		...renderTable(rootCommands),
		"",
		"---",
		"",
		"## Workspace Commands",
		"",
		...renderTable(workspaceCommands),
		"",
	].join("\n");
}

export function writeCommandSurfaceDoc(root: string = repoRoot()): void {
	writeTextFile(
		path.join(root, "docs/internal/command-surface.md"),
		`${renderCommandSurfaceDoc(root)}\n`,
	);
}
