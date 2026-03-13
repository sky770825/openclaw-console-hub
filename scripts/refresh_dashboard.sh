#!/bin/bash
STATUS_FILE="/Users/sky770825/.openclaw/workspace/reports/crew_tasks_status.json"
DASHBOARD_FILE="/Users/sky770825/.openclaw/workspace/reports/CREW_DASHBOARD.md"

echo "# Crew Bots 任務進度追蹤面版" > "$DASHBOARD_FILE"
echo "最後更新時間: $(date "+%Y-%m-%d %H:%M:%S")" >> "$DASHBOARD_FILE"
echo "" >> "$DASHBOARD_FILE"
echo "| 任務名稱 | 負責 Bot | 進度 | 當前狀態 | 更新時間 |" >> "$DASHBOARD_FILE"
echo "| :--- | :--- | :--- | :--- | :--- |" >> "$DASHBOARD_FILE"

jq -r '.[] | "| \(.task) | \(.bot) | \(.progress)% | \(.message) | \(.timestamp) |"' "$STATUS_FILE" >> "$DASHBOARD_FILE"

echo "" >> "$DASHBOARD_FILE"
echo "---" >> "$DASHBOARD_FILE"
echo "提示: 此檔案由系統自動生成，達爾可隨時查看以掌握進度。" >> "$DASHBOARD_FILE"
