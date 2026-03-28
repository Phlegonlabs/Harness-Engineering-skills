#!/usr/bin/env bash
# evals/run.sh — Eval runner.
# Runs an eval task against the agent and scores the result.
#
# Usage:
#   ./evals/run.sh <task-name>
#   ./evals/run.sh example-task
#
# Prerequisites:
#   - Claude Code CLI (or your harness CLI) installed
#   - Repository in a clean state (git stash or fresh clone)

set -euo pipefail

TASK_NAME="${1:?Usage: ./evals/run.sh <task-name>}"
TASK_FILE="evals/tasks/${TASK_NAME}.md"

if [ ! -f "$TASK_FILE" ]; then
  echo "❌ Task file not found: $TASK_FILE"
  echo "Available tasks:"
  ls evals/tasks/*.md 2>/dev/null | xargs -I{} basename {} .md || echo "  (none)"
  exit 1
fi

echo "╔═══════════════════════════════════════════╗"
echo "║  Harness Engineering Eval Runner          ║"
echo "╠═══════════════════════════════════════════╣"
echo "║  Task: ${TASK_NAME}"
echo "╚═══════════════════════════════════════════╝"
echo ""

# ─── Step 1: Extract the task prompt ─────────────────────────────────────────
PROMPT=$(grep -A1 "^## Task Prompt" "$TASK_FILE" | grep "^>" | sed 's/^> //' | head -1)
echo "📋 Prompt: ${PROMPT}"
echo ""

# ─── Step 2: Create a clean branch ───────────────────────────────────────────
BRANCH="eval/${TASK_NAME}-$(date +%s)"
git checkout -b "$BRANCH"
echo "🌿 Branch: ${BRANCH}"
echo ""

# ─── Step 3: Run the agent ───────────────────────────────────────────────────
echo "🤖 Running agent..."
# Uncomment the appropriate line for your harness:
# claude --task "$PROMPT"                      # Claude Code
# codex exec --prompt "$PROMPT"               # Codex
echo "(Agent execution placeholder — uncomment the line for your harness)"
echo ""

# ─── Step 4: Run deterministic checks ────────────────────────────────────────
echo "📊 Running deterministic checks..."
SCORE=0
TOTAL=0

run_check() {
  local description="$1"
  local command="$2"
  ((TOTAL++))
  if eval "$command" >/dev/null 2>&1; then
    echo "  ✅ ${description}"
    ((SCORE++)) || true
  else
    echo "  ❌ ${description}"
  fi
}

# Core harness checks (always run)
run_check "Harness validation passes"       "bun run harness:validate"

# Add project-specific checks here:
# run_check "TypeScript compiles"           "bun run typecheck"
# run_check "Lint passes"                   "bun run lint"
# run_check "Tests pass"                    "bun run test"
# run_check "Architecture tests pass"       "bun run test tests/architecture/"

# Run task-specific checks from the eval file
echo ""
echo "📋 Running task-specific checks..."
TASK_CHECKS=$(grep -A100 "^### Must Pass" "$TASK_FILE" | grep "^\- \[ \]" | sed 's/^- \[ \] //' || true)
while IFS= read -r check; do
  [ -z "$check" ] && continue
  echo "  (manual) $check"
done <<< "$TASK_CHECKS"

echo ""
echo "═══════════════════════════════════════════"
echo "  Score: ${SCORE}/${TOTAL} (automated checks)"
echo "═══════════════════════════════════════════"

# ─── Cleanup instructions ─────────────────────────────────────────────────────
echo ""
echo "🧹 Eval complete. Branch: ${BRANCH}"
echo "   To clean up: git checkout main && git branch -D ${BRANCH}"
