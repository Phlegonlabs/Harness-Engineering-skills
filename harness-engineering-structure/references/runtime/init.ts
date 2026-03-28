import { readFileSync, writeFileSync } from "node:fs";
import path from "node:path";
import { saveState, stateTemplate } from "./planning";
import { readJson, repoRoot, runPassthrough, writeJson } from "./shared";
import {
	renderBaselineArchitectureDoc,
	renderBaselineProductDoc,
	renderQualityGradesDoc,
	renderReadyProgressDoc,
} from "./template-baseline";

const root = repoRoot();
const projectName = process.argv.at(-1);
if (!projectName || !/^[a-z0-9]+(-[a-z0-9]+)*$/.test(projectName)) {
	console.error("Usage: bun run harness:init -- <kebab-case-project-name>");
	process.exit(1);
}

const configPath = path.join(root, "harness/config.json");
const config = readJson<Record<string, unknown>>(configPath);
const previousProjectName =
	typeof config.project_name === "string"
		? config.project_name
		: "harness-template";
config.project_name = projectName;
writeJson(configPath, config);
saveState(root, stateTemplate(projectName));

const packageJsonPath = path.join(root, "package.json");
const packageJson = readJson<Record<string, unknown>>(packageJsonPath);
packageJson.name = projectName;
writeJson(packageJsonPath, packageJson);

const templateScope = "@harness-template";
const previousScope = `@${previousProjectName}`;
const projectScope = `@${projectName}`;
for (const relativePath of [
	"apps/web/package.json",
	"apps/api/package.json",
	"packages/shared/package.json",
]) {
	const absolutePath = path.join(root, relativePath);
	const workspacePackage = readJson<Record<string, unknown>>(absolutePath);
	if (typeof workspacePackage.name === "string") {
		workspacePackage.name = workspacePackage.name
			.replace(previousScope, projectScope)
			.replace(templateScope, projectScope);
	}
	for (const field of [
		"dependencies",
		"devDependencies",
		"peerDependencies",
	] as const) {
		const dependencies = workspacePackage[field];
		if (!dependencies || typeof dependencies !== "object") continue;
		workspacePackage[field] = Object.fromEntries(
			Object.entries(dependencies as Record<string, string>).map(
				([key, value]) => [
					key
						.replace(previousScope, projectScope)
						.replace(templateScope, projectScope),
					value,
				],
			),
		);
	}
	writeJson(absolutePath, workspacePackage);
}

writeFileSync(
	path.join(root, "docs/product.md"),
	`${renderBaselineProductDoc(projectName)}\n`,
);
writeFileSync(
	path.join(root, "docs/architecture.md"),
	`${renderBaselineArchitectureDoc(projectName)}\n`,
);
writeFileSync(
	path.join(root, "docs/progress.md"),
	`${renderReadyProgressDoc()}\n`,
);
writeFileSync(
	path.join(root, "docs/quality/GRADES.md"),
	`${renderQualityGradesDoc()}\n`,
);

writeFileSync(
	path.join(root, ".env.example"),
	readFileSync(path.join(root, ".env.example"), "utf8").replaceAll(
		previousProjectName,
		projectName,
	),
);
const title = projectName
	.split("-")
	.map((part) => `${part[0].toUpperCase()}${part.slice(1)}`)
	.join(" ");
writeFileSync(
	path.join(root, "README.md"),
	readFileSync(path.join(root, "README.md"), "utf8").replace(
		/^# .+$/m,
		`# ${title}`,
	),
);
writeFileSync(
	path.join(root, "LICENSE"),
	readFileSync(path.join(root, "LICENSE"), "utf8")
		.replaceAll(
			"Harness Engineering Template Contributors",
			`${projectName} contributors`,
		)
		.replaceAll(
			`${previousProjectName} contributors`,
			`${projectName} contributors`,
		)
		.replaceAll("2026", `${new Date().getFullYear()}`),
);

if (runPassthrough("git", ["-C", root, "rev-parse", "--git-dir"], root) !== 0) {
	runPassthrough("git", ["-C", root, "init"], root);
}
runPassthrough("bun", ["run", "format"], root);
runPassthrough("bun", ["run", "harness:install-hooks"], root);
runPassthrough("bun", ["run", "harness:doctor"], root);
