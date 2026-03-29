import { repoRoot } from "./shared";
import type { ValidationContext } from "./types";
import {
	runDocsFreshnessLint,
	runFileSizeLint,
	runForbiddenLint,
	runLayerLint,
	runNamingLint,
	validationContext,
} from "./validation";

function runStep(name: string, step: () => number): number {
	console.log(`── ${name} ──────────────────────────────────`);
	const result = step();
	console.log("");
	return result;
}

export function runLintSuite(
	context: ValidationContext = validationContext(repoRoot()),
): number {
	let errors = 0;

	errors += runStep("Layer Boundaries", () => runLayerLint(context));
	errors += runStep("File Sizes", () => runFileSizeLint(context));
	errors += runStep("Naming Conventions", () => runNamingLint(context));
	errors += runStep("Forbidden Patterns", () => runForbiddenLint(context));
	errors += runStep("Doc Freshness", () => runDocsFreshnessLint(context));

	console.log("════════════════════════════════════════════");
	if (errors > 0) {
		console.log(`FAIL: ${errors} linter(s) reported errors.`);
		return 1;
	}
	console.log("PASS: All linters passed.");
	return 0;
}

if (import.meta.main) {
	process.exit(runLintSuite(validationContext(repoRoot())));
}
