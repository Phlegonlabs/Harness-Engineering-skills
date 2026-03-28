# ADR-001: Adopt Harness Engineering Methodology

**Date:** 2026-03-23
**Status:** Accepted
**Deciders:** Project leads

---

## Context

As AI coding agents (Claude Code, Codex, Copilot, etc.) become capable of writing entire codebases, the engineering discipline shifts from *writing code* to *designing environments that enable agents to write reliable code*.

Without explicit constraints, feedback loops, and documentation structure:
- Agent outputs are inconsistent across sessions
- Architectural drift accumulates silently
- Each agent session re-discovers (or re-violates) the same conventions
- Code quality degrades because agents optimize locally, not globally

The question is: what infrastructure do we put in place to make agent-assisted development reliable at scale?

---

## Decision

We adopt **Harness Engineering** as the foundational methodology for this project, built on three pillars:

> We will structure the repository around Context Engineering, Architectural Constraints, and Entropy Management — encoding conventions as machine-readable rules that both linters and agents consume.

---

## Rationale

**Considered alternatives:**

- **Option A (chosen): Harness Engineering** — Encodes constraints as files in the repo (JSON rules, Bun/TypeScript validators, structural tests). Agents read the same rules that enforce them. Works offline and is language-agnostic.

- **Option B: Style guide document only** — Rejected because it requires agents to interpret prose and self-enforce. Inconsistent and unverifiable.

- **Option C: External linting service** — Rejected because it couples the project to an external tool and adds runtime dependency. Rules should live in the repo.

- **Option D: No structure, ad-hoc prompting** — Rejected because it produces inconsistent results across agent sessions and accumulates technical debt.

**Key reasons for choosing Harness Engineering:**
- Constraints are verifiable (linters fail loudly)
- Rules live in the repo (visible to agents and humans)
- Works with any AI tool (language-agnostic)
- The harness itself is inspectable and improveable

---

## Consequences

### Positive
- Agent outputs are reproducible and consistent across sessions
- Violations are caught at commit time with actionable error messages
- New team members (human or agent) can onboard from the repo itself
- The harness improves over time as new failure modes are encoded as rules

### Negative / Trade-offs
- Initial setup cost: ~2-4 hours to configure the harness for a new project
- Requires `Bun` and `git` in the development environment
- Golden rules need maintenance as the project evolves

### Risks
- **Over-constraining:** Rules that are too strict block legitimate work — *Mitigation: review rules quarterly, make them easy to propose changes to via ADRs*
- **Rule drift:** Linters diverge from documentation — *Mitigation: `bun run harness:entropy` runs weekly*

---

## Implementation Notes

The harness infrastructure lives in `harness/`:
- Rules: `harness/rules/*.json` — machine-readable golden rules
- Runtime: `harness/runtime/*.ts` — canonical Bun/TypeScript harness implementation
- Git hooks: `harness/hooks/` — enforced at commit/push time
- Package scripts: `bun run harness:*` — init, doctor, validate, plan, orchestration
- State: `.harness/state.json` — machine-owned planning and execution state

The full validation suite: `bun run harness:validate`
