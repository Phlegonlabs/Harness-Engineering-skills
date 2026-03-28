# System Architecture

> This document describes *how* the system is structured, not *what* it does (that's `product.md`).
> Agents read this to understand constraints before implementing.
> Replace all `[...]` placeholders with your system's details, or run `bun run harness:discover` for a guided interview.

---

## Architecture Overview

[Describe your system's high-level structure. Include a text diagram of major components and how they relate.]

---

## Dependency Layer Model

This project enforces a strict dependency layer order. See `harness/rules/dependency-layers.json` for machine-readable rules.

```
Types → Config → Repo → Service → Runtime → UI
```

**Rule:** Each layer may only import from layers below (to the left) of it.
**Enforcement:** `bun run harness:lint` checks this on every commit.

| Layer | Directory | Allowed Imports |
|-------|-----------|-----------------|
| `types` | `apps/*/src/types/`, `packages/*/src/types/` | (none — foundational) |
| `config` | `apps/*/src/config/`, `packages/*/src/config/` | `types` |
| `repo` | `apps/*/src/repo/`, `packages/*/src/repo/` | `types`, `config` |
| `service` | `apps/*/src/service/`, `packages/*/src/service/` | `types`, `config`, `repo` |
| `runtime` | `apps/*/src/runtime/`, `packages/*/src/runtime/` | `types`, `config`, `repo`, `service` |
| `ui` | `apps/*/src/ui/`, `packages/*/src/ui/` | all layers |

---

## System Boundaries

| System | Direction | Protocol | Notes |
|--------|-----------|----------|-------|
| [External system 1] | inbound | [protocol] | [Notes] |
| [External system 2] | outbound | [protocol] | [Notes] |

---

## Interfaces & Contracts

[Interface 1: describe the main interface or API contract your system exposes or depends on.]

---

## Execution Constraints

| Constraint | Impact on Milestones | Notes |
|-----------|----------------------|-------|
| [Constraint 1] | [Impact] | [Notes] |

---

## Cross-Cutting Concerns

| Concern | Approach |
|---------|----------|
| **Logging** | [Describe logging approach] |
| **Error handling** | [Describe error handling approach] |
| **Authentication** | [Describe auth approach] |
| **Configuration** | [Describe config approach] |
| **Code organization** | [Describe code organization approach] |

---

## Build / Distribution / Deployment

```bash
# [your build command]
```

---

## Technical Risks

| Risk | Likelihood | Impact | Mitigation |
|------|-----------|--------|------------|
| [Risk 1] | [Low/Medium/High] | [Low/Medium/High] | [Mitigation] |

---

## Validation Plan

1. [Step 1]
2. [Step 2]

---

## Architecture Readiness Checklist

- [ ] System boundaries are explicit
- [ ] Dependency direction is explicit
- [ ] Interfaces/contracts are explicit enough to implement
- [ ] Execution constraints for milestone splitting are explicit
- [ ] No critical architecture unknown blocks backlog generation

---

*Last updated: [date] | Owner: [name]*
