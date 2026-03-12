#!/bin/bash
# 用法: ./report_to_cai.sh "任務名稱" "機器人名稱" "進度(0-100)" "狀態訊息"

TASK_NAME=$1
BOT_NAME=$2
PROGRESS=$3
MESSAGE=$4
TIMESTAMP=$(date "+%Y-%m-%d %H:%M:%S")
STATUS_FILE="/Users/caijunchang/.openclaw/workspace/reports/crew_tasks_status.json"

if [ -z "$TASK_NAME" ] || [ -z "$BOT_NAME" ]; then
    echo "錯誤: 必須提供 任務名稱 與 機器人名稱"
    exit 1
fi

# 使用 jq 更新或新增任務狀態
# 如果任務已存在則更新，不存在則附加
NEW_DATA=$(jq --arg task "$TASK_NAME" \
              --arg bot "$BOT_NAME" \
              --arg prog "$PROGRESS" \
              --arg msg "$MESSAGE" \
              --arg time "$TIMESTAMP" \
              '
              if any(.[]; .task == $task) then
                map(if .task == $task then .bot=$bot | .progress=$prog | .message=$msg | .timestamp=$time else . end)
              else
                . + [{"task": $task, "bot": $bot, "progress": $prog, "message": $msg, "timestamp": $time}]
              end
              ' "$STATUS_FILE")

echo "$NEW_DATA" > "$STATUS_FILE"
echo "進度已更新: [$BOT_NAME] $TASK_NAME -> $PROGRESS%"