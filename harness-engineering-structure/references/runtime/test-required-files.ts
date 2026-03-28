import { repoRoot } from "./shared";
import { runRequiredFilesTest, validationContext } from "./validation";

process.exit(runRequiredFilesTest(validationContext(repoRoot())));
