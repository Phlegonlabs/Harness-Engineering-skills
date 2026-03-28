import { repoRoot, runPassthrough } from "./shared";

const root = repoRoot();
let errors = 0;

for (const [name, script] of [
	["Required Files", "harness/runtime/test-required-files.ts"],
	["Architecture Compliance", "harness/runtime/test-architecture.ts"],
	["Document Links", "harness/runtime/test-doc-links.ts"],
	["Harness Runtime", "harness/runtime/test-runtime.ts"],
] as const) {
	console.log(`── ${name} ──────────────────────────────────`);
	errors += runPassthrough("bun", ["run", script], root);
	console.log("");
}

console.log("════════════════════════════════════════════");
if (errors > 0) {
	console.log(`FAIL: ${errors} structural test(s) failed.`);
	process.exit(1);
}
console.log("PASS: All structural tests passed.");
