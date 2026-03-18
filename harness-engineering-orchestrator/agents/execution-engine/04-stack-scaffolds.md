## 04. Stack Scaffolds

### Purpose

In Phase 4, generate an executable project skeleton based on the confirmed stack.

> **Trigger context**: This sub-module is read as a reference by scaffold-generator during SCAFFOLD phase for stack-specific scaffold details. It is not dispatched as a live execution path during the Execution Engine's EXECUTING phase.

### Reference

- Detailed initialization scripts and differences: `references/stacks.md`

### Scaffold Responsibilities

1. Initialize repo / package manager
2. Generate Harness runtime
3. Generate monorepo workspace placeholders only. Do **not** bootstrap product frameworks yet.
4. Generate modular documentation:
   - `docs/prd/`
   - `docs/architecture/`
   - `docs/progress/`
   - `docs/ai/`
5. Generate thin entry points:
   - `AGENTS.md`
   - `CLAUDE.md`
   - `README.md`
   - `docs/PRD.md`
   - `docs/ARCHITECTURE.md`
   - `docs/PROGRESS.md`
6. Generate CI / PR template / `.env.example` / `.env.local` / Biome / GitBook / ADR
