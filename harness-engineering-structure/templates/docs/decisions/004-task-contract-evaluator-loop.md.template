# ADR-004: Add a Task Contract and Evaluator Loop to Harness Execution

## Status

Accepted

## Context

The original harness runtime could plan milestones and tasks, but execution remained too lightweight:

- `harness:orchestrate` only surfaced the next pending task
- task completion depended on humans or agents informally deciding work was "done"
- there was no repo-owned task contract, no task-level evaluator artifact, and no checkpoint handoff between long-running sessions

This made long-running or multi-session work more brittle than it needed to be.

## Decision

We are extending the harness execution loop with three repo-owned artifacts and one explicit task gate:

- `.harness/contracts/` stores task contracts
- `.harness/evaluations/` stores evaluator results
- `.harness/handoffs/` stores checkpoint artifacts
- `bun run harness:evaluate --task <id>` becomes the task-level pass/fail gate

Task execution now follows this lifecycle:

```text
pending -> contract_pending -> contract_approved -> in_progress -> evaluation_pending -> done
                                                             \-> blocked
```

## Consequences

### Positive

- Long-running work becomes resumable through explicit handoff artifacts
- Task scope becomes clearer before implementation starts
- Task completion is anchored to evaluator output instead of intuition

### Trade-offs

- Execution state becomes richer and slightly more complex
- The first version is still operator-driven; it is not a full multi-agent autonomous runtime

## Follow-up

- Keep `harness:validate` as the repo-wide gate
- Consider richer evaluator criteria and tool-based evidence collection in later iterations
