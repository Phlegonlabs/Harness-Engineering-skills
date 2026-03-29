import {
	chmodSync,
	copyFileSync,
	mkdirSync,
	readdirSync,
	statSync,
} from "node:fs";
import path from "node:path";
import { repoRoot, run } from "./shared";

function hookDestination(root: string): string | null {
	try {
		const gitDir = run("git", ["-C", root, "rev-parse", "--git-dir"], root);
		return path.resolve(root, gitDir, "hooks");
	} catch {
		return null;
	}
}

export function installHooks(root: string = repoRoot()): number {
	const source = path.join(root, "harness/hooks");
	const destination = hookDestination(root);

	if (!destination) {
		console.log("No git repository detected; skipping hook installation.");
		return 0;
	}

	mkdirSync(destination, { recursive: true });
	for (const file of readdirSync(source)) {
		const fullPath = path.join(source, file);
		if (!statSync(fullPath).isFile()) continue;

		const installedPath = path.join(destination, file);
		copyFileSync(fullPath, installedPath);
		if (process.platform !== "win32") {
			chmodSync(installedPath, 0o755);
		}
		console.log(`  Installed: .git/hooks/${file}`);
	}

	console.log("");
	console.log("Hooks installed successfully.");
	return 0;
}

if (import.meta.main) {
	process.exit(installHooks(repoRoot()));
}
