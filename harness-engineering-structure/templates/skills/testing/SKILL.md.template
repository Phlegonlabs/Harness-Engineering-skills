# Skill: Testing

Use this skill when writing tests or improving test coverage.

## Test Structure

Tests should be co-located with source files where possible:

```
src/<layer>/<domain>/
├── <feature>.ts
└── <feature>.test.ts   ← Unit tests here
```

Cross-layer tests live in `tests/` (create directories as the project grows):
```
tests/
├── integration/         ← API / cross-service tests (create when needed)
├── architecture/        ← Structural tests (dependency layer rules)
└── e2e/                 ← End-to-end tests (create when needed)
```

## Testing Rules

1. **Name tests descriptively**: `should [expected behavior] when [condition]`
2. **Use Arrange-Act-Assert** pattern
3. **Test both paths**: success case AND all error cases
4. **No test interdependency**: each test must be independent (no shared state)
5. **Keep tests fast**: mock external dependencies (DB, APIs, file system)
6. **No magic timeouts**: use async/await properly, never `sleep()`

## Coverage Requirements

The pre-stop hook enforces coverage before the agent completes a task.

```bash
# Run tests with coverage
[your test:coverage command]
```

Threshold: **80% lines/functions/branches** (template default — uncomment the coverage block in `hooks/pre-stop.sh` to activate).

If coverage drops below threshold, the hook re-engages the agent to add tests.

## Structural Tests

Architecture compliance tests live in `tests/architecture/` (or the Bun harness runtime). These enforce the dependency layer rules:

```bash
bun run harness:structural
```

These are NOT functional tests — they test the architecture itself.

## What NOT to Test

- Framework internals (test your code, not the framework)
- Trivial getters/setters (trust the type system)
- Internal private implementation details

## Common Patterns

**Testing error paths:**
```
it('should return error when user not found', async () => {
  // Arrange: mock repo to return null
  // Act: call service
  // Assert: result.ok === false, result.error === expected error code
});
```

**Testing with mocks:**
```
// Mock at the repo layer, test the service layer
// Never mock business logic itself
```

## See Also

- `harness/runtime/` — Architecture compliance runtime
- `harness/rules/file-size-limits.json` — Test file size limits (300 lines)
- `hooks/pre-stop.sh` — Coverage enforcement
