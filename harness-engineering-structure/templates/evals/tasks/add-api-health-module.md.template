# Eval: add-api-health-module

> Run with: `./evals/run.sh add-api-health-module`

## Task Prompt

> Add a typed health module to the `apps/api` workspace.
> Define `HealthResponse` in `apps/api/src/types/health.types.ts`.
> Implement `createHealthResponse()` in `apps/api/src/runtime/health.ts`.
> Export it from `apps/api/src/runtime/index.ts` and preserve the existing workspace marker export.
> Add unit tests that verify the status is `"ok"` and the timestamp is a valid ISO string.
> Follow the dependency layer model and existing scaffold patterns.

## Setup

```bash
mkdir -p apps/api/src/types
```

## Grading Script

```bash
set -euo pipefail

pass() { echo "PASS: $1"; }

test -f apps/api/src/types/health.types.ts && pass "health type file exists"
test -f apps/api/src/runtime/health.ts && pass "health runtime file exists"
test -f apps/api/src/runtime/health.test.ts && pass "health test file exists"
grep -q "createHealthResponse" apps/api/src/runtime/index.ts && pass "runtime index exports health helper"

bun test apps/api/src/runtime/health.test.ts
bun run typecheck
bun run lint
bun run harness:validate
```
