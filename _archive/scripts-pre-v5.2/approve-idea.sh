#!/bin/bash
# 審核通過發想並建立對應任務
# 使用方式: ./approve-idea.sh <idea-id> [審核備註]

set -e

API_BASE="${OPENCLAW_TASKBOARD_URL:-http://localhost:3011}"

idea_id="${1:-}"
review_note="${2:-已審核通過，開始執行}"

if [[ -z "$idea_id" ]]; then
  echo "❌ 請提供發想 ID"
  echo "使用方式: $0 <idea-id> [審核備註]"
  echo ""
  echo "查看待審核發想:"
  curl -s "${API_BASE}/api/openclaw/ideas" | jq '.[] | select(.status == "pending") | {id, number, title}'
  exit 1
fi

echo "🔍 查詢發想 ${idea_id}..."

# 取得發想詳情
idea=$(curl -s "${API_BASE}/api/openclaw/ideas" | jq --arg id "$idea_id" '.[] | select(.id == $id)')

if [[ -z "$idea" || "$idea" == "null" ]]; then
  echo "❌ 找不到發想 ${idea_id}"
  exit 1
fi

title=$(echo "$idea" | jq -r '.title')
summary=$(echo "$idea" | jq -r '.summary')
tags=$(echo "$idea" | jq -r '.tags | join(",")')

echo "📋 發想詳情:"
echo "  標題: ${title}"
echo "  摘要: ${summary}"
echo "  標籤: ${tags}"
echo ""

# 更新發想狀態為已通過
echo "✅ 標記發想為已通過..."
curl -s -X PATCH "${API_BASE}/api/openclaw/ideas/${idea_id}" \
  -H "Content-Type: application/json" \
  -d "{
    \"status\": \"approved\",
    \"review_note\": \"${review_note}\",
    \"reviewed_at\": \"$(date -u +"%Y-%m-%dT%H:%M:%SZ")\"
  }" > /dev/null

# 建立對應任務
echo "📌 建立對應任務..."
task_response=$(curl -s -X POST "${API_BASE}/api/tasks" \
  -H "Content-Type: application/json" \
  -d "{
    \"name\": \"${title}\",
    \"description\": \"${summary}\",
    \"tags\": [\"$(echo $tags | sed 's/,/\",\"/g')\", \"from-idea\"],
    \"status\": \"ready\",
    \"owner\": \"OpenClaw\"
  }")

if echo "$task_response" | grep -q '"id"'; then
  task_id=$(echo "$task_response" | jq -r '.id')
  echo ""
  echo "🎉 審核完成！"
  echo "  發想: ${idea_id} → ✅ 已通過"
  echo "  任務: ${task_id} → 📋 已建立"
  echo ""
  echo "查看任務:"
  echo "  ./scripts/task-board-api.sh get-task ${task_id}"
else
  echo "⚠️ 發想已通過，但建立任務失敗:"
  echo "$task_response"
fi
