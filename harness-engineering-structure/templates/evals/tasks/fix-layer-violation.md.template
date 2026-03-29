# Eval: fix-layer-violation

> Run with: `./evals/run.sh fix-layer-violation`

## Task Prompt

> The file `apps/api/src/types/user.types.ts` imports from `apps/api/src/service/auth.service.ts`.
> This is a dependency-layer violation because the `types` layer cannot import from `service`.
> Fix the violation without deleting the user type or the auth helper entirely.
> Keep the workspace passing typecheck, lint, and full harness validation.

## Setup

```bash
mkdir -p apps/api/src/types apps/api/src/service
cat > apps/api/src/service/auth.service.ts <<'EOF'
export function isAuthenticated(token: string): boolean {
  return token.trim().length > 0;
}
EOF

cat > apps/api/src/types/user.types.ts <<'EOF'
import { isAuthenticated } from "../service/auth.service";

export interface UserRecord {
  id: string;
  token: string;
}

export function hasValidSession(user: UserRecord): boolean {
  return isAuthenticated(user.token);
}
EOF
```

## Grading Script

```bash
set -euo pipefail

if grep -q "../service/auth.service" apps/api/src/types/user.types.ts; then
  echo "FAIL: layer violation still present"
  exit 1
fi

test -f apps/api/src/types/user.types.ts
test -f apps/api/src/service/auth.service.ts

bun run typecheck
bun run lint
bun run harness:validate
```
