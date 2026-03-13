#!/bin/bash
# memory-cleanup.sh — 每週記憶清理
# 觸發：cron 每週日 23:00
# 做法：建一個 auto-ok 任務給 NEUXA，讓他用 AI 判斷哪些記憶過時

set -euo pipefail

API="http://localhost:3011"
API_KEY="oc-oAw9leGU04IAbcS4WN3FC1SH3vq5OdPxrVJCR16iIUMPsep1"
BOT_TOKEN="8056783828:AAE_pVkAC1F0zob_4bcl6cA31NbZrcFp18s"
CHAT_ID="5819565005"
WORKSPACE="$HOME/.openclaw/workspace"
DATE=$(date '+%Y-%m-%d')

log() { echo "[$(date '+%H:%M')] $1"; }

# 建立週記憶清理任務（auto-ok，NEUXA 自動執行）
TASK_NAME="[$DATE] 週記憶清理 — MEMORY.md 自我審核"
TASK_DESC="每週例行任務。請讀取 MEMORY.md，對每一條套用三個問題篩選：
1. 這件事三個月後還有用嗎？
2. 這件事別處找不到嗎（非 SOUL.md/AGENTS.md 已有）？
3. 這件事影響我的決策嗎？

不符合的條件（有任何 no）→ 移到 MEMORY.md 底部 archive 區。
重複的 → 合併成一條。
矛盾的 → 保留新的，舊的 archive。

完成後：
1. 寫 GROWTH.md 一條記錄（清了幾條、原因）
2. Telegram 回報主人：清了 X 條，保留 Y 條，摘要一行"

log "建立週記憶清理任務..."

RESPONSE=$(curl -s -X POST "$API/api/openclaw/tasks" \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer $API_KEY" \
  -d "{
    \"name\": \"$TASK_NAME\",
    \"description\": $(echo "$TASK_DESC" | python3 -c 'import sys,json; print(json.dumps(sys.stdin.read()))'),
    \"status\": \"pending\",
    \"priority\": 2,
    \"owner\": \"system\",
    \"tags\": [\"auto-ok\", \"memory\", \"weekly\"]
  }" 2>/dev/null)

if echo "$RESPONSE" | python3 -c "import sys,json; d=json.load(sys.stdin); exit(0 if d.get('id') or d.get('task') else 1)" 2>/dev/null; then
  log "✅ 週記憶清理任務已建立"
  # 通知 NEUXA
  curl -s -X POST "https://api.telegram.org/bot$BOT_TOKEN/sendMessage" \
    -H "Content-Type: application/json" \
    -d "{\"chat_id\":\"$CHAT_ID\",\"text\":\"🧹 週記憶清理任務已建立（auto-ok）\\n請執行：讀 MEMORY.md → 三問篩選 → 清理 → 回報\"}" \
    > /dev/null 2>&1
else
  log "❌ 任務建立失敗：$RESPONSE"
fi
