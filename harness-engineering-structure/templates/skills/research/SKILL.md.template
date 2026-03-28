# Skill: Research

Use this skill when you need to research the codebase, find existing patterns, or trace information flow **before making changes**.

## When to Use

- Before implementing in an unfamiliar area
- When you need to understand how data flows through the system
- When finding all usages of a pattern, type, or interface
- When investigating a bug or unexpected behavior

## Instructions

1. **Scope first** — Define exactly what you're looking for before diving in
2. **Use sub-agents** — Delegate heavy research to a sub-agent to keep the parent context clean
3. **Cite sources** — Always return results with `filepath:line` references
4. **Be concise** — Return a condensed summary, not raw file contents

## Research Checklist

- [ ] Check `docs/architecture.md` for module boundaries and layer model
- [ ] Check `docs/decisions/` for relevant ADRs
- [ ] Search for existing patterns with `Grep` tool
- [ ] Check test files for usage examples of the thing you're implementing

## Sub-Agent Pattern

When research is substantial, delegate to a sub-agent:

```
Agent prompt:
  "Research how [X] is implemented in this codebase.
   Return: key files, patterns used, things to watch out for.
   Focus on: [specific area]"
```

The sub-agent returns findings; you act on them. This keeps your context clean.

## Response Format

Structure research findings as:

```
## Findings
[Concise summary of what was found]

## Key Files
- `apps/api/src/service/auth.ts:42` — Main auth handler
- `packages/shared/src/repo/users.ts:15` — Shared lookup logic

## Patterns Observed
- [Pattern description]

## Recommendations
- [What to do / avoid based on findings]
```

## See Also

- `docs/architecture.md` — Layer model and domain boundaries
- `docs/internal/dependency-layers.md` — Import rules
- `docs/decisions/` — Past architectural decisions
