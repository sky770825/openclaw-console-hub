#!/bin/bash
set -e
# Autopilot Lean - 零 token 版本
# 只用 bash + curl，有需要 AI 的任務才 spawn 子 Agent

# ============ 熔斷器 ============
STATE_FILE="${OPENCLAW_STATE_DIR:-$HOME/.openclaw}/automation/state.json"
LOGS_DIR="${OPENCLAW_STATE_DIR:-$HOME/.openclaw}/automation/logs"
SCRIPT_NAME="autopilot"
mkdir -p "$(dirname "$STATE_FILE")" "$LOGS_DIR"
[ ! -f "$STATE_FILE" ] && echo '{"automations":{},"emergencyStop":false,"dailyBudget":5,"maxConsecutiveErrors":5}' > "$STATE_FILE"

MAX_ERRORS=$(jq -r '.maxConsecutiveErrors // 5' "$STATE_FILE" 2>/dev/null || echo "5")
if jq -e '.emergencyStop == true' "$STATE_FILE" &>/dev/null; then
  echo "[$(date '+%Y-%m-%d %H:%M:%S')] [${SCRIPT_NAME}] 🚨 緊急停止中，跳過執行" >> "$LOGS_DIR/automation.log"
  exit 0
fi
if ! jq -e ".automations.${SCRIPT_NAME}.enabled == true" "$STATE_FILE" &>/dev/null; then
  exit 0
fi
errors=$(jq -r ".automations.${SCRIPT_NAME}.errors // 0" "$STATE_FILE" 2>/dev/null || echo "0")
if [ "${errors:-0}" -ge "${MAX_ERRORS:-5}" ]; then
  echo "[$(date '+%Y-%m-%d %H:%M:%S')] [${SCRIPT_NAME}] 🔴 連續錯誤 ${errors} 次，已熔斷" >> "$LOGS_DIR/automation.log"
  exit 0
fi

update_state_success() {
  local tmp; tmp=$(mktemp)
  jq --arg name "$SCRIPT_NAME" '.automations[$name] = ((.automations[$name] // {}) | .errors = 0 | .lastRun = (now | todate))' "$STATE_FILE" > "$tmp" 2>/dev/null && mv "$tmp" "$STATE_FILE"
}
update_state_failure() {
  local tmp; tmp=$(mktemp)
  jq --arg name "$SCRIPT_NAME" '.automations[$name] = ((.automations[$name] // {}) | .errors = ((.errors // 0) + 1) | .lastRun = (now | todate))' "$STATE_FILE" > "$tmp" 2>/dev/null && mv "$tmp" "$STATE_FILE"
}
trap 'ec=$?; [ $ec -eq 0 ] && update_state_success || update_state_failure; exit $ec' EXIT

# ============ 主邏輯 ============
API="http://localhost:3011/api/openclaw"

# 1. 檢查 API 是否活著
if ! curl -s --max-time 3 "$API/autopilot/status" > /dev/null 2>&1; then
  exit 0
fi

# 2. 檢查 autopilot 開關
ENABLED=$(curl -s --max-time 3 "$API/autopilot/status" | python3 -c "import json,sys; print(json.load(sys.stdin).get('enabled',False))" 2>/dev/null)
[ "$ENABLED" != "True" ] && exit 0

# 3. 拉 ready 任務
TASKS_JSON=$(curl -s --max-time 5 "$API/tasks" 2>/dev/null)
TASK_INFO=$(echo "$TASKS_JSON" | python3 -c "
import json,sys
try:
    data = json.load(sys.stdin)
    tasks = data if isinstance(data, list) else data.get('data',[])
    ready = [t for t in tasks if t.get('status') in ('ready','queued')]
    if not ready:
        print('NONE')
    else:
        ready.sort(key=lambda t: t.get('priority', 99))
        t = ready[0]
        print(json.dumps({'id':t['id'],'name':t['name'],'description':t.get('description',''),'agent':t.get('agent','')}, ensure_ascii=False))
except:
    print('NONE')
" 2>/dev/null)

[ "$TASK_INFO" = "NONE" ] && exit 0

TASK_ID=$(echo "$TASK_INFO" | python3 -c "import json,sys; print(json.load(sys.stdin)['id'])")
TASK_NAME=$(echo "$TASK_INFO" | python3 -c "import json,sys; print(json.load(sys.stdin)['name'])")
TASK_DESC=$(echo "$TASK_INFO" | python3 -c "import json,sys; print(json.load(sys.stdin)['description'])")

# 4. 標記 running
curl -s -X PATCH "$API/tasks/$TASK_ID" -H "Content-Type: application/json" -d '{"status":"running"}' > /dev/null 2>&1

# 5. 寫任務到檔案，讓 OpenClaw 主會話處理
RESULT_DIR="$HOME/.openclaw/workspace/memory/autopilot-results"
mkdir -p "$RESULT_DIR"
echo "{\"taskId\":\"$TASK_ID\",\"name\":\"$TASK_NAME\",\"description\":\"$TASK_DESC\",\"pickedAt\":\"$(date -u +%Y-%m-%dT%H:%M:%SZ)\"}" > "$RESULT_DIR/current-task.json"

echo "Picked task: $TASK_NAME ($TASK_ID)"
echo ""
echo "📝 任務已拉取，請小蔡執行"
echo "💡 完成後請執行: scripts/complete-current-task.sh"
echo ""
