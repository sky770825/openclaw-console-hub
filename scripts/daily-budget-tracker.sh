#!/bin/bash
set -e
# 每日預算追蹤器 - 追蹤 $5/天的花費
# 用法: ./daily-budget-tracker.sh [check|reset|add <amount> <model>]

# ============ 熔斷器 ============
STATE_FILE="${OPENCLAW_STATE_DIR:-$HOME/.openclaw}/automation/state.json"
LOGS_DIR="${OPENCLAW_STATE_DIR:-$HOME/.openclaw}/automation/logs"
SCRIPT_NAME="budget"
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
BUDGET_FILE="$HOME/.openclaw/workspace/memory/daily-budget.json"
TODAY=$(date +%Y-%m-%d)

# 從 state.json 讀取每日預算上限
get_daily_limit() {
  jq -r '.dailyBudget // 5' "$STATE_FILE" 2>/dev/null || echo "5"
}

# 預算看門狗：80% 警告、100% 自動緊急停止
budget_watchdog() {
  [ ! -f "$BUDGET_FILE" ] && return
  local limit spent pct
  limit=$(get_daily_limit)
  spent=$(python3 -c "import json; print(json.load(open('$BUDGET_FILE'))['spent'])" 2>/dev/null || echo "0")
  [ -z "$limit" ] || [ "$limit" = "0" ] && limit=5
  pct=$(python3 -c "print(int(($spent / $limit) * 100) if $limit > 0 else 0)" 2>/dev/null || echo "0")
  local spent_fmt limit_fmt
  spent_fmt=$(printf "%.2f" "$spent" 2>/dev/null)
  limit_fmt=$(printf "%.2f" "$limit" 2>/dev/null)
  if [ "${pct:-0}" -ge 100 ]; then
    local tmp; tmp=$(mktemp)
    jq '.emergencyStop = true' "$STATE_FILE" > "$tmp" 2>/dev/null && mv "$tmp" "$STATE_FILE"
    echo "[$(date '+%Y-%m-%d %H:%M:%S')] [${SCRIPT_NAME}] 🚨 已達 100% 預算上限 (\$$spent_fmt/\$$limit_fmt)，已觸發緊急停止" >> "$LOGS_DIR/automation.log"
  elif [ "${pct:-0}" -ge 80 ]; then
    echo "[$(date '+%Y-%m-%d %H:%M:%S')] [${SCRIPT_NAME}] ⚠️ 已達 ${pct}% 預算上限 (\$$spent_fmt/\$$limit_fmt)" >> "$LOGS_DIR/automation.log"
  fi
}

# 初始化或重置（新的一天自動重置）
init_budget() {
  local limit
  limit=$(get_daily_limit)
  if [ ! -f "$BUDGET_FILE" ]; then
    echo '{"date":"'"$TODAY"'","spent":0,"limit":'"$limit"',"entries":[]}' > "$BUDGET_FILE"
  else
    FILE_DATE=$(python3 -c "import json; print(json.load(open('$BUDGET_FILE'))['date'])" 2>/dev/null)
    if [ "$FILE_DATE" != "$TODAY" ]; then
      echo '{"date":"'"$TODAY"'","spent":0,"limit":'"$limit"',"entries":[]}' > "$BUDGET_FILE"
    else
      # 同步 state.json 的 limit 到 daily-budget.json
      python3 -c "
import json
d=json.load(open('$BUDGET_FILE'))
d['limit']=$limit
json.dump(d, open('$BUDGET_FILE','w'), indent=2)
" 2>/dev/null || true
    fi
  fi
}

check_budget() {
  init_budget
  budget_watchdog
  python3 -c "
import json
data = json.load(open('$BUDGET_FILE'))
spent = data['spent']
limit = data['limit']
remaining = limit - spent
pct = (spent / limit) * 100 if limit > 0 else 0
print(f'📊 每日預算追蹤 ({data[\"date\"]})')
print(f'  💰 已花費: \${spent:.4f} / \${limit:.2f}')
print(f'  📉 剩餘: \${remaining:.4f} ({100-pct:.1f}%)')
print(f'  📋 交易筆數: {len(data[\"entries\"])}')
if pct >= 90:
    print('  🔴 警告：接近每日上限！')
elif pct >= 70:
    print('  🟡 注意：已使用超過 70%')
else:
    print('  🟢 狀態正常')
for e in data['entries'][-5:]:
    print(f'    - {e[\"time\"]} {e[\"model\"]}: \${e[\"amount\"]:.4f}')
" 2>/dev/null
}

add_cost() {
  init_budget
  AMOUNT=$1
  MODEL=$2
  TIME=$(date +%H:%M:%S)
  python3 -c "
import json
data = json.load(open('$BUDGET_FILE'))
data['spent'] += $AMOUNT
data['entries'].append({'time':'$TIME','model':'$MODEL','amount':$AMOUNT})
json.dump(data, open('$BUDGET_FILE','w'), indent=2)
remaining = data['limit'] - data['spent']
print(f'✅ 記錄 \${float($AMOUNT):.4f} ({\"$MODEL\"})')
print(f'💰 剩餘: \${remaining:.4f}')
if remaining <= 0:
    print('🔴 預算已用完！停止使用收費模型！')
" 2>/dev/null
  budget_watchdog
}

reset_budget() {
  local limit
  limit=$(get_daily_limit)
  echo '{"date":"'"$TODAY"'","spent":0,"limit":'"$limit"',"entries":[]}' > "$BUDGET_FILE"
  echo "✅ 預算已重置 ($TODAY)"
}

case "${1:-check}" in
  check)  check_budget ;;
  reset)  reset_budget ;;
  add)    add_cost "$2" "$3" ;;
  *)      echo "用法: $0 [check|reset|add <amount> <model>]" ;;
esac
