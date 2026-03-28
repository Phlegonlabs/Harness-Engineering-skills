import { repoRoot } from "./shared";
import { runDriftScan, validationContext } from "./validation";

process.exit(runDriftScan(validationContext(repoRoot())));
