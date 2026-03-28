# Eval: [Task Name]

> This is an example eval task. Copy this file to `evals/tasks/your-task-name.md` and customize it.
> Run with: `./evals/run.sh your-task-name`

## Task Prompt

> [One sentence describing what the agent should do. This is the exact prompt sent to the agent.]

Example:
> Add a new GET endpoint at `/api/v1/projects/:id/stats` that returns project statistics. Follow existing patterns.

---

## Expected Behaviors

### Must Pass (Deterministic — automated by grading script)

- [ ] Required file(s) exist
- [ ] No type errors (`typecheck` passes)
- [ ] No lint errors (`lint` passes)
- [ ] Tests pass
- [ ] Harness validation passes (`bun run harness:validate`)
- [ ] No layer boundary violations

### Should Pass (Model-Graded — reviewed manually)

- [ ] Uses the project's error handling pattern
- [ ] Has input validation
- [ ] Types are defined in the types layer
- [ ] Tests cover both success and error cases
- [ ] Code follows existing patterns (consistent with the codebase)
- [ ] No backwards-compat code or dead exports

---

## Grading Script

Customize this for your task:

```bash
#!/usr/bin/env bash
set -euo pipefail
SCORE=0
TOTAL=0

pass() { echo "✅ $1"; ((SCORE++)) || true; ((TOTAL++)); }
fail() { echo "❌ $1"; ((TOTAL++)); }

# File existence checks
# [ -f apps/api/src/service/your-feature.ts ] && pass "Service file exists" || fail "Service file missing"
# [ -f tests/unit/apps-api/service/your-feature.test.ts ] && pass "Test file exists" || fail "Test file missing"

# Quality checks
bun run harness:validate 2>/dev/null && pass "Harness validation" || fail "Harness validation"

# Add your project-specific checks:
# bun run typecheck 2>/dev/null && pass "TypeScript compiles" || fail "TypeScript compiles"
# bun run lint 2>/dev/null && pass "Lint passes" || fail "Lint passes"
# bun run test 2>/dev/null && pass "Tests pass" || fail "Tests pass"

echo ""
echo "Score: ${SCORE}/${TOTAL}"
```

---

## Notes

- What patterns should the agent discover and follow?
- What edge cases should the implementation handle?
- What's the definition of "done" for a human reviewer?
