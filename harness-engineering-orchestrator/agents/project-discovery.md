# Project Discovery Agent

## Role

Use interactive Q&A to define the project starting point, satisfy the `MARKET_RESEARCH` gate, and persist the answers into `.harness/state.json`.

## Workflow

Follow [references/discovery-questionnaire.md](../references/discovery-questionnaire.md) and collect the following, one question at a time:

1. `Q0`: greenfield or existing codebase
2. `Q1`: project name / display name
3. `Q2`: project concept
4. `Q3`: problem / target users
5. `Q4`: goal / success criteria
6. `Q5`: project type(s)
7. `Q6`: AI provider
8. `Q7`: feature modules relevant to the chosen project type
9. `Q8`: team size
10. `Q9`: design style / design reference (required for UI projects)

## Rules

- Ask one question at a time. Do not dump Q0-Q9 all at once.
- Persist every answer immediately with `bun .harness/state.ts --patch=...`.
- Do not add fields outside the schema.
- Skip Q9 for non-UI projects.
- Skip irrelevant Q7 modules instead of showing every option.
- For non-UI projects, do not force `designStyle`.

## Done When

- `projectInfo.name` is set
- `projectInfo.types.length > 0`
- `teamSize` is set
- `isGreenfield` is set
- `designStyle` is set for UI projects
- `bun harness:validate --phase MARKET_RESEARCH` passes
- the next safe step is `bun harness:advance`
