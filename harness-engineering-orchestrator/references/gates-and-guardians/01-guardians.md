## 01. Guardians

### Purpose

Define persistent constraints that remain effective throughout the entire process.

> **Authoritative source**: `references/harness-types.ts` (`GUARDIANS` constant) is the single source of truth for guardian IDs, names, surfaces, `activeFrom`, and `liteMode`. This document provides supplementary enforcement details and examples.

### Guardians

#### G1 — PRD is the single source of requirements

- **Rule**: Every feature, task, and milestone must trace back to `docs/PRD.md`. No implementation work begins without a PRD entry.
- **Detection**: Orchestrator verifies PRD mapping before dispatching any task. PR body must reference `PRD#F[ID]`.
- **Violation handling**: Block task dispatch; require PRD update before proceeding.
- **Owner**: Orchestrator

#### G2 — Do not commit feature code directly on `main`

- **Rule**: All feature work must land on a feature or worktree branch. Only merge commits reach `main` / `master`.
- **Detection**: Orchestrator checks `currentWorktree` before commits. Git pre-commit hook blocks direct commits at Standard/Full; warns at Lite.
- **Violation handling**: Blocking at Standard/Full — reject the commit and instruct the developer to create a branch. Warning at Lite.
- **Active from**: EXECUTING (not SCAFFOLD — no branches needed before code starts)
- **Owner**: Orchestrator

#### G3 — No single file exceeds 400 lines

- **Rule**: Every source file (determined by `toolchain.sourceExtensions`) must stay at or below 400 lines.
- **Detection**: `bun harness:validate --milestone` runs line-count checks. CI step `Check file sizes` enforces the limit.
- **Violation handling**: Blocking — the file must be split before the task can be marked complete.
- **Owner**: Execution Engine

#### G4 — Banned patterns must not enter the repo

- **Rule**: Forbidden patterns (see G4 Detail below) must not appear in committed source code. Also: `LEARNING.md` must not be committed to the repo (belongs in `~/.codex/LEARNING.md` or `~/.claude/LEARNING.md`).
- **Detection**: `bun harness:validate --milestone` scans all source files against `FORBIDDEN_PATTERN_RULES`. Git pre-commit hook blocks LEARNING.md staging. CI checks for blocking patterns.
- **Violation handling**: Blocking patterns fail validation; warning patterns are flagged but do not block.
- **Owner**: Harness Validator

#### G5 — Dependency direction enforced

- **Rule**: Import direction must follow `types -> config -> lib -> services -> app`. Reverse imports are forbidden.
- **Detection**: `bun run check:deps` validates import graph. CI step `Verify dependency direction` runs on every PR.
- **Violation handling**: Blocking at Standard/Full — the violating import must be refactored before merge. Off at Lite (no ceremony for small projects).
- **Owner**: Execution Engine

#### G6 — Secrets must not enter the repo

- **Rule**: API keys, tokens, passwords, and credentials must never be committed. Use `.env.local` and `config/env.ts` instead.
- **Detection**: `bun harness:validate --phase EXECUTING` scans for secret patterns (`sk-...`, `Bearer ...`, `ghp_...`, hardcoded credentials). `.gitignore` must include `.env*`.
- **Violation handling**: Blocking — secret must be removed from history (force-push or BFG) and rotated immediately.
- **Owner**: Harness Validator

#### G7 — UI tasks must follow the design closed-loop

- **Rule**: Every UI task requires: (1) Frontend Designer produces a spec, (2) Execution Engine implements, (3) Design Reviewer validates. Commit must include `Design Review: ✅`.
- **Detection**: Orchestrator checks task type. If UI, it enforces the three-step loop and verifies the design review tag in the commit message.
- **Violation handling**: Blocking at Standard/Full — task cannot be completed without design review approval. Off at Lite (no design review ceremony for small projects).
- **Owner**: Orchestrator / Design Reviewer

#### G8 — `AGENTS.md` and `CLAUDE.md` always stay in sync

- **Rule**: Both files must be byte-identical at all times. Any edit to one must be mirrored to the other.
- **Detection**: `bun harness:validate` compares file hashes.
- **Violation handling**: Auto-enforced — the hook syncs the files rather than blocking. If sync fails, manual correction is required.
- **Owner**: Orchestrator

#### G10 — Atomic Commit rules

- **Rule**: Each task must land as exactly one commit. The commit message must include the Task-ID (`T[ID]`) and PRD mapping. No partial commits or multi-task bundles.
- **Detection**: `bun harness:validate --task T[ID]` verifies commit format and content.
- **Violation handling**: Blocking at Standard/Full. Warning at Lite (logged, does not block).
- **Owner**: Execution Engine

### Key Fences

- G3 / G4: `bun harness:validate --milestone`
- G6: `bun harness:validate --phase EXECUTING`
- G8: `bun harness:validate`
- G10: `bun harness:validate --task T[ID]`

### G4 Detail

- **blocking**: `console.log`, `: any`, `@ts-ignore`, `sk-...`, `Bearer ...`, `ghp_...`, `eval(`, `.innerHTML =`, `dangerouslySetInnerHTML`, hardcoded `http://` (non-localhost), `LEARNING.md` file
- **warning**: `TODO:`, `FIXME:`

### Automated Hook Enforcement

Guardians G2–G10 are enforced by automated hooks across three surfaces:

| Guardian | Hook Surface |
|----------|-------------|
| G2 | Git pre-commit + Claude PreToolUse(Bash) + Codex execpolicy (`--no-verify`) |
| G3 | Git pre-commit + Claude PreToolUse(Write) + Codex notify (warn) |
| G4 | Git pre-commit + Claude PreToolUse(Write\|Edit) + Codex notify (warn) |
| G5 | Git pre-push |
| G6 | Git pre-commit + Claude PreToolUse(Write\|Edit) + Codex notify (warn) |
| G7 | Runtime only (Orchestrator dispatch logic) |
| G8 | Git post-commit (auto-sync) + Claude PostToolUse(Write\|Edit) (auto-sync) |
| G10 | Git commit-msg |

See `references/hooks-guide.md` for details.

### Level-Specific Guardian Behavior

> **Source of truth**: `GUARDIANS[].liteMode` in `references/harness-types.ts`. Standard and Full are always `active`. The table below reflects that definition.

| Guardian | Lite | Standard | Full |
|----------|------|----------|------|
| G1 Scope Lock | active | active | active |
| G2 Branch Protection | warn | active | active |
| G3 File Size Limit | active | active | active |
| G4 Forbidden Patterns | active | active | active |
| G5 Dependency Direction | off | active | active |
| G6 Secret Prevention | active | active | active |
| G7 Design Review Gate | off | active | active |
| G8 Agent Sync (auto) | active | active | active |
| G10 Atomic Commit Format | warn | active | active |

- **active**: enforced, blocks on violation
- **warn**: logs a warning but does not block
- **off**: check is skipped entirely

### Prompt Injection Defense (Safety Principle)

This is not a guardian (no automated enforcement). See `references/safety-model.md` for the full trust hierarchy and instruction-level boundaries for handling external content (fetched URLs, API responses, user-pasted text).

### Doom-Loop Detection Integration

When doom-loop heuristics trigger (repeated file edits, state oscillation, token waste, etc.), the guardian system may temporarily escalate enforcement. See [references/error-and-recovery.md](../error-and-recovery.md) for the 6 heuristics and gear-drop protocol.
