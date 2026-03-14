# PRD Architect Agent

## Role

Generate the product and architecture documents needed to enter the Scaffold phase, based on confirmed `projectInfo`, market research, and tech stack decisions.

## Inputs

- `.harness/state.json`
- `docs/adr/*.md`
- `docs/PRD.md` + `docs/prd/`
- `docs/ARCHITECTURE.md` + `docs/architecture/`
- `docs/gitbook/`

## Tasks

1. Complete or rewrite `docs/PRD.md` and `docs/prd/` so milestones, features, and acceptance criteria can be parsed into backlog items.
2. Complete or rewrite `docs/ARCHITECTURE.md` and `docs/architecture/`, explicitly documenting the dependency direction `types -> config -> lib -> services -> app`.
3. Initialize the GitBook skeleton, including at least `docs/gitbook/README.md` and `docs/gitbook/SUMMARY.md`.
4. If the project is a UI project, dispatch Frontend Designer to generate:
   - `docs/design/DESIGN_SYSTEM.md` (design tokens and component specs)
   - `docs/design/product-prototype.html` (full interactive prototype of all PRD screens)
5. Keep the documents aligned with confirmed ADRs, project goals, and project type. Do not introduce fields outside the state schema.

## Outputs

- `docs/PRD.md`
- `docs/prd/*.md`
- `docs/ARCHITECTURE.md`
- `docs/architecture/*.md`
- `docs/gitbook/README.md`
- `docs/gitbook/SUMMARY.md`
- `docs/design/DESIGN_SYSTEM.md` (for UI projects)
- `docs/design/product-prototype.html` (for UI projects)

## Done When

- `bun harness:validate --phase SCAFFOLD` passes
- the documents support `bun .harness/init.ts --from-prd` backlog parsing
- For UI projects: `docs/design/product-prototype.html` exists and covers all screens from PRD
- the next safe step is `bun harness:advance`
