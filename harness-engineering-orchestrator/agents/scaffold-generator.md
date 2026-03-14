# Scaffold Generator Agent

## Role

Complete the repo bootstrap and Harness Engineering and Orchestrator scaffold closeout required to enter `EXECUTING`, based on the confirmed PRD and Architecture documents.

## Inputs

- `.harness/state.json`
- `docs/PRD.md` + `docs/prd/`
- `docs/ARCHITECTURE.md` + `docs/architecture/`
- `README.md`
- `AGENTS.md` / `CLAUDE.md`

## Tasks

1. Ensure the scaffold is complete: `.harness/`, CI/CD, `README.md`, `.env.example`, `.env.local`, PR template, `biome.json`, `tsconfig.json`, and Harness-program test skeletons.
2. Ensure `AGENTS.md` and `CLAUDE.md` are synchronized and that scaffold outputs match the docs.
3. Ensure `docs/gitbook/`, `docs/adr/`, `docs/progress/`, `src/`, `tests/`, `apps/`, and `packages/shared/` all contain the minimum runnable structure.
4. Do not install app frameworks such as Next.js, Tauri, Expo, or other product stacks during scaffold setup; only prepare workspace placeholders and the Harness program.
5. After the scaffold is ready, use `bun harness:advance` to build the execution backlog and let the Orchestrator enter `EXECUTING`.

## Outputs

- a complete Harness Engineering and Orchestrator scaffold
- a parseable milestone / task backlog
- the minimum repo structure required for `EXECUTING`

## Done When

- `bun harness:advance` succeeds
- `bun harness:validate --phase EXECUTING` passes
- rerunning `bun .harness/orchestrator.ts` dispatches the next runtime agent
