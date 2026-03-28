# Three-Tier Boundaries

This document defines what AI agents (and human contributors) may do without approval, what requires checking first, and what is never permitted.

The three-tier model prevents agents from taking unintended high-impact actions while keeping them unblocked on routine work.

---

## ALWAYS DO

These actions are expected on every work session. No approval needed.

| Action | Why |
|--------|-----|
| Run `bun run harness:validate` before handoff | Validation is the quality gate. Never skip it. |
| Follow the dependency layer order | Layer violations compound quickly across agent runs. |
| Use conventional commit format | Commit history must be machine-parseable for changelog generation and blame. |
| Update `docs/` when making architectural decisions | Undocumented decisions are invisible to the next agent. |
| Delete unused code completely | Backwards-compat stubs accumulate and confuse future agents. |
| Write structured log messages (no raw `console.log`) | Observability requires consistent log format. |
| Keep files under their size limits | Large files are harder for agents to reason about correctly. |

---

## ASK FIRST

These actions require checking with a human before proceeding. When in doubt, ask.

| Action | Why | How to Ask |
|--------|-----|------------|
| Adding a new external dependency | Dependencies change the supply chain and may conflict | Open a question, don't install yet |
| Creating a new top-level directory | Top-level dirs signal architectural scope; they should be intentional | Describe the purpose and proposed location |
| Modifying `harness/rules/` | Golden rules affect all future agent runs — changing them has compound effects | Propose the change and rationale; wait for ADR approval |
| Changing CI/CD workflow files | CI changes affect the entire team's workflow | Describe the change and impact |
| Schema or API contract changes | Breaking changes affect all consumers | Identify all callers before changing |
| Making irreversible infrastructure changes | Force pushes, table drops, secret rotations | Confirm explicitly before executing |

---

## NEVER DO

These actions are prohibited regardless of context. They represent risks too high to automate.

| Action | Why |
|--------|-----|
| Skip or bypass validation (`--no-verify`, deleting checks) | Broken states compound. Find and fix the root cause. |
| Break the dependency layer order | Layer violations corrupt the architecture that makes agents reliable. |
| Commit secrets, API keys, credentials, or tokens | Secrets in git history are a security incident. Use `.env` (gitignored). |
| Modify `.git/` directly | Direct git manipulation corrupts history and breaks team workflows. |
| Force push to `main`/`master` | Rewrites shared history, breaks other contributors' branches. |
| Write backwards-compat shims for removed features | Shims hide the removal and confuse future agents reading the code. |
| Keep commented-out code blocks | Dead code is noise. Delete it; git history preserves the previous version. |
| Leave TODO comments without an issue reference | Untracked TODOs disappear. Link to a tracking issue or resolve inline. |
| Take destructive actions without explicit confirmation | Even if instructed, verify before executing drops, deletes, or resets. |

---

## How Boundaries are Enforced

| Tier | Enforcement Mechanism |
|------|-----------------------|
| ALWAYS DO | `harness/hooks/pre-commit`, CI validation |
| ASK FIRST | PR review process, `harness/hooks/commit-msg` checks |
| NEVER DO | `bun run harness:lint`, `harness/hooks/pre-commit`, CI |

Boundary violations are caught at multiple levels:
1. **Pre-commit hook** — blocks the commit
2. **Linters** — reports the violation with remediation instructions
3. **CI** — fails the PR

---

## Proposing Changes to Boundaries

If you believe a boundary rule needs to change:
1. Understand why the current rule exists (check the "Why" column above)
2. Create an ADR in `docs/decisions/` explaining the change and its impact
3. Update this document after the ADR is approved
4. Update the Bun/TS lint runtime if the change affects forbidden patterns

*Never change boundaries unilaterally. They exist to protect all future agent runs.*
