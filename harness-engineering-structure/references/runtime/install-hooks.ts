import { copyFileSync, mkdirSync, readdirSync, statSync } from "node:fs";
import path from "node:path";
import { repoRoot } from "./shared";

const root = repoRoot();
const source = path.join(root, "harness/hooks");
const destination = path.join(root, ".git/hooks");

mkdirSync(destination, { recursive: true });
for (const file of readdirSync(source)) {
	const fullPath = path.join(source, file);
	if (!statSync(fullPath).isFile()) continue;
	copyFileSync(fullPath, path.join(destination, file));
	console.log(`  Installed: .git/hooks/${file}`);
}

console.log("");
console.log("Hooks installed successfully.");
