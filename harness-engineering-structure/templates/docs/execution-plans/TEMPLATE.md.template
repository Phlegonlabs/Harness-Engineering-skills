# Execution Plan: [Feature Name]

> **Status:** Draft | **Created:** YYYY-MM-DD | **Owner:** [name/agent]
> **Ticket/Issue:** [link]

## Objective

One sentence: what does this execution plan achieve?

## Scope

### In Scope
- ...

### Out of Scope
- ...

## Pre-requisites

- [ ] ADR written for significant design decisions (see `docs/decisions/`)
- [ ] Architecture reviewed — layer boundaries mapped, no violations expected
- [ ] Dependencies identified — all affected files/modules known
- [ ] Research done — existing patterns understood (see `skills/research/SKILL.md`)

---

## Implementation Steps

Follow the dependency layer order — bottom to top:

### Phase 1: Types & Config
- [ ] Choose the workspace first (`apps/<app>` or `packages/<pkg>`)
- [ ] Define types in `<workspace>/src/types/<domain>.ts`
- [ ] Add configuration if needed (`<workspace>/src/config/`)
- [ ] Write type-level tests if applicable

### Phase 2: Data Layer (Repo)
- [ ] Implement data access in `<workspace>/src/repo/<domain>/`
- [ ] Write unit tests for repo functions

### Phase 3: Business Logic (Service)
- [ ] Implement service functions in `<workspace>/src/service/<domain>/`
- [ ] Write unit tests for service functions
- [ ] Handle all error cases

### Phase 4: API / Runtime
- [ ] Add route handlers in `<workspace>/src/runtime/`
- [ ] Write integration tests

### Phase 5: UI (if applicable)
- [ ] Build UI components in `<workspace>/src/ui/<domain>/`
- [ ] Write component tests

---

## Verification

Before marking this plan complete:

- [ ] `bun run harness:validate` passes
- [ ] All new code has corresponding tests
- [ ] Coverage has not decreased
- [ ] Structural tests pass: `bun run harness:structural`
- [ ] `docs/architecture.md` updated if architecture changed
- [ ] `docs/progress.md` updated if milestone/task structure changed
- [ ] ADRs created for significant decisions

---

## Rollback Plan

How to safely revert if something goes wrong after merge:

1. [Rollback step 1]
2. [Rollback step 2]

---

## Open Questions

- [ ] [Question] — *Owner: [name], Due: [date]*
