import { repoRoot } from "./shared";
import { runDocsFreshnessLint, validationContext } from "./validation";

process.exit(runDocsFreshnessLint(validationContext(repoRoot())));
