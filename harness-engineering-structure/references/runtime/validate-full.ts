import { runDoctor } from "./doctor";
import { runEntropyScans } from "./entropy-all";
import { runLintSuite } from "./lint-all";
import { repoRoot, writeSection } from "./shared";
import { runStructuralTests } from "./test-all";
import { validationContext } from "./validation";

const root = repoRoot();
const context = validationContext(root);
let hardErrors = 0;

console.log("harness validate:full");
console.log("════════════════════════════════════════════");
console.log(`Full validation suite — ${new Date().toISOString()}`);

for (const [label, step, hard] of [
	["1. Health Check", () => runDoctor(root), true],
	["2. Linters", () => runLintSuite(context), true],
	["3. Structural Tests", () => runStructuralTests(root, context), true],
	["4. Entropy Scans", () => runEntropyScans(context), false],
] as const) {
	writeSection(label);
	const result = step();
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
