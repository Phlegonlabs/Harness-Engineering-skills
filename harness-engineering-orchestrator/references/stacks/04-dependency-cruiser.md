## 04. Dependency Cruiser

### Purpose

Use CI to validate the dependency direction: `types → config → lib → services → app`.

### Setup

```bash
bun add -d dependency-cruiser
bunx depcruise --init
```

### Expected Outcome

- `bun run check:deps` can be executed locally and in CI
- PRs are blocked when the dependency direction is violated
