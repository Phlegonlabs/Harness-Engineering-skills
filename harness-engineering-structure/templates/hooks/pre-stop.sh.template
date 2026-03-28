#!/usr/bin/env bash
# hooks/pre-stop.sh — Claude Code pre-stop hook.
# Runs automatically before the agent finishes a task (configured in .claude/settings.json).
#
# On success: silent — nothing added to context.
# On failure (exit 2): errors are surfaced to the agent, which is re-engaged to fix them.
#
# ─── CUSTOMIZE THIS FOR YOUR STACK ───────────────────────────────────────────
# Replace the placeholder commands below with your project's actual commands.
# Examples provided for common stacks — uncomment the one that fits.
#
# Node.js / Bun:  bun run typecheck && bun run lint && bun run test
# Python:         mypy src/ && ruff check . && pytest
# Go:             go vet ./... && go test ./...
# Rust:           cargo clippy && cargo test
# ──────────────────────────────────────────────────────────────────────────────

set -euo pipefail

# Determine project root
PROJECT_ROOT="${CLAUDE_PROJECT_DIR:-$(git rev-parse --show-toplevel 2>/dev/null || pwd)}"
cd "$PROJECT_ROOT"

echo "Running pre-stop checks..." >&2

# ─── Step 1: Harness validation (always runs) ────────────────────────────────
HARNESS_OUTPUT=$(bun run harness:validate 2>&1) || {
  echo "❌ Harness validation failed:" >&2
  echo "$HARNESS_OUTPUT" >&2
  exit 2
}

# ─── Step 2: Language-specific checks ────────────────────────────────────────
# Uncomment and adapt the block for your stack:

# ── Node.js / Bun ──
# BUILD_OUTPUT=$(bun run build 2>&1) || {
#   echo "❌ Build failed:" >&2
#   echo "$BUILD_OUTPUT" >&2
#   exit 2
# }
# TYPECHECK_OUTPUT=$(bun run typecheck 2>&1) || {
#   echo "❌ Type errors found:" >&2
#   echo "$TYPECHECK_OUTPUT" >&2
#   exit 2
# }
# LINT_OUTPUT=$(bun run lint 2>&1) || {
#   echo "❌ Lint errors found:" >&2
#   echo "$LINT_OUTPUT" >&2
#   exit 2
# }
# TEST_OUTPUT=$(bun run test 2>&1) || {
#   echo "❌ Tests failed:" >&2
#   echo "$TEST_OUTPUT" >&2
#   exit 2
# }

# ── Python ──
# TYPECHECK_OUTPUT=$(mypy src/ 2>&1) || {
#   echo "❌ Type errors found:" >&2
#   echo "$TYPECHECK_OUTPUT" >&2
#   exit 2
# }
# LINT_OUTPUT=$(ruff check . 2>&1) || {
#   echo "❌ Lint errors found:" >&2
#   echo "$LINT_OUTPUT" >&2
#   exit 2
# }
# TEST_OUTPUT=$(pytest 2>&1) || {
#   echo "❌ Tests failed:" >&2
#   echo "$TEST_OUTPUT" >&2
#   exit 2
# }

# ── Go ──
# VET_OUTPUT=$(go vet ./... 2>&1) || {
#   echo "❌ go vet failed:" >&2
#   echo "$VET_OUTPUT" >&2
#   exit 2
# }
# TEST_OUTPUT=$(go test ./... 2>&1) || {
#   echo "❌ Tests failed:" >&2
#   echo "$TEST_OUTPUT" >&2
#   exit 2
# }

# ─── Step 3: Coverage check (optional) ───────────────────────────────────────
# Uncomment to enforce a minimum coverage threshold:
#
# COVERAGE_OUTPUT=$(bun run test:coverage 2>&1)
# COVERAGE_PCT=$(echo "$COVERAGE_OUTPUT" | grep "All files" | awk '{print $4}' | tr -d '%')
# COVERAGE_THRESHOLD=80
# if [ -n "$COVERAGE_PCT" ] && [ "$(echo "$COVERAGE_PCT < $COVERAGE_THRESHOLD" | bc -l)" -eq 1 ]; then
#   echo "❌ Test coverage dropped below ${COVERAGE_THRESHOLD}% (current: ${COVERAGE_PCT}%)." >&2
#   echo "Add tests before completing this task." >&2
#   exit 2
# fi

# ─── All checks passed ────────────────────────────────────────────────────────
# Silent success — nothing printed to context.
