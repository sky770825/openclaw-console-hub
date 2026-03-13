#!/bin/bash
# Unified Monitor v2.1 - 統合監控（生產環境版）
# 修復：單一API呼叫、每任務獨立警報、原子寫入、timeout、process lock

set -euo pipefail

# ============ 熔斷器 ============
STATE_FILE="${OPENCLAW_STATE_DIR:-$HOME/.openclaw}/automation/state.json"
LOGS_DIR_CB="${OPENCLAW_STATE_DIR:-$HOME/.openclaw}/automation/logs"
SCRIPT_NAME="monitor"
mkdir -p "$(dirname "$STATE_FILE")" "$LOGS_DIR_CB"
[ ! -f "$STATE_FILE" ] && echo '{"automations":{},"emergencyStop":false,"dailyBudget":5,"maxConsecutiveErrors":5}' > "$STATE_FILE"

MAX_ERRORS=$(jq -r '.maxConsecutiveErrors // 5' "$STATE_FILE" 2>/dev/null || echo "5")
if jq -e '.emergencyStop == true' "$STATE_FILE" &>/dev/null; then
  echo "[$(date '+%Y-%m-%d %H:%M:%S')] [${SCRIPT_NAME}] 🚨 緊急停止中，跳過執行" >> "$LOGS_DIR_CB/automation.log"
  exit 0
fi
if ! jq -e ".automations.${SCRIPT_NAME}.enabled == true" "$STATE_FILE" &>/dev/null; then
  exit 0
fi
errors=$(jq -r ".automations.${SCRIPT_NAME}.errors // 0" "$STATE_FILE" 2>/dev/null || echo "0")
if [ "${errors:-0}" -ge "${MAX_ERRORS:-5}" ]; then
  echo "[$(date '+%Y-%m-%d %H:%M:%S')] [${SCRIPT_NAME}] 🔴 連續錯誤 ${errors} 次，已熔斷" >> "$LOGS_DIR_CB/automation.log"
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

# ============ 配置 ============
API_URL="http://localhost:3011"
LOG_DIR="${HOME}/.openclaw/automation/logs"
STATE_DIR="${HOME}/.openclaw/automation/state"
REPORT_FILE="${STATE_DIR}/hourly-report.json"
LOCK_FILE="${STATE_DIR}/monitor.lock"

# 通知間隔
NORMAL_REPORT_INTERVAL=3600      # 正常報告：每小時
ALERT_COOLDOWN=300               # 異常冷卻：5分鐘
CURL_TIMEOUT="--max-time 5 --connect-timeout 2"

mkdir -p "$LOG_DIR" "$STATE_DIR"

# ============ 依賴檢查 ============
command -v jq >/dev/null || { echo "❌ jq 未安裝" >&2; exit 1; }
command -v curl >/dev/null || { echo "❌ curl 未安裝" >&2; exit 1; }

# ============ Process Lock (macOS compatible) ============
if ! mkdir "$LOCK_FILE" 2>/dev/null; then
    # 另一個實例正在運行，靜默退出
    exit 0
fi
# 清理 lock（trap 確保即使中斷也會清理）
trap 'rm -rf "$LOCK_FILE"' EXIT

# ============ 單一 API 呼叫 ============
fetch_tasks() {
    curl -sf $CURL_TIMEOUT "${API_URL}/api/tasks" 2>/dev/null || echo "[]"
}

# 只呼叫一次 API
TASKS_CACHE=$(fetch_tasks)

# ============ 檢查函數（使用 cache） ============

check_taskboard_api() {
    curl -sf $CURL_TIMEOUT "${API_URL}/health" > /dev/null 2>&1 && echo "ok" || echo "down"
}

get_pending_count() {
    echo "$TASKS_CACHE" | jq '[.[] | select(.status == "pending")] | length' 2>/dev/null || echo "0"
}

get_running_count() {
    echo "$TASKS_CACHE" | jq '[.[] | select(.status == "running")] | length' 2>/dev/null || echo "0"
}

