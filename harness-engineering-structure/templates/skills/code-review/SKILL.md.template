# Skill: Code Review

Use this skill when reviewing PRs or validating code changes before merging.

## Architecture Checklist

- [ ] Dependencies flow downward only: Types → Config → Repo → Service → Runtime → UI
- [ ] No circular dependencies introduced
- [ ] Domain boundaries respected — no cross-domain direct imports
- [ ] Layer violations: `bun run harness:lint` passes

## Code Quality Checklist

- [ ] Files within size limits (`harness/rules/file-size-limits.json`)
- [ ] No `any` types without justification
- [ ] No commented-out code blocks
- [ ] No TODO/FIXME without issue references
- [ ] No hardcoded secrets or credentials
- [ ] Explicit return types on exported functions
- [ ] Error handling is consistent with project patterns

## Testing Checklist

- [ ] New code has corresponding tests
- [ ] Edge cases and error paths covered
- [ ] Coverage has not decreased
- [ ] Tests are deterministic (no flakiness)
- [ ] Structural tests still pass: `bun run harness:structural`

## Documentation Checklist

- [ ] If architecture changed → `docs/architecture.md` updated
- [ ] If a new decision was made → ADR created in `docs/decisions/`
- [ ] Public APIs have comments explaining purpose (not mechanics)
- [ ] Complex logic has inline comments explaining *why* (not *what*)

## How to Run All Checks

```bash
bun run harness:validate
```

This runs: health check + linters + structural tests + entropy scans.

## Feedback Format

Provide review feedback as:

```
## Summary
[One-line summary of the change]

## Looks Good
- [What's done well]

## Suggestions
- `filepath:line` — [suggestion]

## Must Fix
- `filepath:line` — [blocking issue with specific fix]
```

## See Also

- `bun run harness:lint` — Run all linters
- `bun run harness:structural` — Run structural tests
- `docs/internal/boundaries.md` — What agents may/may not do
