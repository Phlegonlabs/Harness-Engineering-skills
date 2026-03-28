import { repoRoot } from "./shared";
import { runForbiddenLint, validationContext } from "./validation";

process.exit(runForbiddenLint(validationContext(repoRoot())));
