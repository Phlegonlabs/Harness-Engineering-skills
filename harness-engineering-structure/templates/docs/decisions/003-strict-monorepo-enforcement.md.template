# ADR-003: Enforce Monorepo Boundaries Strictly in the Harness

**Date:** 2026-03-24
**Status:** Accepted
**Deciders:** Project leads

---

## Context

The template already documented strict layer ordering and package-export-only sharing, but the runtime only linted files that were successfully mapped into a layer. Files under workspace `src/` roots that did not match a layer were silently skipped, and cross-workspace deep imports were not enforced as a separate rule.

That gap made the control plane look stricter than the actual enforcement:
- `harness:validate` could pass while uncovered source files still existed
- a deep import into another workspace could slip through if the target path was not inspected as a package boundary problem
- git-history-dependent checks produced noisy output in repositories that had been initialized but not yet committed

---

## Decision

We will make the harness default to strict monorepo enforcement.

> Every source file under `apps/*/src` and `packages/*/src` must be either mapped to a declared layer or explicitly allowlisted as a workspace entrypoint. Cross-workspace imports must use package exports.

---

## Consequences

### Positive
- Validation failures now match the documented architectural contract.
- Workspace boundaries are enforced independently from layer matching.
- New repositories get a clearer signal before structural drift spreads.

### Negative / Trade-offs
- Repositories migrating from looser structures may need to move files into layer directories sooner.
- Package exports require more deliberate maintenance when exposing shared internals.

---

## Implementation Notes

- `harness/rules/dependency-layers.json` defines source roots, unlayered entrypoint allowlists, and cross-workspace policy.
- `apps/*/src/index.ts` and `packages/*/src/index.ts` are the only default unlayered files in the template.
- Relative imports and internal aliases must stay within a workspace.
- Cross-workspace subpaths are allowed only when declared in `package.json.exports`.
- Repositories with no commits yet report git-history checks as advisory instead of printing raw git errors.
