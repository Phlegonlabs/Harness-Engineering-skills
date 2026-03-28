# Operator Guide

## First Use

```bash
git clone <repo> my-project && cd my-project
bun install
bun run harness:init -- my-project
bun run harness:doctor
```

## Start a Project

```bash
bun run harness:plan
```

The repository starts in a ready-to-customize state.
Use planning after you have reviewed or edited the baseline product and architecture docs.

Optional guided path:

```bash
bun run harness:discover --reset
```

Run discovery only when you want an interview-style PRD and architecture flow.

## Day-to-Day

```bash
bun run harness:doctor
bun run harness:validate
```

Optional commands:

```bash
bun run harness:orchestrate
bun run harness:parallel-dispatch -- --apply
```

## What Each Surface Means

- `docs/product.md`: PRD canon
- `docs/architecture.md`: architecture canon
- `docs/progress.md`: human-readable backlog
- `.harness/state.json`: machine-owned state

## Template Expectations

- The template validates before and after `harness:init`
- `project_name: "harness-template"` is the expected pre-init default
- `bun run harness:plan` should work immediately after initialization because the baseline docs are already valid
