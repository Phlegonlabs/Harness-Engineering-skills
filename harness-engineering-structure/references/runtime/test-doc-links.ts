import { repoRoot } from "./shared";
import { runDocLinksTest, validationContext } from "./validation";

process.exit(runDocLinksTest(validationContext(repoRoot())));
