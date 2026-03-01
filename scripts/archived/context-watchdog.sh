#!/bin/bash
# Context Watchdog - 智能提醒系統
# 用途：監控 Context 使用率，在關鍵時機發送提醒建議
# 執行：每 5 分鐘由 cron 調用，或手動執行

set -e

OPENCLAW_HOME="${OPENCLAW_HOME:-$HOME/.openclaw}"
WORKSPACE="${OPENCLAW_WORKSPACE:-$OPENCLAW_HOME/workspace}"
MEMORY_DIR="$WORKSPACE/memory"

# Telegram 設定
TELEGRAM_BOT_TOKEN="${TELEGRAM_BOT_TOKEN:-}"
TELEGRAM_CHAT_ID="${TELEGRAM_CHAT_ID:-5819565005}"

# Context 門檻（百分比）
WARN_THRESHOLD=60      # 60% - 輕提示
SUGGEST_THRESHOLD=70   # 70% - 明確建議
URGENT_THRESHOLD=85    # 85% - 系統即將強制 compaction

# 狀態檔案（避免重複提醒）
STATE_FILE="$OPENCLAW_HOME/.context-watchdog-state"
LAST_PERCENT_FILE="$OPENCLAW_HOME/.context-last-percent"

# 初始化狀態檔
init_state() {
    echo '{"last_warn": 0, "last_suggest": 0, "last_urgent": 0, "last_checkpoint": ""}' > "$STATE_FILE"
}

[[ ! -f "$STATE_FILE" ]] && init_state

# 取得當前 Context 使用率（從 session_status API 或計算）
get_context_percent() {
    # 優先從環境變數取得（由呼叫者傳入）
    if [[ -n "${CONTEXT_PERCENT:-}" ]]; then
        echo "$CONTEXT_PERCENT"
        return 0
    fi
    
    # 嘗試從 openclaw status 解析
    if command -v openclaw &>/dev/null; then
        local status_output=$(openclaw status 2>/dev/null || true)
        if [[ -n "$status_output" ]]; then
            # 嘗試解析 Context: XXk/YYk (Z%)
            local percent=$(echo "$status_output" | grep -oE 'Context: [0-9]+k/[0-9]+k \([0-9]+%\)' | grep -oE '[0-9]+%' | tr -d '%' | head -1)
            if [[ -n "$percent" ]]; then
                echo "$percent"
                return 0
            fi
        fi
    fi
    
    # 預設值：無法取得時回傳 0（不觸發）
    echo "0"
    return 0
}

# 發送 Telegram 通知
send_notification() {
    local level="$1"
    local message="$2"
    local percent="${3:-}"
    
    # 如果沒有設定 token，寫入 log 即可
    if [[ -z "$TELEGRAM_BOT_TOKEN" ]]; then
        echo "[$(date '+%H:%M:%S')] [$level] Context ${percent}% - $message" >> "$OPENCLAW_HOME/logs/context-watchdog.log"
        return 0
    fi
    
    local emoji=""
    case "$level" in
        warn) emoji="💡" ;;
        suggest) emoji="⚠️" ;;
        urgent) emoji="🚨" ;;
        *) emoji="📊" ;;
    esac
    
    local full_message="${emoji} <b>Context 提醒</b>

使用率: <code>${percent}%</code>
建議: $message

<i>$(date '+%H:%M:%S')</i>"
    
    curl -s -X POST "https://api.telegram.org/bot$TELEGRAM_BOT_TOKEN/sendMessage" \
        -d "chat_id=$TELEGRAM_CHAT_ID" \
        -d "parse_mode=HTML" \
        -d "text=$full_message" \
        --max-time 10 \
        >/dev/null 2>&1 || true
}

# 執行自動 checkpoint
auto_checkpoint() {
    local trigger="$1"
    local percent="$2"
    
    local timestamp=$(date +%Y%m%d-%H%M%S)
    local checkpoint_file="$MEMORY_DIR/auto-context-${timestamp}.md"
    
    mkdir -p "$MEMORY_DIR"
    
    # 寫入 checkpoint 內容
    cat > "$checkpoint_file" <<EOF
# Auto Context Checkpoint - ${timestamp}

**觸發條件**: ${trigger}
**Context 使用率**: ${percent}%
**時間**: $(date -Iseconds)

## 自動備份內容

此檢查點由 watchdog 自動建立，用於保留重要決策點。

## 快速指令

- 查看狀態: \`openclaw status\`
- 手動備份: \`./scripts/checkpoint.sh create "任務名稱"\`
- 強制重置: \`/new\` (Telegram 中輸入)
EOF
    
    echo "$checkpoint_file"
}

# 更新狀態
update_state() {
    local key="$1"
    local value="$2"
    
    local current_state=$(cat "$STATE_FILE")
    local new_state=$(echo "$current_state" | jq --arg key "$key" --arg value "$value" '.[$key] = $value')
    echo "$new_state" > "$STATE_FILE"
}

# 取得狀態
get_state() {
    local key="$1"
    cat "$STATE_FILE" | jq -r ".${key}"
}

# 檢查是否需要冷卻（避免重複提醒）
should_notify() {
    local level="$1"
    local current_min=$(date +%s)
    current_min=$((current_min / 60))  # 轉為分鐘
    
    local last_key="last_${level}"
    local last_notify=$(get_state "$last_key")
    
    # 冷卻時間（分鐘）
    local cooldown=10  # 10 分鐘內不重複提醒
    
    if [[ $((current_min - last_notify)) -lt $cooldown ]]; then
        return 1  # 不需要提醒
    fi
    
    # 更新最後提醒時間
    update_state "$last_key" "$current_min"
    return 0
}

# 主邏輯
main() {
    local percent=$(get_context_percent)
    local last_percent=$(cat "$LAST_PERCENT_FILE" 2>/dev/null || echo "0")
    echo "$percent" > "$LAST_PERCENT_FILE"
    
    # 記錄到日誌
    mkdir -p "$OPENCLAW_HOME/logs"
    echo "[$(date -Iseconds)] Context: ${percent}%" >> "$OPENCLAW_HOME/logs/context-watchdog.log"
    
    # 根據使用率採取行動
    if [[ $percent -ge $URGENT_THRESHOLD ]]; then
        # 85%+ : 緊急提醒
        if should_notify "urgent"; then
            send_notification "urgent" "系統即將強制 compaction！建議立即執行 /new 或 /checkpoint" "$percent"
            auto_checkpoint "urgent-${percent}percent" "$percent"
        fi
        
    elif [[ $percent -ge $SUGGEST_THRESHOLD ]]; then
        # 70%+ : 明確建議
        if should_notify "suggest"; then
            send_notification "suggest" "建議執行 /checkpoint 或 /new 釋放空間" "$percent"
            auto_checkpoint "suggest-${percent}percent" "$percent"
        fi
        
    elif [[ $percent -ge $WARN_THRESHOLD ]]; then
        # 60%+ : 輕提示
        # 只在上升時提醒（避免反彈時重複）
        if [[ $percent -gt $last_percent ]] && should_notify "warn"; then
            send_notification "warn" "Context 逐漸增加，可考慮準備備份" "$percent"
        fi
    fi
    
    # 輸出給其他腳本使用
    echo "context_percent=$percent"
}

# 執行
main "$@"
