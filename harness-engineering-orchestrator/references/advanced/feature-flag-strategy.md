# Feature Flag Strategy Reference

Guidelines for implementing, managing, and retiring feature flags across the project lifecycle.

---

## Tool Selection

Choose the feature flag tool based on project complexity and team size:

| Complexity | Tool | When to Use |
|------------|------|-------------|
| **Simple** | Environment variables | Solo developer, < 5 flags, no runtime toggling needed |
| **Medium** | Unleash (self-hosted) | Team project, 5–20 flags, needs gradual rollout or A/B testing |
| **Complex** | LaunchDarkly | Large team, 20+ flags, needs targeting rules, audit trail, SDKs |

> Default to environment variables for Harness-managed projects. Upgrade to Unleash or LaunchDarkly when runtime toggling or user-level targeting is required.

---

## Naming Convention

```
FF_[SCOPE]_[FEATURE]
```

- **Prefix**: Always `FF_`
- **Scope**: The domain or module the flag belongs to (e.g., `AUTH`, `DASHBOARD`, `API`, `BILLING`)
- **Feature**: The specific feature being flagged (e.g., `SOCIAL_LOGIN`, `NEW_CHART`, `RATE_LIMIT`)
- **Case**: `UPPER_SNAKE_CASE`

### Examples

```
FF_AUTH_SOCIAL_LOGIN
FF_DASHBOARD_NEW_CHART_WIDGET
FF_API_RATE_LIMIT_V2
FF_BILLING_STRIPE_CHECKOUT
```

---

## Lifecycle

```
┌──────────┐     ┌─────────────┐     ┌──────────┐     ┌────────────┐     ┌───────────┐
│  Create   │ ──→ │  Implement  │ ──→ │  Enable  │ ──→ │ Stabilize  │ ──→ │  Cleanup  │
└──────────┘     └─────────────┘     └──────────┘     └────────────┘     └───────────┘
```

| Phase | Actions |
|-------|---------|
| **Create** | Add flag to `config/feature-flags.ts` with default value `false` |
| **Implement** | Wrap new code paths with flag check; old code path remains as fallback |
| **Enable** | Set flag to `true` in staging, then production (gradual rollout if using Unleash/LD) |
| **Stabilize** | Monitor for 1–2 sprints; confirm no regressions |
| **Cleanup** | Remove flag, remove old code path, remove from config |

---

## Milestone Integration

- When a feature flag enters the **Stabilize** phase, a cleanup task is automatically added to the next milestone's backlog
- Cleanup tasks follow the format: `chore(T[ID]): remove FF_[SCOPE]_[FEATURE] flag`
- Flags must not persist across more than **2 milestones** — if a flag is still active after 2 milestones, it becomes a blocking item

---

## Code Pattern

All feature flags are centralized in a single configuration file:

```typescript
// config/feature-flags.ts
import { env } from './env'

export const featureFlags = {
  FF_AUTH_SOCIAL_LOGIN: env.FF_AUTH_SOCIAL_LOGIN === 'true',
  FF_DASHBOARD_NEW_CHART_WIDGET: env.FF_DASHBOARD_NEW_CHART_WIDGET === 'true',
  FF_API_RATE_LIMIT_V2: env.FF_API_RATE_LIMIT_V2 === 'true',
} as const

export type FeatureFlag = keyof typeof featureFlags
```

### Usage in Application Code

```typescript
import { featureFlags } from '@/config/feature-flags'

// Service layer
async function authenticate(credentials: Credentials) {
  if (featureFlags.FF_AUTH_SOCIAL_LOGIN) {
    return authenticateWithSocial(credentials)
  }
  return authenticateWithPassword(credentials)
}
```

### Rules

- **Single source**: All flags must be defined in `config/feature-flags.ts` — no inline `process.env.FF_*` checks
- **Boolean only**: Flags are always boolean (`true` / `false`) — use config values for non-boolean settings
- **No nesting**: Do not create flags that depend on other flags
- **Test both paths**: Unit tests must cover both the enabled and disabled code paths

---

## Flag Audit

Run a periodic audit to identify stale flags:

```bash
# Find all feature flag references in the codebase
grep -r "FF_" --include="*.ts" --include="*.tsx" src/
```

Flags that have been enabled in production for more than 2 milestones without cleanup are considered **stale** and should be escalated.
