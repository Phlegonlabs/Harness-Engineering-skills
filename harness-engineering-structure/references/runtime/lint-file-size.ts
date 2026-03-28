import { repoRoot } from "./shared";
import { runFileSizeLint, validationContext } from "./validation";

process.exit(runFileSizeLint(validationContext(repoRoot())));
