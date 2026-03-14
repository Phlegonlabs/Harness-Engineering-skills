# Harness Engineering Skills

Public skill repository for Harness Engineering workflows.

This repository currently publishes one installable skill:

- `harness-engineering-orchestrator`: orchestrate a new or existing software project through discovery, planning, scaffold setup, execution, and validation

## What Is Harness Engineering?

Harness Engineering is a practical way to build software with AI agents where the repository, not the chat, is the source of truth.

Instead of leaving planning and execution context trapped in a conversation, the important project state is written into versioned files such as `AGENTS.md`, `CLAUDE.md`, `docs/PRD.md`, `docs/ARCHITECTURE.md`, `docs/PROGRESS.md`, and `.harness/state.json`. That makes agent work resumable, reviewable, and handoff-friendly across Claude Code and Codex.

## Core Ideas

- Chat is input; repo files are state.
- Planning is not complete until repo-backed artifacts are updated.
- Execution is not complete until code, validation, and task state agree.
- Handoffs should work from repository state alone, without relying on chat memory.

## What This Skill Does

`harness-engineering-orchestrator` is an orchestration skill, not just a repo generator.

It is designed for two common starting points:

- `Greenfield`: start from an idea and drive the project through discovery, market research, stack selection, PRD, architecture, scaffold, execution, and validation
- `Existing codebase`: hydrate an existing repository with the Harness runtime, documents, milestone tracking, and validation gates

Typical requests include:

- `Bootstrap a new project with Harness Engineering.`
- `Turn this repo into a Harness-managed workflow.`
- `Create a PRD, architecture, milestone backlog, and execution loop for this app.`
- `Retrofit this existing codebase for Claude Code and Codex collaboration.`

## Workflow Phases

The orchestrator centers the project around a controlled lifecycle:

```text
DISCOVERY -> MARKET_RESEARCH -> TECH_STACK -> PRD_ARCH -> SCAFFOLD -> EXECUTING -> VALIDATING -> COMPLETE
```

The goal is to keep product intent, architecture, backlog state, and validation gates synchronized as the work moves forward.

## What It Produces

Depending on project type and current repo state, the skill can create or maintain:

- `docs/PRD.md` for scope, milestones, requirements, and acceptance criteria
- `docs/ARCHITECTURE.md` for system shape, dependency direction, data flow, and technical constraints
- `docs/PROGRESS.md` for milestone and task tracking
- `.harness/state.json` and related runtime files
- `AGENTS.md` and `CLAUDE.md` as the agent operating contract
- `docs/adr/` and `docs/gitbook/` as supporting documentation surfaces
- scaffold files, CI/CD baselines, and validation commands required for execution

## Why This Is Useful

Most agent-assisted projects break down in the same places: plans stay trapped in chat, handoffs lose context, and task status drifts away from the actual codebase.

Harness Engineering addresses that by making project state explicit and versioned. Humans and agents can inspect the same artifacts, resume safely, and keep progress synchronized over time.

## Install

This repository publishes the skill from the `harness-engineering-orchestrator/` directory:

```bash
npx skills add https://github.com/Phlegonlabs/Harness-engineering-skills --skill harness-engineering-orchestrator
```

## Quick Usage

After installing, prompts like these should trigger the skill:

- `Bootstrap a new TypeScript monorepo with Harness Engineering.`
- `Retrofit this existing repo with PRD, architecture, progress tracking, and Harness validation.`
- `Turn this app idea into milestones and a validated execution workflow.`
- `Set up a repo-backed project workflow for Claude Code and Codex.`

## Repository Layout

```text
Harness-engineering-skills/
├── README.md
├── README.en.md
├── README.zh-CN.md
└── harness-engineering-orchestrator/
    ├── SKILL.md
    ├── agents/
    ├── references/
    ├── scripts/
    └── templates/
```

- `README.md`: language selector for the public repository landing page
- `README.en.md`: English overview
- `README.zh-CN.md`: Chinese overview
- `harness-engineering-orchestrator/SKILL.md`: the skill contract used by the runtime
- `harness-engineering-orchestrator/agents/`: role-specific operating guides
- `harness-engineering-orchestrator/references/`: templates, rules, and supporting references
- `harness-engineering-orchestrator/scripts/`: setup and supporting automation

## Read More

- [Chinese README](./README.zh-CN.md)
- [Skill Contract](./harness-engineering-orchestrator/SKILL.md)
