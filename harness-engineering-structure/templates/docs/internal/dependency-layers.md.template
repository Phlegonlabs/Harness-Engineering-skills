# Dependency Layer Model

This project enforces a strict dependency layer order. All code must respect this hierarchy.

---

## The Six-Layer Model

```
┌──────────────────────────────────────────────────────────┐
│                        UI Layer                          │
│              (views, components, pages)                  │
├──────────────────────────────────────────────────────────┤
│                     Runtime Layer                        │
│          (servers, workers, entrypoints, CLI)            │
├──────────────────────────────────────────────────────────┤
│                     Service Layer                        │
│         (business logic, use cases, workflows)           │
├──────────────────────────────────────────────────────────┤
│                      Repo Layer                          │
│      (data access, storage adapters, external APIs)      │
├──────────────────────────────────────────────────────────┤
│                     Config Layer                         │
│            (configuration, environment, flags)           │
├──────────────────────────────────────────────────────────┤
│                     Types Layer                          │
│         (types, interfaces, schemas, constants)          │
└──────────────────────────────────────────────────────────┘
         ← each layer imports only from below →
```

**Import direction:** `Types → Config → Repo → Service → Runtime → UI`

Each layer may only import from layers *below* (earlier in the sequence) it.

---

## Layer Definitions

### Types
- **Purpose:** Foundation. Shared type definitions, interfaces, schemas, constants.
- **Typical location:** `apps/<app>/src/types/` or `packages/<pkg>/src/types/`
- **Allowed imports:** None (no internal imports)
- **Examples:** `User`, `OrderStatus`, `ApiResponse<T>`

### Config
- **Purpose:** Configuration, environment variables, feature flags.
- **Typical location:** `apps/<app>/src/config/` or `packages/<pkg>/src/config/`
- **Allowed imports:** `types`
- **Examples:** `DatabaseConfig`, `loadEnv()`, `featureFlags`

### Repo
- **Purpose:** Data access. Storage adapters, database queries, external API clients.
- **Typical location:** `apps/<app>/src/repo/` or `packages/<pkg>/src/repo/`
- **Allowed imports:** `types`, `config`
- **Examples:** `UserRepository`, `PaymentApiClient`, `CacheAdapter`

### Service
- **Purpose:** Business logic. Use cases, workflows, domain operations.
- **Typical location:** `apps/<app>/src/service/` or `packages/<pkg>/src/service/`
- **Allowed imports:** `types`, `config`, `repo`
- **Examples:** `AuthService`, `OrderService`, `NotificationService`

### Runtime
- **Purpose:** Entrypoints. Servers, workers, schedulers, CLI.
- **Typical location:** `apps/<app>/src/runtime/` or `packages/<pkg>/src/runtime/`
- **Allowed imports:** `types`, `config`, `repo`, `service`
- **Examples:** `HttpServer`, `BackgroundWorker`, `main()`

### UI
- **Purpose:** User interface. Views, components, pages, client-side code.
- **Typical location:** `apps/<app>/src/ui/` or `packages/<pkg>/src/ui/`
- **Allowed imports:** all layers
- **Examples:** React components, templates, CLI output formatters

---

## Enforcement

### At Commit Time
The `harness/hooks/pre-commit` hook runs `bun run harness:lint` before every commit.

### In CI
`.github/workflows/ci.yml` runs `bun run harness:validate` which includes layer linting.

### Machine-Readable Rules
`harness/rules/dependency-layers.json` defines the layer model in a format both linters and agents can consume.

The rules also define:

- `source_roots` for the workspace-owned source trees that are subject to layer coverage
- `workspace_roots` for the top-level monorepo containers such as `apps/` and `packages/`
- `internal_import_roots` for repo-absolute imports like `src/service/foo`
- `internal_import_aliases` for aliases like `@/service/foo`

Within a workspace, aliases such as `@/service/foo` resolve to that workspace's own `src/` tree. They must not be used to reach into another workspace.

### Entry Points and Export Barrels

- `apps/*/src/index.ts` is the workspace entrypoint.
- `packages/*/src/index.ts` is the package export barrel.
- These files may remain outside the six layers, but they are the only default exceptions in the template.
- Every other source file under `apps/*/src` or `packages/*/src` must match a declared layer directory or file pattern.

### Cross-Workspace Imports

- Relative imports and internal aliases must stay inside the current workspace.
- Cross-workspace reuse must go through the target package name.
- Subpath imports are allowed only when the target workspace declares them in `package.json.exports`.
- Deep imports such as `../../packages/shared/src/...` or `@scope/shared/src/...` are violations.

---

## Common Violations & Fixes

### Violation: Service imports from UI
```
# Bad
import { formatCurrency } from '../ui/formatters'  # service importing from ui

# Fix: move the formatter to types/ or create a shared util
import { formatCurrency } from '../types/formatters'
```

### Violation: Repo imports from Service
```
# Bad
import { validateOrder } from '../service/orderService'  # repo importing from service

# Fix: pass validated data down from the service layer
# The repo should receive already-validated data
```

### Violation: Types import from Config
```
# Bad
import { env } from '../config/env'  # types importing from config

# Fix: types should be pure — no runtime dependencies
# Move env-dependent logic to config layer
```

---

## Adapting to Your Stack

The layer model is language-agnostic. Map it to your conventions:

| Generic Layer | Node.js | Python | Go |
|---------------|---------|--------|----|
| types | `apps/*/src/types/` | `apps/*/src/models/` | `packages/*/pkg/domain/` |
| config | `apps/*/src/config/` | `apps/*/src/config/` | `packages/*/pkg/config/` |
| repo | `apps/*/src/repo/` | `apps/*/src/repositories/` | `packages/*/pkg/store/` |
| service | `apps/*/src/service/` | `apps/*/src/services/` | `packages/*/pkg/service/` |
| runtime | `apps/*/src/runtime/` | `apps/*/src/app/` | `apps/*/cmd/` |
| ui | `apps/*/src/ui/` | `apps/*/src/views/` | `packages/*/pkg/handler/` |

Update `harness/rules/dependency-layers.json` with your actual directory mappings.

---

*Machine-readable rules: `harness/rules/dependency-layers.json`*
*Linter: `bun run harness:lint`*
