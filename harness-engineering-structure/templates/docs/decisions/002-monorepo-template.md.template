# ADR-002: Adopt Monorepo Template Output

**Date:** 2026-03-23
**Status:** Accepted
**Deciders:** Project leads

---

## Context

The template originally assumed a single-package repository rooted at `src/`. That shape is too limiting for projects that need multiple deployable applications, shared libraries, and a single harness surface for agent orchestration.

We need the default scaffold to:

- support multiple app entrypoints from day one
- make shared code explicit instead of ad hoc
- keep harness rules and validation aligned with the actual repository shape

---

## Decision

We will make the template default to a Bun workspace monorepo with Turbo orchestration.

> The repository will scaffold `apps/web`, `apps/api`, and `packages/shared`, while the harness remains at the root.

---

## Rationale

**Considered alternatives:**
- **Option A (chosen): Bun workspaces + Turbo** — keeps the runtime stack consistent and adds task orchestration without replacing the harness.
- **Option B: Bun workspaces only** — simpler, but weaker for cross-workspace task execution and caching.
- **Option C: Keep a single-package template** — rejected because it pushes multi-app structure into later migrations.

---

## Consequences

### Positive
- Multi-app and shared-library projects start from a structure that matches likely growth.
- Validation and docs describe the same repository shape.
- Cross-workspace boundaries become explicit earlier.

### Negative / Trade-offs
- Initialization and validation logic are more complex.
- More files exist in the ready template baseline.

### Risks
- **Workspace drift:** packages diverge in script conventions — *Mitigation: root scripts and Turbo tasks stay canonical.*

---

## Implementation Notes

- Root `package.json` owns workspaces and Turbo orchestration.
- Layer rules apply inside each workspace under `src/`.
- Cross-workspace imports should use public package names, not deep file paths.