# 取得卡住任務（回傳 task_id:name 格式）
get_stuck_tasks() {
    local now=$(date +%s)
    echo "$TASKS_CACHE" | jq -r --arg now "$now" '
        [.[] | select(.status == "running") | 
         select((($now | tonumber) - (.updatedAt | split(".")[0] | strptime("%Y-%m-%dT%H:%M:%S") | mktime)) > 1800)] |
        map("\(.id)|\(.name)") |
        .[]
    ' 2>/dev/null || true
}

check_autoexecutor() {
    pgrep -f "auto-executor-lean" > /dev/null 2>&1 && echo "running" || echo "stopped"
}

check_system_load() {
    local load=$(uptime | awk -F'load averages:' '{print $2}' | awk '{print $1}' 2>/dev/null || echo "0")
    local cores=$(sysctl -n hw.ncpu 2>/dev/null || echo "8")
    local load_percent=$(echo "scale=0; ($load / $cores) * 100" | bc 2>/dev/null || echo "0")
    
    if [[ $load_percent -lt 50 ]]; then echo "light"
    elif [[ $load_percent -lt 80 ]]; then echo "medium"
    else echo "heavy"; fi
}

get_sessions_24h() {
    find ~/.openclaw/agents/main/sessions -name "*.jsonl" -mtime -1 2>/dev/null | wc -l
}

# ============ 每任務獨立警報追蹤 ============

# 檢查特定任務是否應該警報
should_alert_task() {
    local task_id="$1"
    local alert_file="${STATE_DIR}/alert-task-${task_id}"
    local now=$(date +%s)
    
    if [[ -f "$alert_file" ]]; then
        local last_alert=$(cat "$alert_file" 2>/dev/null || echo "0")
        local elapsed=$((now - last_alert))
        [[ $elapsed -gt $ALERT_COOLDOWN ]] || return 1
    fi
    return 0
}

# 記錄任務警報時間
record_task_alert() {
    local task_id="$1"
    echo "$(date +%s)" > "${STATE_DIR}/alert-task-${task_id}"
}

# ============ 報告邏輯 ============

should_send_report() {
    local now=$(date +%s)
    
    if [[ -f "$REPORT_FILE" ]]; then
        local last_time=$(jq -r '.timestamp // 0' "$REPORT_FILE" 2>/dev/null || echo "0")
        local elapsed=$((now - last_time))
        [[ $elapsed -ge $NORMAL_REPORT_INTERVAL ]] || return 1
    fi
    return 0
}

has_critical_changes() {
    local prev_taskboard=""
    local prev_autoexec=""
    
    if [[ -f "$REPORT_FILE" ]]; then
        prev_taskboard=$(jq -r '.taskboard // "unknown"' "$REPORT_FILE" 2>/dev/null || echo "unknown")
        prev_autoexec=$(jq -r '.autoexecutor // "unknown"' "$REPORT_FILE" 2>/dev/null || echo "unknown")
    fi
    
    local curr_taskboard=$(check_taskboard_api)
    local curr_autoexec=$(check_autoexecutor)
    
    # API 或 AutoExecutor 狀態變化
    [[ "$curr_taskboard" != "$prev_taskboard" ]] && return 0
    [[ "$curr_autoexec" != "$prev_autoexec" ]] && return 0
    
    # 檢查是否有新卡住任務需要警報
    local stuck_tasks=$(get_stuck_tasks)
    [[ -z "$stuck_tasks" ]] && return 1
    
    # 檢查任一卡住任務是否需要警報
    while IFS='|' read -r task_id task_name; do
        [[ -z "$task_id" ]] && continue
        if should_alert_task "$task_id"; then
            return 0
        fi
    done <<< "$stuck_tasks"
    
    return 1
}

# ============ 生成報告（原子寫入） ============

