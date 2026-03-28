import { repoRoot, runPassthrough } from "./shared";

const root = repoRoot();
for (const [name, script] of [
	["Drift Detection", "harness/runtime/scan-drift.ts"],
	["Orphan Detection", "harness/runtime/scan-orphans.ts"],
	["Consistency Check", "harness/runtime/scan-consistency.ts"],
] as const) {
	console.log(`── ${name} ──────────────────────────────────`);
	runPassthrough("bun", ["run", script], root);
	console.log("");
}

console.log("════════════════════════════════════════════");
console.log("INFO: Entropy scans complete. Review warnings above.");
