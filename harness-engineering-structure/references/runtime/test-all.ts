import { repoRoot, runPassthrough } from "./shared";
import type { ValidationContext } from "./types";
import {
	runArchitectureTest,
	runDocLinksTest,
	runRequiredFilesTest,
	validationContext,
} from "./validation";

function runStep(name: string, step: () => number): number {
	console.log(`── ${name} ──────────────────────────────────`);
	const result = step();
	console.log("");
	return result;
}

export function runStructuralTests(
	root: string = repoRoot(),
	context: ValidationContext = validationContext(root),
): number {
	let errors = 0;

	errors += runStep("Required Files", () => runRequiredFilesTest(context));
	errors += runStep("Architecture Compliance", () =>
		runArchitectureTest(context),
	);
	errors += runStep("Document Links", () => runDocLinksTest(context));
	errors += runStep("Harness Runtime", () =>
		runPassthrough("bun", ["test", "harness/runtime"], root),
	);

	console.log("════════════════════════════════════════════");
	if (errors > 0) {
		console.log(`FAIL: ${errors} structural test(s) failed.`);
		return 1;
	}
	console.log("PASS: All structural tests passed.");
	return 0;
}

if (import.meta.main) {
	process.exit(runStructuralTests(repoRoot()));
}
