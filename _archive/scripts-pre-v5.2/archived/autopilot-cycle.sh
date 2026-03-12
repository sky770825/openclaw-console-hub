#!/bin/bash
set -e
# Autopilot 自主循環執行器
# 由 Cron Job 觸發，每次執行一個循環
# 流程：取任務 → 派子代理 → 完成標記 → 通知 Bot

API="http://localhost:3011/api/openclaw/tasks"
AUTOPILOT_API="http://localhost:3011/api/openclaw/autopilot"
BOT_TOKEN=$(cat ~/.openclaw/config/telegram.env 2>/dev/null | grep TELEGRAM_BOT_TOKEN | cut -d= -f2)
CHAT_ID=$(cat ~/.openclaw/config/telegram.env 2>/dev/null | grep TELEGRAM_CHAT_ID | cut -d= -f2)

# 檢查 Autopilot 開關
STATUS=$(curl -s "$AUTOPILOT_API/status" 2>/dev/null)
ENABLED=$(echo "$STATUS" | python3 -c "import json,sys; print(json.load(sys.stdin).get('enabled',False))" 2>/dev/null)

if [ "$ENABLED" != "True" ]; then
  echo "Autopilot OFF, skipping"
  exit 0
fi

echo "=== Autopilot Cycle Start ==="

# 取得所有待辦任務（status=ready）
TASKS=$(curl -s "$API" 2>/dev/null)
NEXT_TASK=$(echo "$TASKS" | python3 -c "
import json,sys
data = json.load(sys.stdin)
tasks = data if isinstance(data, list) else data.get('data',[])
ready = [t for t in tasks if t.get('status') in ('ready','queued')]
if not ready:
    print('NONE')
else:
    # 按 priority 排序（數字小=高優先）
    ready.sort(key=lambda t: t.get('priority', 99))
    t = ready[0]
    print(json.dumps({'id':t['id'],'name':t['name'],'description':t.get('description','')}, ensure_ascii=False))
" 2>/dev/null)

if [ "$NEXT_TASK" = "NONE" ]; then
  echo "No pending tasks, entering exploration mode"
  # 自主探索模式 - 之後擴充
  exit 0
fi

TASK_ID=$(echo "$NEXT_TASK" | python3 -c "import json,sys; print(json.load(sys.stdin)['id'])" 2>/dev/null)
TASK_NAME=$(echo "$NEXT_TASK" | python3 -c "import json,sys; print(json.load(sys.stdin)['name'])" 2>/dev/null)
TASK_DESC=$(echo "$NEXT_TASK" | python3 -c "import json,sys; print(json.load(sys.stdin)['description'])" 2>/dev/null)

echo "Executing: $TASK_NAME ($TASK_ID)"

# 標記任務為 running
curl -s -X PATCH "$API/$TASK_ID" -H "Content-Type: application/json" -d '{"status":"running"}' > /dev/null 2>&1

# 更新 Autopilot 統計
curl -s -X POST "$AUTOPILOT_API/start" > /dev/null 2>&1

# 通知 @ollama168bot：開始執行
if [ -n "$BOT_TOKEN" ] && [ -n "$CHAT_ID" ]; then
  MSG="🔄 Autopilot 開始執行任務：
📋 $TASK_NAME
📝 $TASK_DESC"
  curl -s "https://api.telegram.org/bot$BOT_TOKEN/sendMessage" \
    -d "chat_id=$CHAT_ID" \
    -d "text=$MSG" \
    -d "parse_mode=Markdown" > /dev/null 2>&1
fi

echo "Task marked as running, notification sent"
echo "=== Autopilot Cycle End ==="
