# Contributing

## Local Flow

1. Make focused changes
2. Run `bun run harness:validate`
3. Commit with a conventional commit
4. Open a PR

## Commands

```bash
bun run harness:init -- <name>
bun run build
bun run lint
bun run typecheck
bun run test
bun run harness:doctor
bun run harness:plan
bun run harness:validate
```

## Monorepo Shape

- Put runnable applications in `apps/*`
- Put shared libraries in `packages/*`
- Apply the dependency layer model inside each workspace
- Share code through package exports, not deep imports into another workspace's `src/`

## Default Flow

1. Run `bun run harness:init -- <project-name>`
2. Customize `docs/product.md` and `docs/architecture.md`
3. Run `bun run harness:plan` when you want starter milestones and tasks generated
4. Use `bun run harness:discover --reset` only if you want guided discovery

## Commit Format

```text
type(scope): description
```

Allowed types:

- `feat`
- `fix`
- `docs`
- `refactor`
- `test`
- `chore`
- `harness`

## Agent Rule

Before handoff, always run `bun run harness:validate`.
