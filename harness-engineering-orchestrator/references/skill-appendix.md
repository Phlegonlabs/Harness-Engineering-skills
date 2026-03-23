# Skill Appendix

Use this file only when the user asks for the supporting machinery behind the main workflow.

## Primary vs Secondary Artifacts

The workflow is intentionally centered on four user-facing planning surfaces:

- `docs/PRD.md`
- `docs/ARCHITECTURE.md`
- `docs/PROGRESS.md`
- milestone / task state in the Harness runtime

Everything else is secondary and should usually be generated, synchronized, or validated in the background.

## Secondary Artifact Groups

| Group | Purpose |
|------|---------|
| `AGENTS.md` + `CLAUDE.md` | Toolchain guardrails and execution rules |
| `docs/adr/` | Architecture decision records |
| `docs/gitbook/` | Public documentation output |
| `.harness/` | Machine-readable project state and validation runtime |
| `.github/` | CI/CD and contribution workflow |
| `templates/` | Scaffold source material |
| `references/` | Read-on-demand implementation guidance |
| `.harness/runtime/hooks/` | Automated guardian enforcement (git hooks + Claude Code hooks) |

## Environment Baseline

- Bun is the preferred package manager
- Node.js 20+ may still be required by some tools
- iOS development requires macOS and Xcode tooling

Example Bun install commands:

```bash
# macOS / Linux
curl -fsSL https://bun.sh/install | bash

# Windows PowerShell
powershell -c "irm bun.sh/install.ps1 | iex"
```

## Agent Map

| File | When to read it |
|------|-----------------|
| `agents/orchestrator.md` | state model, phase transition rules, handoff format |
| `agents/project-discovery.md` | discovery persistence behavior |
| `agents/market-research.md` | research tasks and output format |
| `agents/tech-stack-advisor.md` | one-layer-at-a-time stack negotiation |
| `agents/prd-architect.md` | PRD and Architecture generation |
| `agents/scaffold-generator.md` | scaffold closeout and entry into `EXECUTING` |
| `agents/execution-engine.md` | task loop, spike flow, scaffold details, debugging |
| `agents/frontend-designer.md` | UI spec creation before UI tasks |
| `agents/design-reviewer.md` | design acceptance after UI implementation |
| `agents/harness-validator.md` | final validation and score |
| `agents/code-reviewer.md` | independent code quality review for non-UI tasks |
| `agents/context-compactor.md` | context retention and closeout snapshots |

## Reference Map

| File | Purpose |
|------|---------|
| `references/document-templates.md` | PRD and Architecture document templates |
| `references/gates-and-guardians.md` | phase gates and guardian rules |
| `references/worktree-workflow.md` | branch and worktree operations |
| `references/stacks.md` and `references/stacks/` | stack-specific bootstrap guidance |
| `references/html-prototype-guide.md` | HTML prototype generation rules and structure |
| `references/hooks-guide.md` | Hook system architecture and guardian enforcement |
| `references/error-and-recovery.md` | error taxonomy, doom-loop detection, state recovery |
| `references/concurrency.md` | parallel execution, worktree sessions, OCC |
| `references/observability.md` | metrics, dev server, logging, and performance budgets |
| `references/advanced/` | advanced-only references (GitBook, ADR, database migration, feature flags, cross-platform, CI templates) |

## Repo Inventory Summary

At a high level, a scaffolded project normally contains:

- root operational files such as `README.md`, `AGENTS.md`, `CLAUDE.md`, `.env.example`, and `gitbook.yaml`
- internal project docs under `docs/`
- runtime state under `.harness/`
- source code under `src/`
- tests under `tests/`
- CI/CD under `.github/`

Do not default to explaining the whole tree to the user. Surface only what matters to the current milestone or task.

## Optional Best Practices

These are useful additions, but they should not distract from the core flow:

- dependency boundary checks with `dependency-cruiser`
- structured application error types
- explicit module exports
- synchronized IDE rules when the team uses IDE agents heavily

The core workflow should still function if these remain deferred.
