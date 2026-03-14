<!-- BEGIN:HARNESS:PUBLIC:QUICKSTART -->
## Quick Start

```bash
bun install
bun .harness/state.ts --show
bun harness:advance
bun harness:env
bun harness:validate --phase EXECUTING
bun harness:audit
```

After these steps, continue from `docs/PROGRESS.md`, `docs/progress/`, and `.harness/state.json`.
`.env.local` is already scaffolded for local use, but framework-specific variables should be added only when the relevant milestone task introduces that framework.
<!-- END:HARNESS:PUBLIC:QUICKSTART -->
