import { repoRoot } from "./shared";
import { runArchitectureTest, validationContext } from "./validation";

process.exit(runArchitectureTest(validationContext(repoRoot())));
