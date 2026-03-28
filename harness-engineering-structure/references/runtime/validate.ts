import { repoRoot, runPassthrough, writeSection } from "./shared";

const root = repoRoot();
let hardErrors = 0;

console.log("harness validate");
console.log("════════════════════════════════════════════");
console.log(`Full validation suite — ${new Date().toISOString()}`);

for (const [label, script, hard] of [
	["1. Health Check", "harness/runtime/doctor.ts", true],
	["2. Linters", "harness/runtime/lint-all.ts", true],
	["3. Structural Tests", "harness/runtime/test-all.ts", true],
	["4. Entropy Scans", "harness/runtime/entropy-all.ts", false],
] as const) {
	writeSection(label);
	const result = runPassthrough("bun", ["run", script], root);
	console.log("");
	if (result === 0) {
		console.log(`  ✓ ${label} passed`);
	} else if (hard) {
		console.log(`  ✗ ${label} FAILED (blocking)`);
		hardErrors += 1;
	} else {
		console.log(`  ⚠ ${label} reported warnings (advisory)`);
	}
}

console.log("");
console.log("════════════════════════════════════════════");
if (hardErrors > 0) {
	console.log(`FAIL: ${hardErrors} step(s) failed.`);
	process.exit(1);
}
console.log("PASS: All validation checks passed.");
