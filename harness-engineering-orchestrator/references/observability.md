# Observability, Metrics, and Performance

Covers dev server lifecycle, structured logging, browser validation, the 5-category metrics system, and web performance budgets.

---

## Dev Server Lifecycle

### Boot

1. Read `state.toolchain.commands.build` and run it to produce the dev artifact
2. Allocate a port from the 3000-3999 range (scan for first available)
3. Start the dev server process and record `{ pid, port, milestoneId, startedAt }` in `state.observability.devServers[]`
4. Run a health check loop (see below)

### Health Check

- Method: HTTP GET to `http://localhost:{port}/`
- Timeout: 5 seconds per attempt
- Retry: up to 3 attempts with 2-second backoff
- On success: set `healthy: true` in the server entry
- On failure after retries: log a structured error, mark `healthy: false`, surface to the execution engine

### Port Allocation

- Range: 3000-3999
- Strategy: scan sequentially from 3000, skip ports that respond to a TCP connect
- On worktree switch, allocate a different port to avoid conflicts

### Cleanup

- On milestone merge or worktree removal, send SIGTERM to all dev servers for that milestone
- Remove the server entries from `state.observability.devServers[]`
- On process exit, clean up any orphaned server processes

---

## Structured Log Format

All harness runtime logs use a consistent JSON-line format:

```json
{
  "ts": "2026-03-16T12:00:00.000Z",
  "level": "info",
  "source": "execution-engine",
  "milestoneId": "M1",
  "taskId": "T001",
  "message": "Task validation passed",
  "data": {}
}
```

Logs are stored in `.harness/logs/` with one file per session. Agents can query logs by `source`, `level`, `milestoneId/taskId`, or time range.

---

## MCP Browser Validation Protocol

Browser-based visual validation is **capability-gated**: the runtime checks whether MCP browser tools are available before attempting to use them.

### Capability Check

1. Query available MCP tools for browser-related capabilities
2. If unavailable, skip browser validation gracefully and log a warning
3. Never block task completion on missing browser capabilities

### When Available

- Navigate to the running dev server URL
- Capture a screenshot for visual comparison
- Run basic accessibility checks (contrast, aria attributes)
- Report findings in the design review output

### Graceful Degradation

When MCP browser tools are not available, design review relies on static code analysis only.

---

## Metrics Framework

5 categories tracking project health, delivery velocity, and harness effectiveness.

### 1. Throughput

| Metric | Description | Unit |
|--------|-------------|------|
| `tasks_completed` | Tasks completed in the current milestone | count |
| `milestone_cycle_time` | Time from milestone IN_PROGRESS to MERGED | hours |
| `tasks_per_milestone` | Average tasks completed per milestone | count |

**Collection trigger**: After each task completion and milestone merge.

### 2. Quality

| Metric | Description | Unit |
|--------|-------------|------|
| `harness_score` | Current Harness validation score | points (0-100) |
| `test_pass_rate` | Percentage of tests passing | percent |
| `lint_clean` | Whether lint passes with zero warnings | boolean |
| `typecheck_clean` | Whether typecheck passes with zero errors | boolean |
| `build_time_ms` | Build duration | milliseconds |

**Collection trigger**: After each task validation run.

### 3. Human Attention

| Metric | Description | Unit |
|--------|-------------|------|
| `questions_per_milestone` | Questions asked to the user during a milestone | count |
| `rejections_per_milestone` | User rejections or correction requests per milestone | count |
| `blocked_tasks` | Tasks marked BLOCKED requiring manual resolution | count |

**Collection trigger**: At milestone boundary (REVIEW status).

### 4. Harness Health

| Metric | Description | Unit |
|--------|-------------|------|
| `state_consistency` | Whether state.json passes structural validation | boolean |
| `progress_doc_freshness` | Time since last PROGRESS.md update | hours |
| `entropy_scan_score` | Block + warn count from latest entropy scan | count |
| `agents_claude_in_sync` | AGENTS.md and CLAUDE.md are identical | boolean |

**Collection trigger**: At each state write and milestone boundary.

### 5. Safety

| Metric | Description | Unit |
|--------|-------------|------|
| `guardian_violations_caught` | Guardian violations detected and blocked | count |
| `supply_chain_flags` | Dependency changes flagged for review | count |
| `prompt_injection_attempts` | Suspected prompt injection content detected | count |
| `secret_pattern_hits` | Secret patterns caught before commit | count |

**Collection trigger**: After each guardian scan and commit hook run.

### Metrics Storage and CLI

```typescript
interface MetricEntry {
  name: string
  category: MetricCategory
  value: number
  unit: string
  recordedAt: string
  milestoneId?: string
  taskId?: string
}
```

```bash
bun harness:metrics                      # All categories
bun harness:metrics --category quality   # Single category
```

Runtime: `runtime/metrics.ts` exports `collectMetrics()`, `recordMetric()`, `getLatestMetrics()`.

---

## Performance Budget (Web Applications)

### Web Vitals Targets

| Metric | Target | Description |
|--------|--------|-------------|
| **FCP** (First Contentful Paint) | < 1.8s | Time until first text or image is painted |
| **LCP** (Largest Contentful Paint) | < 2.5s | Time until largest content element is visible |
| **CLS** (Cumulative Layout Shift) | < 0.1 | Visual stability |
| **INP** (Interaction to Next Paint) | < 200ms | Responsiveness to user interactions |

> Measure on a mid-tier mobile device (Moto G Power equivalent) on a 4G connection.

### JavaScript Bundle Limits

| Scope | Limit (gzipped) |
|-------|-----------------|
| **Initial bundle** | 150 KB |
| **Per-route chunk** | 50 KB |
| **Total JS** | 500 KB |

### Lighthouse Score Targets

| Category | Minimum Score |
|----------|---------------|
| **Performance** | 90 |
| **Accessibility** | 95 |
| **Best Practices** | 90 |
| **SEO** | 90 |

### API Latency Targets

| Endpoint Type | P50 | P95 | P99 |
|---------------|-----|-----|-----|
| **Read (single)** | 50ms | 150ms | 300ms |
| **Read (list)** | 100ms | 300ms | 500ms |
| **Write** | 100ms | 300ms | 500ms |
| **Search** | 150ms | 500ms | 1000ms |

### Budget Violation Thresholds

| Severity | Condition | CI Behavior |
|----------|-----------|-------------|
| **Pass** | Within budget | CI passes |
| **Warning** | Exceeds budget by < 20% | CI passes with warning annotation |
| **Blocking** | Exceeds budget by >= 20% | CI fails — merge is blocked |

> Budget increases require an ADR (`docs/adr/ADR-[N]-increase-bundle-budget.md`) with measurements and justification.
