## 04. Final Validation

### Harness Score

Full validation checks 19 critical items:

- AGENTS / CLAUDE
- PRD / Architecture / Progress
- `.harness/state.json`
- GitBook
- README final version completed (`docs.readme.isFinal = true`)
- CI / PR template / `.env.example` / Biome
- Bun package manager
- `.gitignore`
- ADR
- Tech Stack confirmed
- All milestones complete

> The pass criteria for `bun harness:validate` are: **all 19 critical items pass, and Harness Score >= 80**. The score is a necessary condition for the final gate, but not the only condition.

### Pass Threshold

- Harness Score must be `>= 80`
- If any critical item fails, `bun harness:validate` must exit with code `1`
- If `score < 80`, `bun harness:validate` must exit with code `1`
- Recommended grading display:
  - `>= 90` and all critical items pass: Excellent
  - `>= 80` and all critical items pass: Final Gate Passed
  - `>= 80` but critical items still failing: Score meets target, but Final Gate not passed
  - `< 80`: Not Passed

### Score Formula

```text
score = round((passing / 19) * 100)
```

- **19** is the total number of critical items.
- `passing` is the count of critical items that pass.
- Example: 16/19 passing = `round((16 / 19) * 100)` = **84** (passes, >= 80).
- Example: 15/19 passing = `round((15 / 19) * 100)` = **79** (fails, < 80).

### Output

- `state.validation.score`
- `state.validation.criticalPassed`
- `state.validation.criticalTotal`
- Final report message
