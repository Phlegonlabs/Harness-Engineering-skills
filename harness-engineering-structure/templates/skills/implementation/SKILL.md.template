# Skill: Implementation

Use this skill when implementing new features or making significant code changes.

## Before You Start

1. Read `docs/architecture.md` to understand module boundaries
2. Check `docs/decisions/` for relevant ADRs
3. Check `docs/progress.md` for the current milestone and task
4. If the change spans multiple domains or layers, create an execution plan: `docs/execution-plans/`
5. Use the Research skill first if the area is unfamiliar

## Implementation Checklist

- [ ] Types defined first (lowest layer — `<workspace>/src/types/`)
- [ ] Follows dependency layer rules: Types → Config → Repo → Service → Runtime → UI
- [ ] Error handling uses the project's error pattern (Result<T,E> or equivalent)
- [ ] All exported functions have explicit return types
- [ ] Tests written alongside implementation (not after)
- [ ] No reduction in test coverage
- [ ] Files stay under size limits (`harness/rules/file-size-limits.json`)
- [ ] No backwards-compat shims or dead code

## Layer-by-Layer Approach

Work from bottom to top — this is the natural dependency order:

Choose the target workspace before applying this order:
- `apps/<app>/src/...` for runnable applications
- `packages/<pkg>/src/...` for shared libraries

```
1. <workspace>/src/types/         Define types, interfaces, schemas
2. <workspace>/src/config/        Add configuration if needed
3. <workspace>/src/repo/          Implement data access
4. <workspace>/src/service/       Implement business logic
5. <workspace>/src/runtime/       Add API routes / server handlers
6. <workspace>/src/ui/            Build UI components (if applicable)
```

## File Organization

```
<workspace>/src/<layer>/<domain>/
├── index.ts          # Public exports only
├── <feature>.ts      # Implementation
└── <feature>.test.ts # Co-located tests
```

## Error Handling

Use the project's error pattern — propagate errors as values, don't throw inside business logic. Reserve exceptions for truly unexpected infrastructure failures. See your workspace's `src/types/` for the error pattern in use.

## After Implementation

1. Run typecheck — fix all type errors
2. Run linter — fix all warnings
3. Run tests — ensure all pass
4. Run `bun run harness:validate` — full harness check

## When to Create an ADR

Create `docs/decisions/NNN-title.md` when:
- Choosing between two reasonable approaches
- Making a decision that future agents need to understand
- Introducing a new pattern that others should follow

## See Also

- `docs/architecture.md` — Layer model and domain map
- `docs/execution-plans/TEMPLATE.md` — For complex multi-phase features
- `docs/internal/agent-entry.md` — Full rules reference
