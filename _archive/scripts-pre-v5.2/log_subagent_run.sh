#!/bin/bash

# 獲取傳入的參數
TASK_NAME="$1"
SESSION_ID="$2"
STATUS="$3"
MODEL="$4"
DESCRIPTION="$5"

# 構建 JSON 記錄
TIMESTAMP=$(date -u +"%Y-%m-%dT%H:%M:%SZ")
NEW_ENTRY='{
  "timestamp": "'"$TIMESTAMP"'",
  "task_name": "'"$TASK_NAME"'",
  "session_id": "'"$SESSION_ID"'",
  "status": "'"$STATUS"'",
  "model": "'"$MODEL"'",
  "description": "'"$DESCRIPTION"'"
}'

# 讀取現有的 JSON 檔案，如果不存在則初始化為空陣列
if [ -f "subagents/runs.json" ]; then
  CURRENT_JSON=$(cat "subagents/runs.json")
else
  CURRENT_JSON="[]"
fi

# 將新記錄添加到 JSON 陣列中
UPDATED_JSON=$(echo "$CURRENT_JSON" | jq --argjson new_entry "$NEW_ENTRY" '. += [$new_entry]')

# 將更新後的 JSON 寫回檔案
echo "$UPDATED_JSON" > "subagents/runs.json"

echo "Subagent run logged to subagents/runs.json"
