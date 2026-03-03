#!/bin/bash
# NEUXA 巡邏腳本 — launchd 每 5 分鐘執行一次
# 掃描 server log，發現異常自動透過 Telegram 通知小蔡修正
# v2: 新增殭屍任務自動清除（running 超過 10 分鐘）

LOG="/Users/caijunchang/.openclaw/automation/logs/taskboard.log"
ALERT_LOG="/Users/caijunchang/.openclaw/automation/logs/patrol-alerts.log"
ENV_FILE="/Users/caijunchang/openclaw任務面版設計/.env"
CHAT_ID=5819565005
API_KEY="oc-oAw9leGU04IAbcS4WN3FC1SH3vq5OdPxrVJCR16iIUMPsep1"
SERVER="http://localhost:3011"

# 讀 bot token
BOT_TOKEN=$(grep TELEGRAM_XIAOCAI_BOT_TOKEN "$ENV_FILE" 2>/dev/null | cut -d= -f2)
if [ -z "$BOT_TOKEN" ]; then
  echo "$(date '+%Y-%m-%d %H:%M:%S') ERROR: no bot token" >> "$ALERT_LOG"
  exit 1
fi

# 只掃最近 5 分鐘的 log（約 300 行）
RECENT=$(tail -300 "$LOG" 2>/dev/null)

# 偵測 1: CircuitBreaker 阻擋（小蔡卡住）
CB_BLOCKS=$(echo "$RECENT" | grep -c "阻擋重複失敗")

# 偵測 2: 模型全部失敗（升級鏈走到底）
ALL_FAIL=$(echo "$RECENT" | grep -c "所有模型都掛")

# 偵測 3: 大量 HTTP 錯誤
HTTP_ERR=$(echo "$RECENT" | grep -c "HTTP [45][0-9][0-9]")

# 偵測 4: Server 健康
HEALTH=$(curl -s -o /dev/null -w "%{http_code}" --connect-timeout 3 "${SERVER}/api/health" 2>/dev/null)

ISSUES=""
ZOMBIE_CLEARED=""

if [ "$CB_BLOCKS" -gt 2 ]; then
  ISSUES="${ISSUES}CircuitBreaker 阻擋了 ${CB_BLOCKS} 次操作\n"
fi

if [ "$ALL_FAIL" -gt 0 ]; then
  ISSUES="${ISSUES}升級鏈全部失敗 ${ALL_FAIL} 次\n"
fi

if [ "$HTTP_ERR" -gt 5 ]; then
  ISSUES="${ISSUES}大量 HTTP 錯誤: ${HTTP_ERR} 次\n"
fi

if [ "$HEALTH" != "200" ]; then
  ISSUES="${ISSUES}Server 健康檢查異常: HTTP ${HEALTH}\n"
fi

# ─── 殭屍任務自動清除 ───
# 查詢所有 running 任務，超過 10 分鐘未更新的直接標記 done
if [ "$HEALTH" = "200" ]; then
  ZOMBIE_IDS=$(curl -s "${SERVER}/api/tasks?status=running" \
    -H "Authorization: Bearer ${API_KEY}" 2>/dev/null | python3 -c "
import json, sys, datetime
try:
    d = json.load(sys.stdin)
    tasks = d.get('tasks', d) if isinstance(d, dict) else d
    running = [t for t in tasks if t.get('status') == 'running'] if isinstance(tasks, list) else []
    now = datetime.datetime.now(datetime.timezone.utc)
    threshold = 10 * 60  # 10 分鐘
    for t in running:
        updated_str = t.get('updatedAt') or t.get('updated_at', '')
        if not updated_str:
            continue
        updated_str = updated_str.replace('Z', '+00:00')
        updated = datetime.datetime.fromisoformat(updated_str)
        age_secs = (now - updated).total_seconds()
        if age_secs > threshold:
            print(t.get('id', '') + '|' + t.get('name', '').replace('\n',' '))
except:
    pass
" 2>/dev/null)

  if [ -n "$ZOMBIE_IDS" ]; then
    while IFS='|' read -r task_id task_name; do
      if [ -n "$task_id" ]; then
        curl -s -X PATCH "${SERVER}/api/tasks/${task_id}" \
          -H "Authorization: Bearer ${API_KEY}" \
          -H "Content-Type: application/json" \
          -d '{"status":"done"}' > /dev/null 2>&1
        ZOMBIE_CLEARED="${ZOMBIE_CLEARED}已清除: ${task_name}\n"
        echo "$(date '+%Y-%m-%d %H:%M:%S') ZOMBIE_CLEARED: ${task_id} ${task_name}" >> "$ALERT_LOG"
      fi
    done <<< "$ZOMBIE_IDS"
  fi
fi

# ─── delivery-queue 清理 ───
# 清除 7 天前的 failed 訊息，防止無限堆積
QUEUE_DIR="/Users/caijunchang/.openclaw/delivery-queue/failed"
QUEUE_CLEANED=""
if [ -d "$QUEUE_DIR" ]; then
  OLD_COUNT=$(find "$QUEUE_DIR" -name "*.json" -mtime +7 2>/dev/null | wc -l | tr -d ' ')
  if [ "$OLD_COUNT" -gt 0 ]; then
    find "$QUEUE_DIR" -name "*.json" -mtime +7 -delete 2>/dev/null
    QUEUE_CLEANED="清除 ${OLD_COUNT} 個 7 天前的 delivery-queue failed 訊息\n"
    echo "$(date '+%Y-%m-%d %H:%M:%S') QUEUE_CLEANUP: ${OLD_COUNT} old failed messages deleted" >> "$ALERT_LOG"
  fi
fi

# 有問題或有清除動作就通知
if [ -n "$ISSUES" ] || [ -n "$ZOMBIE_CLEARED" ] || [ -n "$QUEUE_CLEANED" ]; then
  MSG="🚨 巡邏報告（自動）"
  if [ -n "$ZOMBIE_CLEARED" ]; then
    MSG="${MSG}\n\n✅ 殭屍清除：\n${ZOMBIE_CLEARED}"
  fi
  if [ -n "$QUEUE_CLEANED" ]; then
    MSG="${MSG}\n\n🗑️ Queue 清理：\n${QUEUE_CLEANED}"
  fi
  if [ -n "$ISSUES" ]; then
    MSG="${MSG}\n\n⚠️ 異常：\n${ISSUES}"
  fi

  echo "$(date '+%Y-%m-%d %H:%M:%S') ALERT: cb=${CB_BLOCKS} allFail=${ALL_FAIL} zombie=${ZOMBIE_CLEARED:-none}" >> "$ALERT_LOG"

  curl -s -X POST "https://api.telegram.org/bot${BOT_TOKEN}/sendMessage" \
    -H "Content-Type: application/json" \
    -d "{\"chat_id\": ${CHAT_ID}, \"text\": \"${MSG}\"}" > /dev/null 2>&1
else
  echo "$(date '+%Y-%m-%d %H:%M:%S') OK: cb=${CB_BLOCKS} allFail=${ALL_FAIL} httpErr=${HTTP_ERR} health=${HEALTH}" >> "$ALERT_LOG"
fi
