import { repoRoot } from "./shared";
import { runOrphanScan, validationContext } from "./validation";

process.exit(runOrphanScan(validationContext(repoRoot())));
