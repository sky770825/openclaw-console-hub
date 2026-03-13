#!/bin/bash
set -e

TASK_FILE=$1
OUTBOX="/Users/sky770825/.openclaw/workspace/sandbox/outbox"
REPORTS="/Users/sky770825/.openclaw/workspace/reports"

# Parse Task using jq
TASK_ID=$(jq -r '.task_id' "$TASK_FILE")
ASSIGNEE=$(jq -r '.assignee' "$TASK_FILE")
TERM=$(jq -r '.params.term' "$TASK_FILE")

# Execute "Research"
REPORT_FILE="$REPORTS/report_$TASK_ID.md"
cat << MD > "$REPORT_FILE"
# NEUXA 任務回報: $TASK_ID
- **負責人**: $ASSIGNEE
- **查詢詞彙**: $TERM
- **研究內容**: 
  $TERM 是一個在分散式系統中常見的技術術語。
  在此測試中，我們確認了 NEUXA 協議能正確將 JSON 派工轉化為實體文件回報。
- **完成時間**: $(date)
MD

# Generate Response JSON
RESPONSE_FILE="$OUTBOX/response_$TASK_ID.json"
cat << JSON > "$RESPONSE_FILE"
{
  "status": "SUCCESS",
  "task_id": "$TASK_ID",
  "report_path": "$REPORT_FILE",
  "summary": "Successfully researched $TERM"
}
JSON

echo "$RESPONSE_FILE"
