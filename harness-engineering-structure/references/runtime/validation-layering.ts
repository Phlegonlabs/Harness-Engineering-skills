import { readFileSync } from "node:fs";
import path from "node:path";
import {
	check,
	globToRegex,
	normalizeRelativePath,
	readJson,
	repoRelative,
	trackedFiles,
	workspacePrefixForPath,
	workspaceRelativePath,
} from "./shared";
import type { DependencyRules, LayerRule, ValidationContext } from "./types";

const sourceFilePattern = /\.(ts|tsx|js|jsx|mjs|cjs)$/;

interface WorkspacePackageManifest {
	name?: string;
	exports?: string | string[] | Record<string, unknown>;
}

interface WorkspacePackageEntry {
	name: string;
	workspaceRoot: string;
	exportedSubpaths: Set<string>;
}

function matchesLayerCandidate(candidate: string, layer: LayerRule): boolean {
	if (
		layer.directories.some(
			(directory) =>
				candidate === directory || candidate.startsWith(`${directory}/`),
		)
	) {
		return true;
	}
	const basename = path.basename(candidate);
	return (layer.file_patterns ?? []).some((pattern) => {
		const regex = globToRegex(pattern);
		return regex.test(basename) || regex.test(candidate);
	});
}

export function getLayerForPath(relativePath: string, rules: DependencyRules) {
	const workspaceRoots = rules.workspace_roots ?? [];
	const normalized = normalizeRelativePath(relativePath);
	const workspacePath = workspaceRelativePath(normalized, workspaceRoots);
	const candidates = workspacePath ? [workspacePath, normalized] : [normalized];
	return rules.layers.find((layer) =>
		candidates.some((candidate) => matchesLayerCandidate(candidate, layer)),
	);
}

function sourceRoots(rules: DependencyRules): string[] {
	if ((rules.source_roots ?? []).length > 0) {
		return rules.source_roots ?? [];
	}
	return (rules.workspace_roots ?? []).map(
		(workspaceRoot) => `${workspaceRoot}/*/src`,
	);
}

export function collectLayerLintSourceFiles(
	root: string,
	rules: DependencyRules,
): string[] {
	const sourceRootRegexes = sourceRoots(rules).map((pattern) =>
		globToRegex(`${pattern}/**`),
	);
	return trackedFiles(root)
		.map(normalizeRelativePath)
		.filter(
			(relativePath) =>
				sourceFilePattern.test(relativePath) &&
				sourceRootRegexes.some((regex) => regex.test(relativePath)),
		);
}

function isAllowedUnlayeredFile(
	relativePath: string,
	rules: DependencyRules,
): boolean {
	return (rules.unlayered_allowed_patterns ?? []).some((pattern) =>
		globToRegex(pattern).test(relativePath),
	);
}

function resolveInternalImportTarget(
	importPath: string,
	fileRelativePath: string,
	root: string,
	rules: DependencyRules,
): string | null {
	const normalizedImport = normalizeRelativePath(importPath);
	const workspaceRoots = rules.workspace_roots ?? [];
	const workspacePrefix = workspacePrefixForPath(
		fileRelativePath,
		workspaceRoots,
	);
	if (/^\.\.?\//.test(normalizedImport)) {
		const parent = path.dirname(path.join(root, fileRelativePath));
		return repoRelative(root, path.resolve(parent, normalizedImport));
	}
	for (const [alias, target] of Object.entries(rules.internal_import_aliases)) {
		if (
			normalizedImport === alias ||
			normalizedImport.startsWith(`${alias}/`)
		) {
			const resolved =
				`${target}/${normalizedImport.slice(alias.length).replace(/^\/+/, "")}`.replace(
					/\/$/,
					"",
				);
			return workspacePrefix ? `${workspacePrefix}/${resolved}` : resolved;
		}
	}
	if (
		rules.internal_import_roots.some(
			(prefix) =>
				normalizedImport === prefix ||
				normalizedImport.startsWith(`${prefix}/`),
		)
	) {
		return workspacePrefix
			? `${workspacePrefix}/${normalizedImport}`
			: normalizedImport;
	}
	return null;
}

function importPathsFromFile(target: string): string[] {
	const content = readFileSync(target, "utf8");
	const matches = [
		...content.matchAll(/from\s+['"]([^'"]+)['"]/g),
		...content.matchAll(/require\(\s*['"]([^'"]+)['"]\s*\)/g),
		...content.matchAll(/import\(\s*['"]([^'"]+)['"]\s*\)/g),
	];
	return [...new Set(matches.map((match) => match[1]))];
}

function collectExportedSubpaths(
	exportsField: WorkspacePackageManifest["exports"],
): Set<string> {
	if (!exportsField) {
		return new Set();
	}
	if (typeof exportsField === "string" || Array.isArray(exportsField)) {
		return new Set(["."]);
	}
	const keys = Object.keys(exportsField);
	if (keys.some((key) => key.startsWith("."))) {
		return new Set(keys);
	}
	return new Set(["."]);
}

