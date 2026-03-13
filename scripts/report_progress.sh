#!/bin/bash
# Usage: ./report_progress.sh <bot_name> <task_id> <status> <message>

BOT_NAME=$1
TASK_ID=$2
STATUS=$3
MESSAGE=$4
TIMESTAMP=$(date "+%Y-%m-%d %H:%M:%S")

REPORTS_DIR="/Users/sky770825/.openclaw/workspace/reports"
STATUS_LOG="$REPORTS_DIR/crew_tasks_status.json"
DASHBOARD_MD="$REPORTS_DIR/CREW_DASHBOARD.md"

# 初始化 JSON 檔案 (如果不存在)
if [ ! -f "$STATUS_LOG" ]; then
    echo "[]" > "$STATUS_LOG"
fi

# 更新或新增進度紀錄
# 使用 jq 處理 JSON 資料
TMP_JSON=$(mktemp)
jq --arg bot "$BOT_NAME" \
   --arg task "$TASK_ID" \
   --arg status "$STATUS" \
   --arg msg "$MESSAGE" \
   --arg time "$TIMESTAMP" \
   '. | map(select(.task_id != $task)) + [{"bot": $bot, "task_id": $task, "status": $status, "message": $msg, "last_updated": $time}]' \
   "$STATUS_LOG" > "$TMP_JSON"
mv "$TMP_JSON" "$STATUS_LOG"

# 重新生成 Markdown 儀表板供達爾閱讀
echo "# 🤖 Crew Bots 任務進度追蹤面版" > "$DASHBOARD_MD"
echo "最後更新時間: $TIMESTAMP" >> "$DASHBOARD_MD"
echo "" >> "$DASHBOARD_MD"
echo "| 機器人 | 任務 ID | 狀態 | 最新訊息 | 更新時間 |" >> "$DASHBOARD_MD"
echo "| :--- | :--- | :--- | :--- | :--- |" >> "$DASHBOARD_MD"

jq -r '.[] | "| \(.bot) | \(.task_id) | \(.status) | \(.message) | \(.last_updated) |"' "$STATUS_LOG" >> "$DASHBOARD_MD"

echo "Progress reported for $TASK_ID by $BOT_NAME."
