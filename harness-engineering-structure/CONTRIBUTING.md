# Contributing to Harness Engineering Structure

Thanks for contributing. This skill provides the repository structure, validation rules, and planning commands for agent-first engineering.

## What Good Contributions Look Like

- Improve the validation pipeline (linters, structural tests, entropy scans)
- Strengthen the machine-readable rules or add teaching messages
- Improve templates for scaffolded projects
- Fix bugs in the planning/orchestration commands
- Improve documentation or reference docs
- Clarify agent specs so documented behavior matches implementation

Prefer small, decision-clear pull requests over broad refactors.

## Before Opening a PR

1. Keep the change scoped.
2. Update docs if behavior changes.
3. From the repo root, run the validation chain:

```bash
node scripts/validate-repo.mjs
```

## PR Expectations

- Explain what problem existed before.
- Explain what changed.
- State how the change was validated.
- Do not weaken validation rules without making the tradeoff explicit.

## Security

For security reports, do not open a public issue first. Use the process in the repo-level [SECURITY.md](../SECURITY.md).