function workspacePackages(
	root: string,
	rules: DependencyRules,
): WorkspacePackageEntry[] {
	const workspaceRoots = rules.workspace_roots ?? [];
	const packageJsonPatterns = workspaceRoots.map((workspaceRoot) =>
		globToRegex(`${workspaceRoot}/*/package.json`),
	);
	return trackedFiles(root)
		.map(normalizeRelativePath)
		.filter((relativePath) =>
			packageJsonPatterns.some((pattern) => pattern.test(relativePath)),
		)
		.flatMap((relativePath) => {
			const manifest = readJson<WorkspacePackageManifest>(
				path.join(root, relativePath),
			);
			if (!manifest.name) {
				return [];
			}
			return [
				{
					name: manifest.name,
					workspaceRoot: normalizeRelativePath(path.dirname(relativePath)),
					exportedSubpaths: collectExportedSubpaths(manifest.exports),
				},
			];
		});
}

function matchingWorkspacePackage(
	importPath: string,
	packages: WorkspacePackageEntry[],
): WorkspacePackageEntry | null {
	const normalizedImport = normalizeRelativePath(importPath);
	return (
		packages
			.filter(
				(entry) =>
					normalizedImport === entry.name ||
					normalizedImport.startsWith(`${entry.name}/`),
			)
			.sort((left, right) => right.name.length - left.name.length)[0] ?? null
	);
}

function workspacePackageSubpath(
	importPath: string,
	workspacePackage: WorkspacePackageEntry,
): string {
	if (importPath === workspacePackage.name) {
		return ".";
	}
	return `./${importPath.slice(workspacePackage.name.length + 1)}`;
}

function crossWorkspaceViolation(
	importPath: string,
	fileRelativePath: string,
	root: string,
	rules: DependencyRules,
	packages: WorkspacePackageEntry[],
): string | null {
	const workspaceRoots = rules.workspace_roots ?? [];
	const currentWorkspace = workspacePrefixForPath(
		fileRelativePath,
		workspaceRoots,
	);
	const resolved = resolveInternalImportTarget(
		importPath,
		fileRelativePath,
		root,
		rules,
	);
	if (resolved) {
		const targetWorkspace = workspacePrefixForPath(resolved, workspaceRoots);
		if (
			currentWorkspace &&
			targetWorkspace &&
			targetWorkspace !== currentWorkspace &&
			rules.cross_workspace?.forbid_relative
		) {
			return `relative and internal-path imports must stay within ${currentWorkspace}; resolved target is ${resolved}`;
		}
		return null;
	}
	const workspacePackage = matchingWorkspacePackage(importPath, packages);
	if (
		!workspacePackage ||
		currentWorkspace === workspacePackage.workspaceRoot
	) {
		return null;
	}
	const subpath = workspacePackageSubpath(importPath, workspacePackage);
	if (subpath === ".") {
		return rules.cross_workspace?.allow_package_root
			? null
			: `imports from ${workspacePackage.name} must not use the package root`;
	}
	if (
		rules.cross_workspace?.allow_exported_subpaths &&
		workspacePackage.exportedSubpaths.has(subpath)
	) {
		return null;
	}
	return `${importPath} is not an exported entrypoint of ${workspacePackage.name}`;
}

function logViolation(
	title: string,
	relativePath: string,
	details: string[],
): void {
	console.log(`${title}: ${relativePath}`);
	for (const detail of details) {
		console.log(`  ${detail}`);
	}
	console.log("");
}

export function runLayerLint(context: ValidationContext): number {
	let errors = 0;
	const files = collectLayerLintSourceFiles(
		context.repoRoot,
		context.dependencyRules,
	);
	if (files.length === 0) {
		check("INFO", "No source files found for layer lint.");
		return 0;
	}
	const packages = workspacePackages(context.repoRoot, context.dependencyRules);
	for (const relativePath of files) {
		const layer = getLayerForPath(relativePath, context.dependencyRules);
		if (
			!layer &&
			!isAllowedUnlayeredFile(relativePath, context.dependencyRules)
		) {
			errors += 1;
			logViolation("UNCOVERED SOURCE FILE", relativePath, [
				"Every file under workspace source roots must map to a layer or an explicit entrypoint allowlist.",
				"Move this file into a declared layer directory, rename it to a declared file pattern, or add an explicit allowlist entry if it is a true workspace entrypoint.",
			]);
			continue;
		}
		for (const importPath of importPathsFromFile(
			path.join(context.repoRoot, relativePath),
		)) {
			const workspaceViolation = crossWorkspaceViolation(
				importPath,
				relativePath,
				context.repoRoot,
				context.dependencyRules,
				packages,
			);
			if (workspaceViolation) {
				errors += 1;
				logViolation("WORKSPACE VIOLATION", relativePath, [
					`Import: ${importPath}`,
					`Reason: ${workspaceViolation}`,
				]);
				continue;
			}
			if (!layer) {
				continue;
			}
			const resolved = resolveInternalImportTarget(
				importPath,
				relativePath,
				context.repoRoot,
				context.dependencyRules,
			);
			if (!resolved) {
				continue;
			}
			const targetLayer = getLayerForPath(resolved, context.dependencyRules);
			if (!targetLayer) {
				continue;
			}
			if (targetLayer.index > layer.index) {
				errors += 1;
				logViolation("LAYER VIOLATION", relativePath, [
					`File layer: ${layer.name} (index: ${layer.index})`,
					`Imports from: ${importPath} (resolved: ${resolved}, layer: ${targetLayer.name})`,
					`Allowed imports: ${layer.allowed_imports.join(", ") || "(none)"}`,
				]);
			}
		}
	}
	console.log(
		errors > 0
			? `FAIL: ${errors} layer and workspace violation(s) found.`
			: "PASS: No layer boundary violations.",
	);
	return errors > 0 ? 1 : 0;
}
