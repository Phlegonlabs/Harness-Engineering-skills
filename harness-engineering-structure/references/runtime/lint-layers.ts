import { repoRoot } from "./shared";
import { runLayerLint, validationContext } from "./validation";

process.exit(runLayerLint(validationContext(repoRoot())));
