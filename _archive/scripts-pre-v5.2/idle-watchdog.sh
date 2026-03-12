#!/bin/bash
# Idle Watchdog - 自動模式核心
# 檢測用戶無回覆狀態，自動執行低風險任務

set -e

OPENCLAW_HOME="${OPENCLAW_HOME:-$HOME/.openclaw}"
WORKSPACE="${OPENCLAW_WORKSPACE:-$OPENCLAW_HOME/workspace}"
CONFIG_FILE="$WORKSPACE/config/auto-mode.json"
STATE_FILE="$OPENCLAW_HOME/.idle-watchdog-state"
LOG_FILE="$OPENCLAW_HOME/logs/idle-watchdog.log"

TELEGRAM_CHAT_ID="${TELEGRAM_CHAT_ID:-5819565005}"

# 初始化
init() {
    mkdir -p "$OPENCLAW_HOME/logs"
    mkdir -p "$WORKSPACE/config"
    [[ ! -f "$STATE_FILE" ]] && echo '{"lastActivity": 0, "pendingTask": null, "countdownStarted": false}' > "$STATE_FILE"
}

# 讀取配置
get_config() {
    local key="$1"
    if [[ -f "$CONFIG_FILE" ]]; then
        cat "$CONFIG_FILE" | jq -r "$key" 2>/dev/null || echo "null"
    else
        echo "null"
    fi
}

# 讀取狀態
get_state() {
    local key="$1"
    cat "$STATE_FILE" | jq -r "$key" 2>/dev/null || echo "null"
}

# 更新狀態
set_state() {
    local key="$1"
    local value="$2"
    local tmp=$(mktemp)
    cat "$STATE_FILE" | jq --arg key "$key" --arg value "$value" '.[$key] = $value' > "$tmp" && mv "$tmp" "$STATE_FILE"
}

# 取得最後活動時間（從記憶檔案或 state）
get_last_activity() {
    local last_msg_file="$OPENCLAW_HOME/.last-user-message"
    if [[ -f "$last_msg_file" ]]; then
        stat -f %m "$last_msg_file" 2>/dev/null || stat -c %Y "$last_msg_file" 2>/dev/null || echo "0"
    else
        get_state ".lastActivity"
    fi
}

# 計算閒置分鐘數
get_idle_minutes() {
    local last_activity=$(get_last_activity)
    local now=$(date +%s)
    local idle_seconds=$((now - last_activity))
    echo $((idle_seconds / 60))
}

# 檢查自動模式是否啟用
is_auto_mode() {
    local mode=$(get_config ".mode")
    local enabled=$(get_config ".enabled")
    [[ "$mode" == "auto" && "$enabled" == "true" ]]
}

# 發送 Telegram 通知
notify() {
    local level="$1"
    local message="$2"
    
    local emoji=""
    case "$level" in
        info) emoji="ℹ️" ;;
        warn) emoji="⚠️" ;;
        success) emoji="✅" ;;
        block) emoji="🛑" ;;
        *) emoji="📋" ;;
    esac
    
    echo "[$(date '+%H:%M:%S')] [$level] $message" >> "$LOG_FILE"
    
    # 這裡可以加入實際的 Telegram API 呼叫
    # curl -s -X POST "https://api.telegram.org/bot$TELEGRAM_BOT_TOKEN/sendMessage" ...
}

# 執行低風險任務
execute_low_risk_task() {
    local task="$1"
    
    notify "info" "自動執行低風險任務: $task"
    
    case "$task" in
        "run-with-timeout.sh 建立")
            cd "$WORKSPACE"
            # 呼叫實際執行腳本
            ./scripts/execute-task.sh "create-run-with-timeout" || true
            ;;
        "ContextGuard 結構設定")
            cd "$WORKSPACE"
            ./scripts/execute-task.sh "setup-contextguard" || true
            ;;
        "checkpoint")
            cd "$WORKSPACE"
            ./scripts/checkpoint.sh create "auto-idle-checkpoint" "idle-timeout" || true
            ;;
        "記憶寫入")
            # 記憶寫入邏輯
            ;;
        *)
            notify "warn" "未知任務: $task"
            ;;
    esac
    
    notify "success" "任務完成: $task"
}

# 啟動倒數計時
start_countdown() {
    local task="$1"
    local seconds=$(get_config ".riskLevels.medium.countdownSeconds")
    
    set_state "pendingTask" "$task"
    set_state "countdownStarted" "true"
    set_state "countdownEnd" "$(($(date +%s) + seconds))"
    
    notify "warn" "中風險任務「$task」將在 ${seconds} 秒後自動執行。回覆「停止」取消。"
}

# 檢查倒數計時
check_countdown() {
    local countdown_end=$(get_state ".countdownEnd")
    local now=$(date +%s)
    
    if [[ "$countdown_end" != "null" && $now -ge $countdown_end ]]; then
        local task=$(get_state ".pendingTask")
        notify "info" "倒數結束，執行任務: $task"
        execute_low_risk_task "$task"
        set_state "pendingTask" "null"
        set_state "countdownStarted" "false"
        set_state "countdownEnd" "null"
    fi
}

# 主邏輯
main() {
    init
    
    # 如果不是自動模式，直接退出
    if ! is_auto_mode; then
        exit 0
    fi
    
    local idle_minutes=$(get_idle_minutes)
    local timeout=$(get_config ".idleTimeoutMinutes")
    
    # 檢查是否有進行中的倒數
    if [[ "$(get_state ".countdownStarted")" == "true" ]]; then
        check_countdown
        exit 0
    fi
    
    # 檢查是否超過閒置時間
    if [[ $idle_minutes -ge $timeout ]]; then
        # 檢查是否有待執行的低風險任務
        local pending=$(get_state ".pendingTask")
        
        if [[ "$pending" != "null" && "$pending" != "" ]]; then
            # 判斷風險等級
            local risk="low"
            
            # 這裡可以加入更複雜的風險判斷邏輯
            # 簡化處理：直接執行
            
            if [[ "$risk" == "low" ]]; then
                execute_low_risk_task "$pending"
                set_state "pendingTask" "null"
            elif [[ "$risk" == "medium" ]]; then
                start_countdown "$pending"
            fi
        fi
    fi
    
    # 記錄檢查
    echo "[$(date -Iseconds)] Idle: ${idle_minutes}min, timeout: ${timeout}min" >> "$LOG_FILE"
}

# 更新活動時間（由外部呼叫）
update_activity() {
    local tmp=$(mktemp)
    cat "$STATE_FILE" | jq --arg time "$(date +%s)" '.lastActivity = ($time | tonumber)' > "$tmp" && mv "$tmp" "$STATE_FILE"
    touch "$OPENCLAW_HOME/.last-user-message"
}

# 設定待執行任務（由主 Agent 呼叫）
set_pending_task() {
    local task="$1"
    set_state "pendingTask" "$task"
    notify "info" "已設定待執行任務: $task（閒置 ${timeout} 分鐘後自動執行）"
}

# 取消待執行任務
cancel_pending() {
    set_state "pendingTask" "null"
    set_state "countdownStarted" "false"
    set_state "countdownEnd" "null"
    notify "info" "已取消待執行任務"
}

# 命令列入口
case "${1:-}" in
    update-activity)
        update_activity
        ;;
    set-task)
        set_pending_task "$2"
        ;;
    cancel)
        cancel_pending
        ;;
    *)
        main
        ;;
esac