generate_report() {
    local taskboard=$(check_taskboard_api)
    local pending=$(get_pending_count)
    local running=$(get_running_count)
    local stuck_raw=$(get_stuck_tasks)
    local autoexec=$(check_autoexecutor)
    local load=$(check_system_load)
    local sessions=$(get_sessions_24h)
    
    local status="✅ 正常"
    local alerts=("dummy")
    local stuck_formatted=()
    local stuck_ids=()
    
    # 檢查異常並記錄需要警報的任務
    if [[ "$taskboard" == "down" ]]; then
        status="🔴 異常"
        alerts+=("任務板 API 無法連接")
    fi
    
    if [[ "$autoexec" == "stopped" ]]; then
        status="🔴 異常"
        alerts+=("AutoExecutor 已停止")
    fi
    
    # 處理卡住任務
    if [[ -n "$stuck_raw" ]]; then
        status="⚠️ 警告"
        while IFS='|' read -r task_id task_name; do
            [[ -z "$task_id" ]] && continue
            
            # 計算執行時間
            local task_updated=$(echo "$TASKS_CACHE" | jq -r ".[] | select(.id == $task_id) | .updatedAt" 2>/dev/null || echo "")
            local mins=0
            if [[ -n "$task_updated" ]]; then
                local task_time=$(date -j -f "%Y-%m-%dT%H:%M:%S" "${task_updated%%.*}" +%s 2>/dev/null || echo "0")
                local now=$(date +%s)
                mins=$(((now - task_time) / 60))
            fi
            
            stuck_formatted+=("• #$task_id: $task_name (已執行 ${mins} 分鐘)")
            
            # 記錄警報（如果這是新的）
            if should_alert_task "$task_id"; then
                record_task_alert "$task_id"
                stuck_ids+=("$task_id")
            fi
        done <<< "$stuck_raw"
        
        [[ ${#stuck_ids[@]} -gt 0 ]] && alerts+=("${#stuck_ids[@]} 個新任務卡住")
    fi
    
    # 準備 JSON（寫入 temp file 再原子移動）
    local tmp_file=$(mktemp)
    cat > "$tmp_file" << EOF
{
  "timestamp": $(date +%s),
  "datetime": "$(date '+%Y-%m-%d %H:%M:%S')",
  "status": "$status",
  "taskboard": "$taskboard",
  "autoexecutor": "$autoexec",
  "tasks": {"pending": $pending, "running": $running},
  "stuck_count": ${#stuck_formatted[@]},
  "system_load": "$load",
  "sessions_24h": $sessions,
  "alerts": $(printf '%s\n' "${alerts[@]:1}" | jq -R . | jq -s .)
}
EOF
    mv "$tmp_file" "$REPORT_FILE"
    
    # 輸出摘要
    echo "## 📊 系統狀態摘要"
    echo ""
    echo "**時間**: $(date '+%Y-%m-%d %H:%M') | **狀態**: $status"
    echo ""
    echo "| 項目 | 狀態 |"
    echo "|------|------|"
    echo "| 任務板 API | $taskboard |"
    echo "| AutoExecutor | $autoexec |"
    echo "| 待執行 | $pending 個 |"
    echo "| 運行中 | $running 個 |"
    echo "| 系統負載 | $load |"
    echo "| 24h Sessions | $sessions 個 |"
    echo ""
    
    if [[ ${#stuck_formatted[@]} -gt 0 ]]; then
        echo "### ⚠️ 卡住任務"
        printf '%s\n' "${stuck_formatted[@]}"
        echo ""
    fi
    
    if [[ ${#alerts[@]} -gt 1 ]]; then
        echo "### 🚨 需要注意"
        printf '%s\n' "${alerts[@]:1}" | while read -r a; do [[ -n "$a" ]] && echo "- $a"; done
    else
        echo "✨ 一切正常，繼續監看。"
    fi
}

# ============ 主程式 ============

main() {
    local force=${1:-false}
    
    # 檢查是否應該發送報告
    if [[ "$force" != "true" ]] && ! should_send_report && ! has_critical_changes; then
        exit 0  # 靜默退出，不記錄
    fi
    
    generate_report
}

case "${1:-}" in
    --force|-f) main true ;;
    *) main false ;;
esac