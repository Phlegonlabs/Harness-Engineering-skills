# ADR-001: Adopt local Harness runtime

> **Status**: Accepted
> **Date**: 2026-03-14
> **Related Task**: T001
> **Decision maker**: Harness Engineering and Orchestrator

---

## Background

The project needs a local closed-loop for state, progress, and validation right after initialization, rather than relying on external skill paths.

## Options Evaluated

### Option A: Fully rely on external skill paths

**Pros**
- External files maintained in one place

**Cons**
- Not portable after project generation
- Cannot operate self-sufficiently within the repo

### Option B: Copy `.harness` runtime into the project

**Pros**
- Project is portable
- `validate` / `init` / `resume` can run directly within the repo

**Cons**
- Runtime templates need to be maintained in sync

## Decision

Adopt Option B: Copy `.harness` runtime into the project.
