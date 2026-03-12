#!/bin/bash

set -euo pipefail
# task-card-writeback.sh - 任務卡執行結果寫回工具
# 用法: ./task-card-writeback.sh <taskId> "<summary>" "<evidenceLinks>" "<nextSteps>"

TASK_ID="$1"
SUMMARY="$2"
EVIDENCE="$3"
NEXT_STEPS="$4"

if [[ -z "$TASK_ID" ]]; then
  echo "❌ 缺少 taskId"
  exit 1
fi

# 建立寫回內容
UPDATE_PAYLOAD=$(cat <<EOF
{
  "description": "## 執行摘要\n${SUMMARY}\n\n## 證據來源\n${EVIDENCE}\n\n## 下一步\n${NEXT_STEPS}",
  "metadata": {
    "hasSummary": true,
    "executedAt": "$(date -Iseconds)",
    "executor": "auto-cron"
  }
}
EOF
)

# 呼叫任務板 API 更新
curl -s -X PATCH "http://localhost:3011/api/tasks/${TASK_ID}/progress" \
  -H "Content-Type: application/json" \
  -d "$UPDATE_PAYLOAD" 2>/dev/null

echo "✅ 任務 ${TASK_ID} 寫回完成"
