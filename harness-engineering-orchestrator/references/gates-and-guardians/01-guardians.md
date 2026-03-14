## 01. Guardians

### Purpose

Define persistent constraints that remain effective throughout the entire process.

### Guardians

#### G1 — PRD is the single source of requirements

- **Rule**: Every feature, task, and milestone must trace back to `docs/prd/`. No implementation work begins without a PRD entry.
- **Detection**: Orchestrator verifies PRD mapping before dispatching any task. PR body must reference `PRD#F[ID]`.
- **Violation handling**: Block task dispatch; require PRD update before proceeding.
- **Owner**: Orchestrator

#### G2 — Do not commit feature code directly on `main`

- **Rule**: All feature work must land on a feature or worktree branch. Only merge commits reach `main` / `master`.
- **Detection**: CI rejects direct pushes to `main` for non-merge commits. Orchestrator checks `currentWorktree` before commits.
- **Violation handling**: Blocking — reject the commit and instruct the developer to create a branch.
- **Owner**: Orchestrator

#### G3 — No single file exceeds 400 lines

- **Rule**: Every source file (`.ts`, `.tsx`) must stay at or below 400 lines.
- **Detection**: `bun harness:validate --milestone` runs line-count checks. CI step `Check file sizes` enforces the limit.
- **Violation handling**: Blocking — the file must be split before the task can be marked complete.
- **Owner**: Execution Engine

#### G4 — Banned patterns must not enter the repo

- **Rule**: Forbidden patterns (see G4 Detail below) must not appear in committed source code.
- **Detection**: `bun harness:validate --milestone` scans all source files against `FORBIDDEN_PATTERN_RULES`. CI steps check for `console.log`, `eval(`, and `innerHTML`.
- **Violation handling**: Blocking patterns fail validation; warning patterns are flagged but do not block.
- **Owner**: Harness Validator

#### G5 — Dependency direction enforced

- **Rule**: Import direction must follow `types -> config -> lib -> services -> app`. Reverse imports are forbidden.
- **Detection**: `bun run check:deps` validates import graph. CI step `Verify dependency direction` runs on every PR.
- **Violation handling**: Blocking — the violating import must be refactored before merge.
- **Owner**: Execution Engine

#### G6 — Secrets must not enter the repo

- **Rule**: API keys, tokens, passwords, and credentials must never be committed. Use `.env.local` and `config/env.ts` instead.
- **Detection**: `bun harness:validate --phase EXECUTING` scans for secret patterns (`sk-...`, `Bearer ...`, `ghp_...`, hardcoded credentials). `.gitignore` must include `.env*`.
- **Violation handling**: Blocking — secret must be removed from history (force-push or BFG) and rotated immediately.
- **Owner**: Harness Validator

#### G7 — UI tasks must follow the design closed-loop

- **Rule**: Every UI task requires: (1) Frontend Designer produces a spec, (2) Execution Engine implements, (3) Design Reviewer validates. Commit must include `Design Review: pass`.
- **Detection**: Orchestrator checks task type. If UI, it enforces the three-step loop and verifies the design review tag in the commit message.
- **Violation handling**: Blocking — task cannot be completed without design review approval.
- **Owner**: Orchestrator / Design Reviewer

#### G8 — `AGENTS.md` and `CLAUDE.md` always stay in sync

- **Rule**: Both files must be byte-identical at all times. Any edit to one must be mirrored to the other.
- **Detection**: `bun harness:validate` compares file hashes. CI can diff the two files.
- **Violation handling**: Blocking — synchronize `CLAUDE.md` so it matches `AGENTS.md` exactly before proceeding.
- **Owner**: Orchestrator

#### G9 — LEARNING.md must not enter the repo

- **Rule**: `LEARNING.md` belongs in the user-level knowledge base (`~/.codex/LEARNING.md` or `~/.claude/LEARNING.md`), not in the project repository.
- **Detection**: `bun harness:validate` checks for the presence of `LEARNING.md` in the project root or any subdirectory.
- **Violation handling**: Blocking — delete the file from the repo and move content to the user-level location.
- **Owner**: Harness Validator

#### G10 — Atomic Commit rules

- **Rule**: Each task must land as exactly one commit. The commit message must include the Task-ID (`T[ID]`) and PRD mapping. No partial commits or multi-task bundles.
- **Detection**: `bun harness:validate --task T[ID]` verifies commit format and content. PR checks validate Task-ID presence.
- **Violation handling**: Blocking — squash or restructure commits to meet the atomic requirement before merge.
- **Owner**: Execution Engine

### Key Fences

- G3 / G4: `bun harness:validate --milestone`
- G6: `bun harness:validate --phase EXECUTING`
- G8: `bun harness:validate`
- G10: `bun harness:validate --task T[ID]`

### G4 Detail

- blocking: `console.log`, `: any`, `@ts-ignore`, `sk-...`, `Bearer ...`, `ghp_...`, `eval(`, `.innerHTML =`, `dangerouslySetInnerHTML`, hardcoded `http://` (non-localhost)
- warning: `TODO:`, `FIXME:`

### Automated Hook Enforcement

Guardians G2-G10 are also enforced by automated hooks across three surfaces:

| Guardian | Hook Surface |
|----------|-------------|
| G2 | Git pre-commit + Claude PreToolUse(Bash) + Codex execpolicy (`--no-verify`) |
| G3 | Git pre-commit + Claude PreToolUse(Write) + Codex notify (warn) |
| G4 | Git pre-commit + Claude PreToolUse(Write\|Edit) + Codex notify (warn) |
| G5 | Git pre-push |
| G6 | Git pre-commit + Claude PreToolUse(Write\|Edit) + Codex notify (warn) |
| G8 | Git post-commit + Claude PostToolUse(Write\|Edit) |
| G9 | Git pre-commit + Codex execpolicy |
| G10 | Git commit-msg + Claude PreToolUse(Bash) |

See `references/hooks-guide.md` for details.
