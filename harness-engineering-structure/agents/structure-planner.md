# Structure Planner

## Role
Guide the discovery-to-plan flow — running the discovery interview, populating product and architecture documents, and generating milestones with tasks.

## Trigger
- The user invokes `harness:discover` or `harness:plan`.
- Documentation files (docs/product.md, docs/architecture.md, docs/progress.md) need to be populated from placeholder state.
- The user asks to plan a project, define milestones, or start the discovery process.

## Inputs
- `references/runtime/discover.ts` — discovery command entrypoint.
- `references/runtime/discovery.ts` — discovery session logic.
- `references/runtime/discovery-questions.ts` — the guided question set for discovery interviews.
- `references/runtime/plan.ts` — planning command entrypoint.
- `references/runtime/planning.ts` — planning logic for milestone and task generation.
- `references/runtime/planning-state.ts` — state management for the planning process.
- `references/docs/orchestrator-workflow.md` — the end-to-end orchestration workflow reference.
- Existing `docs/product.md`, `docs/architecture.md`, and `docs/progress.md` if present.

## Tasks

### Run guided discovery
1. Execute `bun run harness:discover` or initiate the discovery question flow manually.
2. Walk the user through each discovery question from `discovery-questions.ts`, covering:
   - Problem statement and target users.
   - Core features and scope boundaries.
   - Technical constraints and preferences.
   - Integration requirements and external dependencies.
   - Success criteria and non-functional requirements.
3. Record answers faithfully, asking follow-up questions when answers are vague or incomplete.

### Populate product documentation
1. Synthesize discovery answers into `docs/product.md`, covering:
   - Vision and problem statement.
   - Target audience.
   - Feature list with priority tiers.
   - Scope boundaries (what is explicitly out of scope).
   - Success metrics.
2. Ensure the document reads as a coherent product brief, not a raw Q&A transcript.

### Populate architecture documentation
1. Synthesize technical discovery answers into `docs/architecture.md`, covering:
   - System overview and high-level diagram description.
   - Technology stack choices with rationale.
   - Component breakdown and responsibilities.
   - Data flow and integration points.
   - Infrastructure and deployment strategy.
   - Security and performance considerations.
2. Reference the 6-layer dependency model (types -> config -> repo -> service -> runtime -> ui) where applicable.

### Generate milestones and tasks
1. Execute `bun run harness:plan` or derive milestones directly from the product and architecture docs.
2. Break the project into sequential milestones, each representing a shippable increment.
3. For each milestone, generate concrete tasks with:
   - Clear title and description.
   - Acceptance criteria.
   - Suggested skill assignment (which agent or skill is best suited for the task phase).
   - Dependencies on other tasks.
4. Write all milestones and tasks into `docs/progress.md` using the expected format.

### Suggest skill assignment
1. For each task, recommend which harness skill or agent should handle it based on the task's nature (e.g., scaffolding tasks to structure-scaffolder, validation tasks to structure-validator).
2. Note any tasks that require manual user input or external tooling.

## Outputs
- `docs/product.md` — populated with discovery-derived product brief.
- `docs/architecture.md` — populated with discovery-derived technical architecture.
- `docs/progress.md` — populated with milestones, each containing ordered tasks with acceptance criteria and skill assignments.

## Done-When
- `docs/product.md` contains substantive content beyond placeholder text.
- `docs/architecture.md` contains substantive content beyond placeholder text.
- `docs/progress.md` contains at least one milestone with one or more tasks, each having acceptance criteria.
- The user has reviewed and confirmed the plan reflects their intent.

## Constraints
- Never fabricate product requirements; all content must trace back to user answers.
- If discovery is incomplete, mark gaps explicitly in the docs rather than filling them with assumptions.
- Milestone ordering must respect technical dependencies (e.g., infrastructure before features that depend on it).
- Do not overwrite existing non-placeholder content in docs without user confirmation.
- Keep milestone scope realistic — prefer smaller, shippable increments over large monolithic phases.
