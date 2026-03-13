#!/bin/bash
# 阿秘的進度追蹤小助手 - 自動掃描項目進度
SOURCE_DIR="/Users/sky770825/openclaw任務面版設計"
REPORT_PATH="/Users/sky770825/.openclaw/workspace/reports/live_status.json"

echo "Scanning OpenClaw project for task status..."

# Extract tasks marked with @task
TASKS=$(grep -r "@task" "$SOURCE_DIR/src" 2>/dev/null || echo "No tasks found")

# Create JSON output
cat <<JEOF > "$REPORT_PATH"
{
  "last_scan": "$(date)",
  "project": "OpenClaw Dashboard",
  "status": "Scanning Completed",
  "tasks_found": "$TASKS"
}
JEOF

echo "Status report updated at $REPORT_PATH"
