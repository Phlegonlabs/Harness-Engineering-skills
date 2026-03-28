import { repoRoot, runPassthrough } from "./shared";

const root = repoRoot();
let errors = 0;

for (const [name, script] of [
	["Layer Boundaries", "harness/runtime/lint-layers.ts"],
	["File Sizes", "harness/runtime/lint-file-size.ts"],
	["Naming Conventions", "harness/runtime/lint-naming.ts"],
	["Forbidden Patterns", "harness/runtime/lint-forbidden.ts"],
	["Doc Freshness", "harness/runtime/lint-docs-freshness.ts"],
] as const) {
	console.log(`── ${name} ──────────────────────────────────`);
	errors += runPassthrough("bun", ["run", script], root);
	console.log("");
}

console.log("════════════════════════════════════════════");
if (errors > 0) {
	console.log(`FAIL: ${errors} linter(s) reported errors.`);
	process.exit(1);
}
console.log("PASS: All linters passed.");
