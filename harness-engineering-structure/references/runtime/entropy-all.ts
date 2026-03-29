import { repoRoot } from "./shared";
import type { ValidationContext } from "./types";
import {
	runConsistencyScan,
	runDriftScan,
	runOrphanScan,
	validationContext,
} from "./validation";

function runStep(name: string, step: () => number): void {
	console.log(`── ${name} ──────────────────────────────────`);
	step();
	console.log("");
}

export function runEntropyScans(
	context: ValidationContext = validationContext(repoRoot()),
): number {
	runStep("Drift Detection", () => runDriftScan(context));
	runStep("Orphan Detection", () => runOrphanScan(context));
	runStep("Consistency Check", () => runConsistencyScan(context));

	console.log("════════════════════════════════════════════");
	console.log("INFO: Entropy scans complete. Review warnings above.");
	return 0;
}

if (import.meta.main) {
	process.exit(runEntropyScans(validationContext(repoRoot())));
}
