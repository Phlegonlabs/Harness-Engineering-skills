## 03. Spike Workflow

### Purpose

Handle exploratory tasks, outputting decisions and subsequent implementation direction rather than directly delivering features.

### Timebox

- Spikes must be time-boxed
- Default timebox: 2-4 hours for standard spikes, up to 8 hours for complex spikes
- A decision must be made after the timebox expires; unlimited exploration is not allowed

### Spike Criteria

- The task type is `SPIKE`
- There is a clear question or uncertainty to resolve
- The outcome is a decision, not a deliverable

### Evaluation Matrix Template

Use a weighted scoring table to compare options objectively:

| Option | Feasibility (×3) | Performance (×2) | Maintainability (×2) | Score |
|--------|:-:|:-:|:-:|:-:|
| Option A | 4 (12) | 3 (6) | 5 (10) | 28 |
| Option B | 5 (15) | 4 (8) | 3 (6) | 29 |
| Option C | 3 (9) | 5 (10) | 4 (8) | 27 |

Adjust weights based on project priorities. Document weight rationale in the ADR.

### Standard Spike Output Format

Every spike must produce exactly three artifacts:

1. **Summary** — A concise paragraph stating the problem, the options explored, and the chosen direction
2. **Comparison Matrix** — The evaluation matrix (see template above) with scores and reasoning
3. **Recommendation** — The selected option with justification, trade-offs acknowledged, and follow-up tasks

### Example Spike Flow

1. Read the spike task description and identify the core question
2. Define 2-4 candidate options
3. Set the timebox (default 2-4h)
4. Research each option — read docs, create minimal prototypes if needed
5. Fill in the Evaluation Matrix with scores and notes
6. Calculate weighted scores
7. Write the Summary artifact
8. Write the Recommendation with trade-offs
9. Generate the ADR (`docs/adr/ADR-[N]-[topic].md`)
10. Record key learnings in `LEARNING.md` and define follow-up implementation tasks

### Expected Outputs

1. Option comparison
2. Conclusion
3. ADR
4. LEARNING.md record
5. Follow-up implementation Tasks

### Commit Scope

- Only commit ADRs and necessary evaluation records to the repo
- `LEARNING.md` is global and does not go into the repo
