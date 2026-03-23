# ADR Template (Architecture Decision Record)

ADR records **why a particular technical decision was made**, so that future Agents and developers don't have to re-derive the reasoning.

**Location**: `docs/adr/ADR-[N]-[kebab-case-topic].md`

**Auto-trigger timing**:
- Phase 2 Tech Stack Negotiation — each time a choice is confirmed
- When an alternative approach is chosen during a Debug Loop
- After a Spike Task is completed
- Any significant architectural change

---

```markdown
# ADR-[N]: [Decision Title]

> **Status**: Proposed / ✅ Adopted / ❌ Deprecated / 🔄 Superseded (by ADR-[M])
> **Date**: [DATE]
> **Related Task**: T[ID]
> **Decided by**: [Harness Engineering and Orchestrator / User]

---

## Background

[Why was this decision needed? What problem or requirement are we facing?]

## Evaluated Options

### Option A: [Name]
**Pros**:
- [Pro 1]
- [Pro 2]

**Cons**:
- [Con 1]
- [Con 2]

### Option B: [Name]
**Pros**:
- [Pro 1]

**Cons**:
- [Con 1]

### Option C: [Name] (if applicable)
[Same format as above]

## Decision

**Adopted: Option [A/B/C] — [Name]**

Rationale: [Why this option best meets the requirements, and the specific reasons for excluding other options]

## Consequences

**Positive**:
- [Expected benefits]

**Negative / Trade-offs**:
- [Accepted limitations or costs]

**Risks**:
- [Potential risks and how to mitigate them]

## Related Resources

- [Document links]
- [Referenced Issues or discussions]
```

---

## Naming Convention

```
docs/adr/ADR-001-chose-drizzle-over-prisma.md
docs/adr/ADR-002-vercel-over-cloudflare.md
docs/adr/ADR-003-better-auth-over-clerk.md
docs/adr/ADR-004-replace-redis-with-upstash.md
```

- Three-digit number, auto-incrementing
- kebab-case, starting with a verb (chose, use, replace, adopt, reject)
- Deprecated ADRs are kept (not deleted); status changed to "Deprecated" or "Superseded"

## Initialize ADR Directory

Created during Phase 3 document generation:

```bash
mkdir -p docs/adr
cat > docs/adr/README.md << 'EOF'
# Architecture Decision Records

This directory records all significant technical decisions.

| ADR | Title | Status | Date |
|-----|-------|--------|------|
| [ADR-001](ADR-001-xxx.md) | [Title] | ✅ Adopted | [DATE] |

To add a new ADR, follow the format in `references/adr-template.md`.
EOF
```
