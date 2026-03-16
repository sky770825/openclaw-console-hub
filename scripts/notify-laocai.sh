#!/usr/bin/env bash
# notify-laocai.sh — 小蔡完成任務後通知老蔡
# 用法：bash notify-laocai.sh "任務名稱" [狀態] [備註]
# 例：bash notify-laocai.sh "修復登入 Bug" "done" "已推到 main"

TASK_NAME="${1:-（未指定任務）}"
STATUS="${2:-done}"
NOTE="${3:-}"
CONTROL_TOKEN="${TELEGRAM_CONTROL_BOT_TOKEN:-8225683676:AAE3wmiLQ9RfYsyJousLR5_mpweL5WN8gCQ}"
# 老蔡的私人 chat id（從 server log 或 getUpdates 取得）
LAOCAI_CHAT_ID="${LAOCAI_CHAT_ID:-}"

# 透過 server API 推通知（推薦，走 Telegram Control Bot）
SERVER="http://localhost:3011"

# 取得任務板最新狀態
TASK_SUMMARY=$(curl -sf "${SERVER}/api/openclaw/tasks?limit=5" 2>/dev/null | python3 -c "
import json, sys
try:
    d = json.load(sys.stdin)
    tasks = d if isinstance(d, list) else d.get('tasks', [])
    done = sum(1 for t in tasks if t.get('status') == 'done')
    ready = sum(1 for t in tasks if t.get('status') == 'ready')
    running = sum(1 for t in tasks if t.get('status') == 'running')
    print(f'done:{done} ready:{ready} running:{running}')
except:
    print('無法取得任務板')
" 2>/dev/null)

# 狀態 emoji
case "$STATUS" in
  done|completed) EMOJI="✅" ;;
  error|failed)   EMOJI="❌" ;;
  review)         EMOJI="👀" ;;
  *)              EMOJI="📋" ;;
esac

# 組成訊息
TIMESTAMP=$(date "+%m/%d %H:%M")
MSG="${EMOJI} <b>小蔡任務完成通知</b>
━━━━━━━━━━━━━━━
📌 任務：${TASK_NAME}
🔖 狀態：${STATUS}
⏰ 時間：${TIMESTAMP}"

if [ -n "$NOTE" ]; then
  MSG="${MSG}
📝 備註：${NOTE}"
fi

if [ -n "$TASK_SUMMARY" ]; then
  MSG="${MSG}
📊 任務板：${TASK_SUMMARY}"
fi

MSG="${MSG}
━━━━━━━━━━━━━━━
💡 老蔡可以回來繼續指揮了"

# 方法 1：呼叫 server API 推送（server 會找到老蔡的 chat）
PUSH_RESULT=$(curl -sf -X POST "${SERVER}/internal/notify" \
  -H "Content-Type: application/json" \
  -d "{\"message\": $(echo "$MSG" | python3 -c "import json,sys; print(json.dumps(sys.stdin.read()))"), \"parseMode\": \"HTML\"}" \
  2>/dev/null)

if echo "$PUSH_RESULT" | grep -q '"ok":true'; then
  echo "[notify-laocai] ✅ 已通知老蔡（via server API）"
  exit 0
fi

# 方法 2：直接用 Control Bot 推（fallback）
if [ -n "$CONTROL_TOKEN" ] && [ -n "$LAOCAI_CHAT_ID" ]; then
  curl -sf -X POST "https://api.telegram.org/bot${CONTROL_TOKEN}/sendMessage" \
    -d "chat_id=${LAOCAI_CHAT_ID}" \
    -d "parse_mode=HTML" \
    --data-urlencode "text=${MSG}" \
    > /dev/null 2>&1
  echo "[notify-laocai] ✅ 已通知老蔡（via direct Telegram）"
  exit 0
fi

# 方法 3：寫到共享 log 讓老蔡醒來時看到
SHARED_LOG="${HOME}/.openclaw/workspace/xiaocai-done.log"
mkdir -p "$(dirname "$SHARED_LOG")"
echo "[$(date -u +%Y-%m-%dT%H:%M:%SZ)] TASK_DONE | ${TASK_NAME} | ${STATUS} | ${NOTE}" >> "$SHARED_LOG"
echo "[notify-laocai] ⚠️ 已寫入共享 log（Telegram 推送失敗）"
exit 0
