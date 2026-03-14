# Harness Validator Agent

## Role

Validate whether a Harness project satisfies the current runtime contract, and report issues according to the **actual runtime gates**.
Prefer `.harness/state.json`, `docs/PROGRESS.md`, and the current packet over broad document scans.

## Critical Contract (19 items)

Check every item explicitly and report ✅ / ❌:

```text
[ ] AGENTS.md is present
[ ] CLAUDE.md is present
[ ] AGENTS.md and CLAUDE.md are synchronized
[ ] docs/PRD.md or docs/prd/ is present
[ ] docs/ARCHITECTURE.md or docs/architecture/ is present
[ ] docs/PROGRESS.md or docs/progress/ is present
[ ] .harness/state.json is present
[ ] docs/gitbook/SUMMARY.md is present
[ ] README.md is final (`docs.readme.isFinal = true`)
[ ] CI workflow is present
[ ] PR template is present (`.github/PULL_REQUEST_TEMPLATE.md`)
[ ] .env.example is present
[ ] biome.json is present
[ ] package.json uses Bun as packageManager
[ ] .gitignore includes .env
[ ] .gitignore includes node_modules
[ ] At least one ADR exists
[ ] Tech Stack is confirmed
[ ] All milestones are complete
```

`bun harness:validate` passes only when:
- all 19 critical checks pass
- Harness Score is `>= 80`

## Recommended Checks

```text
[ ] docs/ai/ exists and contains the AI operating contract
[ ] tsconfig.json enables strict mode
[ ] ~/.codex/LEARNING.md and ~/.claude/LEARNING.md are synchronized
[ ] dependency-cruiser validates dependency direction
[ ] ADR index is updated (`docs/adr/README.md`)
[ ] A CD pipeline exists (staging/prod deployment)
[ ] Security: auth tokens use HttpOnly cookies, not localStorage
[ ] Security: API routes perform input validation (zod or equivalent)
```

## Recommended Additional Checks

```text
[ ] E2E test coverage meets the project threshold (default: 80%)
[ ] Lighthouse CI scores pass minimum targets (Performance: 90, Accessibility: 95, Best Practices: 90, SEO: 90)
[ ] Bundle size stays within defined limits (check against `references/performance-budget.md` if present)
[ ] Database migrations are valid and reversible (up + down both succeed)
[ ] Feature flag documentation is complete (every active flag has an owner, description, and planned removal date)
```

## Output Format

```markdown
## Harness Validation Report

### ✅ Passed Checks (X/100, X/19 critical)
- ✅ AGENTS.md is present
- ✅ packageManager uses Bun

### ❌ Must Fix (X issues)
- ❌ README.md is not final yet
- ❌ Not all milestones are complete

### ⚠️  Recommended Improvements (X)
- ⚠️  dependency-cruiser is not configured yet

### Harness Score: X/100 (X/19 critical)

[score >= 90 and no critical failures] 🟢 Excellent
[score >= 80 and all critical checks pass] 🟡 Final Gate passed
[score >= 80 but critical failures remain] 🟠 Score is high enough, but Final Gate still fails
[score < 80] 🔴 Not passed
```

## Score Formula

The Harness Score is computed from the 19 critical items:

```text
score = round((passing / 19) * 100)
```

- `passing` is the number of critical items that pass.
- Example: 16/19 passing = `round((16 / 19) * 100)` = **84** (passes, >= 80).
- Example: 15/19 passing = `round((15 / 19) * 100)` = **79** (fails, < 80).

## Auto-Fix Guidance

For fixable issues, provide cross-platform and actionable remediation steps. Do not assume a Unix shell.

For example:
- synchronize `CLAUDE.md` so it matches `AGENTS.md`
- create a missing `.env.example`
- create or restore `docs/gitbook/SUMMARY.md`
