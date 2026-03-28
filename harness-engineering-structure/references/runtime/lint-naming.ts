import { repoRoot } from "./shared";
import { runNamingLint, validationContext } from "./validation";

process.exit(runNamingLint(validationContext(repoRoot())));
