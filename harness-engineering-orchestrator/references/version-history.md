# Version History

## Purpose

Describe the delivery-phase lifecycle, approval model, document version tracking, and snapshot mechanism that governs how a Harness project evolves across V1, V2, V3, and beyond.

## Delivery-Phase Lifecycle

Harness now tracks two separate concerns for each delivery phase:

- **Approval status**: `pending -> approved`
- **Execution status**: `draft -> executing -> deploy_gate -> complete`

Legacy product-stage status is still retained for backward compatibility and version snapshots. The legacy stage progression remains:

```
DEFERRED -> ACTIVE -> DEPLOY_REVIEW -> COMPLETED
```

| Status | Meaning |
|--------|---------|
| `DEFERRED` | Defined in the PRD but not yet executing |
| `ACTIVE` | Currently being executed after explicit plan + phase approval |
| `DEPLOY_REVIEW` | All milestones for this stage are merged; awaiting real-world review |
| `COMPLETED` | Deploy review passed; the next stage has been promoted |

Only one delivery phase may be executing at a time. The runtime enforces this with `state.roadmap.activePhaseId`, `state.roadmap.planApprovalStatus`, and `state.roadmap.phases[]`. `getCurrentProductStage()` remains the legacy stage resolver, while `getCurrentDeliveryPhase()` resolves the active phase contract.

## Stage Promotion

Promotion is performed with `bun .harness/stage.ts --promote V2`. The command:

1. Verifies the current stage is in `DEPLOY_REVIEW`
2. Resolves the next deferred stage via `getNextDeferredProductStage()`
3. Verifies the target delivery phase is explicitly approved with `bun harness:approve --phase V2`
4. Validates that PRD and Architecture document versions match the target stage using `expectedVersionPattern()` (e.g., stage `V2` requires a version matching `^v2(\b|\.)`)
5. Snapshots both documents into versioned paths
6. Marks the current stage `COMPLETED` and the target stage `ACTIVE`
7. Re-syncs execution milestones and public docs

Use `bun .harness/stage.ts --status` to inspect the current roadmap without making changes.

## Document Version Snapshots

When a stage is promoted, the current PRD and Architecture documents are frozen as point-in-time snapshots:

| Document | Snapshot Path |
|----------|---------------|
| PRD | `docs/prd/versions/prd-v1.md` |
| Architecture | `docs/architecture/versions/architecture-v1.md` |

The slug is derived from the stage ID (`v1`, `v2`, etc.). Snapshots are written by `writeSnapshot()` in `harness-stage.ts` and are never overwritten.

## Version Parsing

Document versions are extracted from the first line matching the pattern:

```
> **Version**: v1.2
```

The parser lives in `shared.ts` (`parseDocumentVersion()`). The version string is stored in `state.docs.prd.version` and `state.docs.architecture.version`.

## Key Functions

| Function | File | Role |
|----------|------|------|
| `getCurrentDeliveryPhase()` | `runtime/stages.ts` | Resolve the active delivery phase |
| `getCurrentProductStage()` | `runtime/stages.ts` | Resolve the legacy active stage |
| `getNextDeferredProductStage()` | `runtime/stages.ts` | Find the next promotable stage |
| `approvePlan()` | `runtime/stages.ts` | Record overall plan approval |
| `approveDeliveryPhase()` | `runtime/stages.ts` | Record approval for one delivery phase |
| `expectedVersionPattern()` | `harness-stage.ts` | Build regex for stage-version validation |
| `markStageDeployReview()` | `runtime/stages.ts` | Transition a stage to `DEPLOY_REVIEW` |
| `stageIsReadyForDeployReview()` | `runtime/stages.ts` | Check that all stage milestones are merged |

## Inspecting Stage Status

```bash
bun .harness/stage.ts --status
```

Prints the runtime phase, overall plan approval, current delivery phase approval/execution status, the legacy active stage, PRD and Architecture versions, and the full roadmap with per-phase version labels.

## Release History

### v1.8.6

- Added a reusable repo validation workflow and made both PR CI and release gating call the same validation chain
- Introduced a dedicated Windows E2E workflow for scheduled or manual deep-matrix coverage with retained reports
- Standardized contributor verification on `node scripts/validate-repo.mjs` and tightened CI-related contract checks to catch documentation drift earlier

### v1.8.5

- Switched Bun greenfield scaffolds to a workspace-first monorepo layout rooted in `apps/<surface>` and `packages/shared`
- Made generated Bun repo entry scripts (`bun run lint/typecheck/test/build`) dispatch through Turborepo while keeping Harness lifecycle commands unchanged
- Updated scaffold templates, public docs, and E2E expectations so Bun/TypeScript repos describe and validate the new Turborepo-backed workflow consistently
- Kept the published Bun ecosystem contract stable in runtime state by routing the change through generated scripts and `sourceRoot = "."` for greenfield Bun monorepos
- Fixed the end-to-end matrix so deep orchestrator checks match the current delivery-phase approval model and deferred-stage behavior
- Hardened E2E assertions to use generated milestone IDs instead of stale hardcoded IDs after roadmap expansion and scope-change application
- Made the E2E runner fail the process when any smoke, command, or deep coverage step fails, so CI and release tagging reflect the real result

