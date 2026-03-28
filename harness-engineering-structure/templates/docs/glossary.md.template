# Glossary

Shared terminology for this project. Agents and humans use these terms consistently.
Add new terms as they emerge; update definitions when meaning shifts.

| Term | Definition | Context |
|------|-----------|---------|
| **Harness** | The set of constraints, tools, documentation, and feedback loops that keep an agent productive and on track | Harness Engineering methodology |
| **Agent** | An AI coding assistant (Claude Code, Codex, Copilot, etc.) that reads context and produces code | General |
| **Context Engineering** | The discipline of structuring repository knowledge so agents can navigate and reason about it | Pillar 1 |
| **Architectural Constraint** | A rule enforced mechanically (linter, structural test, CI check) that limits what code can look like | Pillar 2 |
| **Entropy Management** | Periodic scanning for drift, inconsistency, and orphaned files to prevent codebase rot | Pillar 3 |
| **Golden Rule** | An opinionated, mechanical rule that keeps the codebase legible and consistent across agent runs | harness/rules/ |
| **Dependency Layer** | One level in the `Types → Config → Repo → Service → Runtime → UI` hierarchy | Architecture |
| **Layer Boundary** | The constraint that a layer may only import from layers below it | Architecture |
| **Linter** | A Bun/TypeScript harness command that checks code against a golden rule and emits a teaching error message | Pillar 2 |
| **Structural Test** | A Bun/TypeScript harness command that verifies architectural compliance, not functional behavior | Pillar 2 |
| **Drift** | When two documents that should be consistent have diverged from each other | Pillar 3 |
| **Entropy Scan** | A Bun/TypeScript harness command that detects drift, orphans, or inconsistency | Pillar 3 |
| **Init** | Running `bun run harness:init -- <name>` to personalize the engineer template for a specific project | Setup |
| **Validate** | Running `bun run harness:validate` — the full CI contract | CI |
| **ADR** | Architecture Decision Record — a document capturing a significant architectural choice and its rationale | docs/decisions/ |
| **Three-Tier Boundary** | The ALWAYS / ASK FIRST / NEVER model for defining what agents may do without approval | AGENTS.md |
| **Single Source of Truth** | The principle that any fact or rule should live in exactly one place; all other references point to it | General |
| **Teaching Error Message** | A linter error that explains not just what's wrong but why and how to fix it | Pillar 2 |
| **Milestone** | The top-level execution unit. Independent milestones may run in parallel in separate worktrees | Orchestration |
| **Task** | A concrete implementation unit inside one milestone. Tasks are serial by default within a milestone | Orchestration |
| **Task Contract** | The repo-owned execution brief for one task, including scope, deliverables, validation, and out-of-scope constraints | `.harness/contracts/` |
| **Evaluator** | The independent task-level gate that decides whether a task iteration passes or returns for another loop | `bun run harness:evaluate` |
| **Handoff Artifact** | A machine-readable checkpoint that lets the next agent or session resume the current task safely | `.harness/handoffs/` |
| **Checkpoint Resume** | Restarting from the latest handoff artifact instead of relying on raw chat/session memory | Orchestration |
| **Worktree Dispatch** | Creating an isolated git worktree for one active milestone | Orchestration |
| **Progressive Disclosure** | Loading only the skills and documents needed for the current phase/task instead of preloading everything | Skills |
| **Skill Registry** | The repo-owned mapping from phase/task kind to skill files | `harness/skills/registry.json` |
