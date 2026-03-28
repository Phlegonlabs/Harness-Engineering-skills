#!/usr/bin/env bash
# hooks/post-stop-notify.sh — Claude Code post-stop hook.
# Sends a notification when the agent finishes a task.
# Configured in .claude/settings.json.
#
# Requires SLACK_WEBHOOK_URL environment variable (silently skipped if absent).
# Customize the notification target for your team's tooling.

set -euo pipefail

if [ -z "${SLACK_WEBHOOK_URL:-}" ]; then
  exit 0  # Silently skip if not configured
fi

PROJECT_ROOT="${CLAUDE_PROJECT_DIR:-$(git rev-parse --show-toplevel 2>/dev/null || pwd)}"
BRANCH=$(git -C "$PROJECT_ROOT" branch --show-current 2>/dev/null || echo "unknown")
TASK_SUMMARY="${1:-Agent task completed}"

curl -s -X POST "$SLACK_WEBHOOK_URL" \
  -H 'Content-Type: application/json' \
  -d "{
    \"text\": \"🤖 Agent finished on branch \`${BRANCH}\`\",
    \"blocks\": [
      {
        \"type\": \"section\",
        \"text\": {
          \"type\": \"mrkdwn\",
          \"text\": \"🤖 *Agent Task Complete*\n• Branch: \`${BRANCH}\`\n• Summary: ${TASK_SUMMARY}\"
        }
      }
    ]
  }" >/dev/null 2>&1 || true
