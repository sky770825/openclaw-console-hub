#!/bin/bash
# ═══════════════════════════════════════════════════════
#  OpenClaw Auto Patrol — Claude Code 定時甦醒巡檢
#  用途：定時啟動 Claude Code 掃描全局進度，自主執行能做的任務
#  觸發：cron 或 launchd 定時呼叫
# ═══════════════════════════════════════════════════════

set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
PROJECT_DIR="$(dirname "$SCRIPT_DIR")"
LOG_DIR="$PROJECT_DIR/logs"
mkdir -p "$LOG_DIR"

TIMESTAMP=$(date '+%Y%m%d-%H%M%S')
LOG_FILE="$LOG_DIR/patrol-${TIMESTAMP}.log"
API_BASE="http://localhost:3011"
TG_TOKEN="${TELEGRAM_BOT_TOKEN:-}"
TG_CHAT="${TELEGRAM_CHAT_ID:-}"

# 載入 .env
if [ -f "$PROJECT_DIR/.env" ]; then
  set -a
  source "$PROJECT_DIR/.env"
  set +a
  TG_TOKEN="${TELEGRAM_BOT_TOKEN:-$TG_TOKEN}"
  TG_CHAT="${TELEGRAM_CHAT_ID:-$TG_CHAT}"
fi

log() { echo "[$(date '+%H:%M:%S')] $1" | tee -a "$LOG_FILE"; }
notify_tg() {
  if [ -n "$TG_TOKEN" ] && [ -n "$TG_CHAT" ]; then
    curl -s -X POST "https://api.telegram.org/bot${TG_TOKEN}/sendMessage" \
      -H "Content-Type: application/json" \
      -d "{\"chat_id\":\"${TG_CHAT}\",\"text\":\"$1\",\"parse_mode\":\"HTML\"}" > /dev/null 2>&1 || true
  fi
}

log "═══ OpenClaw Auto Patrol START ═══"

# 1. 檢查 server 是否存活
HEALTH=$(curl -s --max-time 5 "${API_BASE}/api/health" 2>/dev/null || echo '{"ok":false}')
SERVER_OK=$(echo "$HEALTH" | python3 -c "import sys,json; print(json.load(sys.stdin).get('ok',False))" 2>/dev/null || echo "False")

if [ "$SERVER_OK" != "True" ]; then
  log "Server 不在線，嘗試啟動..."
  notify_tg "🔴 <b>巡檢警報</b>：Server 離線，嘗試自動重啟"
  cd "$PROJECT_DIR/server" && nohup npx tsx src/index.ts >> "$LOG_DIR/server.log" 2>&1 &
  sleep 5
  HEALTH=$(curl -s --max-time 5 "${API_BASE}/api/health" 2>/dev/null || echo '{"ok":false}')
  SERVER_OK=$(echo "$HEALTH" | python3 -c "import sys,json; print(json.load(sys.stdin).get('ok',False))" 2>/dev/null || echo "False")
  if [ "$SERVER_OK" != "True" ]; then
    log "Server 啟動失敗，通知老蔡"
    notify_tg "🚨 <b>巡檢警報</b>：Server 啟動失敗，需要手動處理"
    exit 1
  fi
  log "Server 已重啟成功"
fi

# 2. 拉取全局統計
log "拉取任務統計..."
STATS=$(curl -s --max-time 10 "${API_BASE}/api/openclaw/tasks" 2>/dev/null || echo "[]")
TASK_SUMMARY=$(echo "$STATS" | python3 -c "
import sys, json
data = json.load(sys.stdin)
tasks = data if isinstance(data, list) else data.get('tasks', data.get('data', []))
by_status = {}
for t in tasks:
    s = t.get('status','?')
    by_status[s] = by_status.get(s, 0) + 1
total = len(tasks)
queued = by_status.get('queued', 0)
in_prog = by_status.get('in_progress', 0)
done = by_status.get('done', 0)
print(f'total={total} queued={queued} in_progress={in_prog} done={done}')
" 2>/dev/null || echo "total=0 queued=0 in_progress=0 done=0")
log "任務統計: $TASK_SUMMARY"

# 3. 檢查甦醒報告
WAKE=$(curl -s --max-time 5 "${API_BASE}/api/openclaw/wake-report" 2>/dev/null || echo "[]")
UNRESOLVED=$(echo "$WAKE" | python3 -c "
import sys, json
data = json.load(sys.stdin)
reports = data if isinstance(data, list) else data.get('reports', [])
unresolved = [r for r in reports if not r.get('resolved', False)]
print(len(unresolved))
" 2>/dev/null || echo "0")
log "未解決甦醒報告: $UNRESOLVED"

# 4. 檢查 dispatch 狀態
DISPATCH=$(curl -s --max-time 5 "${API_BASE}/api/openclaw/dispatch/status" 2>/dev/null || echo '{}')
DISPATCH_MODE=$(echo "$DISPATCH" | python3 -c "import sys,json; print(json.load(sys.stdin).get('dispatchMode',False))" 2>/dev/null || echo "False")
log "自動派工: $DISPATCH_MODE"

# 5. 產生每日報告並發 Telegram
log "產生每日報告..."
curl -s --max-time 10 "${API_BASE}/api/openclaw/daily-report?notify=1" > /dev/null 2>&1 || true

# 6. 組合巡檢摘要
eval "$TASK_SUMMARY"
SUMMARY="🔍 <b>巡檢完成</b> $(date '+%m/%d %H:%M')

📋 任務：${total} 個（排隊 ${queued} · 進行中 ${in_progress} · 完成 ${done}）
⚠️ 甦醒報告：${UNRESOLVED} 個未解決
🤖 自動派工：$([ "$DISPATCH_MODE" = "True" ] && echo '開啟' || echo '關閉')

✅ 系統正常運行中"

notify_tg "$SUMMARY"
log "$SUMMARY"

# 7. 寫入最後巡檢時間
echo "{\"lastPatrol\":\"$(date -u '+%Y-%m-%dT%H:%M:%SZ')\",\"status\":\"ok\",\"tasks\":${total},\"unresolved\":${UNRESOLVED}}" > "$PROJECT_DIR/.openclaw-patrol-status.json"

log "═══ OpenClaw Auto Patrol END ═══"
