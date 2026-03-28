import { repoRoot } from "./shared";
import { runConsistencyScan, validationContext } from "./validation";

process.exit(runConsistencyScan(validationContext(repoRoot())));
