import { repoRoot, runPassthrough } from "./shared";

process.exit(runPassthrough("bun", ["test", "harness/runtime"], repoRoot()));
