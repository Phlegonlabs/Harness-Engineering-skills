import { describe, expect, it } from "bun:test";
import { readFileSync } from "node:fs";
import path from "node:path";
import { listCommandSurface, renderCommandSurfaceDoc } from "./command-surface";
import { repoRoot } from "./shared";

const root = repoRoot();

function scriptName(display: string): string | null {
	const match = display.match(/bun run ([^ ]+)/);
	return match?.[1] ?? null;
}

describe("command surface registry", () => {
	it("maps every root command to an existing root package script", () => {
		const packageJson = JSON.parse(
			readFileSync(path.join(root, "package.json"), "utf8"),
		) as { scripts: Record<string, string> };
		for (const command of listCommandSurface(root).filter(
			(entry) => entry.scope === "root",
		)) {
			const script = scriptName(command.display);
			if (!script) continue;
			expect(packageJson.scripts[script]).toBeTruthy();
		}
	});

	it("maps workspace command templates to scripts that exist in the template workspaces", () => {
		const appPackages = ["apps/api/package.json", "apps/web/package.json"];
		const libraryPackages = ["packages/shared/package.json"];
		for (const command of listCommandSurface(root).filter(
			(entry) => entry.scope === "workspace",
		)) {
			const script = scriptName(command.display);
			const targets =
				command.workspaceKind === "app" ? appPackages : libraryPackages;
			for (const relativePath of targets) {
				const packageJson = JSON.parse(
					readFileSync(path.join(root, relativePath), "utf8"),
				) as { scripts: Record<string, string> };
				expect(packageJson.scripts[script ?? ""]).toBeTruthy();
			}
		}
	});

	it("renders the committed command surface doc exactly from the registry", () => {
		const committed = readFileSync(
			path.join(root, "docs/internal/command-surface.md"),
			"utf8",
		);
		expect(committed.trimEnd()).toBe(renderCommandSurfaceDoc(root).trimEnd());
	});
});