### v1.8.3

- Fixed the guardian table in `SKILL.md` so published guardian behavior matches `harness-types.ts`
- Removed the dangling `$schema` reference in `config.example.json` pointing to a non-existent `config.schema.json`
- Parameterized hardcoded Bun references in templates with `[PACKAGE_MANAGER]`, `[WORKSPACE_MODEL]`, and ecosystem-aware `[INSTALL_COMMAND]`
- Added a clarifying comment in `package.json.template` explaining `harness:*` scripts are injected by setup at runtime

### v1.8.2

- Unified the published approval model around `Project Plan -> Delivery Phase -> Milestone -> Task` across runtime docs, prompts, and generated project surfaces
- Updated Fast Path, scaffold closeout, public-doc generation, and project templates so execution starts only after `bun harness:approve --plan` and `bun harness:approve --phase V1`
- Added approval-aware resume and compact output so paused projects clearly show whether they are blocked on plan approval, phase approval, or deploy review
- Realigned backlog parsing, version-history guidance, and reference docs so PRD phase headings remain planning metadata while runtime approval state stays in `.harness/state.json`

### v1.8.1

- Unified Claude hook config generation so initial setup and `harness:hooks:install` restore the same matcher-based `.claude/settings.local.json`
- Fixed Codex local config merge so all managed lines are preserved and post-clone recovery restores the expected notify hook
- Made Codex notify warnings toolchain-aware instead of hardcoding `src/`, so custom source roots/extensions behave consistently with runtime validation
- Enforced `maxParallelMilestones` and `enableInterMilestone` in the parallel dispatcher instead of exposing them as documentation-only fields
- Hardened setup environment checks so missing executables surface install guidance instead of crashing the bootstrap flow

### v1.8.0

- Added a consolidated `## Gotchas` section with 10 high-signal failure modes and cross-reference links
- Added `## Team Configuration` and `config.example.json` so teams can pre-set defaults via `config.json` in the skill directory
- Added `HarnessSkillConfig` to `harness-types.ts` and `loadSkillConfig()` to `shared.ts`; `createContext()` now merges config defaults with CLI and discovery overrides
- Added `AGENTS.md` and `CLAUDE.md` at the repo root for contributor-facing agent instructions
- Added `.github/workflows/ci.yml` so PR validation runs `bun test` and the skill contract checker on every push or PR to `main`
- Added `SKILLS.md` catalog index and `docs/new-skill-guide.md` for new skill contributors

### v1.7.0

- Realigned workflow, agent prompts, templates, and references to the latest PRD contract instead of legacy repo-generator wording
- Made runtime defaults toolchain-aware so existing repositories block on unconfigured commands instead of silently falling back to Bun
- Updated validation to execute project-specific commands and scan project-specific source surfaces
- Reworked public-facing README surfaces with stronger GitHub positioning, badges, and 1-minute onboarding demos
- Tightened repository metadata and skill presentation so install, discovery, and release surfaces match the current product story

### v1.6.0

- Aligned Codex orchestration with the native subagent lifecycle instead of independent-session semantics
- Added orchestrator-owned dispatch policy, active-agent ownership tracking, and parallel runtime state integrity rules
- Preserved the UI design loop in parallel dispatch so `frontend-designer -> execution-engine -> design-reviewer` cannot be bypassed
- Introduced launcher-facing execution contracts for `harness:orchestrate`, result integration, and child lifecycle verification
- Added regression coverage for parallel dispatch routing and parallel execution completion semantics

### v1.5.0

- Added the skill contract validation script (`scripts/check-skill-contract.mjs`) and manifest (`scripts/contract-manifest.json`)
- Hardened runtime coverage in `phase-structural.ts` and `phase-readiness.test.ts`
- Pruned the agent registry and tightened orchestrator and project-discovery prompts
- Refined the autoflow algorithm and discovery questionnaire for Lite batching
- Updated the E2E matrix (`run-matrix.ps1`) and setup core (`core.ts`)
- Expanded the README with operator guide improvements and new reference tables

### v1.4.0

- Expanded the agent registry with refined agent definitions and role boundaries
- Hardened runtime state transitions and phase-gate validation logic
- Added observability hooks for milestone progress and task throughput tracking
- Introduced a CI release workflow for automated version tagging and artifact publishing

### v1.3.0

- Reduced `SKILL.md` to the operating contract instead of a full manual
- Centered the workflow on `PRD -> Architecture -> Milestone -> Task -> Validation`
- Moved detailed prompts and appendix material into `references/`
- Added `agents/openai.yaml` so the skill has explicit UI metadata
