#!/bin/bash
# OpenClaw Circuit Breaker Library
# 熔斷器功能 - 防止自動化腳本連續失敗
# 用法: source "$(dirname "$0")/../lib/circuit-breaker.sh" && init_circuit_breaker "script_name"

# ============================================
# 熔斷器初始化
# ============================================
init_circuit_breaker() {
    local script_name="${1:-unknown}"
    local max_errors="${2:-5}"
    
    export CB_SCRIPT_NAME="$script_name"
    export CB_MAX_ERRORS="$max_errors"
    export CB_STATE_FILE="${OPENCLAW_STATE_DIR:-$HOME/.openclaw}/automation/state.json"
    export CB_LOGS_DIR="${OPENCLAW_STATE_DIR:-$HOME/.openclaw}/automation/logs"
    
    # 確保目錄存在
    mkdir -p "$(dirname "$CB_STATE_FILE")" "$CB_LOGS_DIR"
    
    # 初始化 state 文件
    if [ ! -f "$CB_STATE_FILE" ]; then
        echo '{"automations":{},"emergencyStop":false,"dailyBudget":5,"maxConsecutiveErrors":5}' > "$CB_STATE_FILE"
    fi
    
    # 檢查緊急停止
    if jq -e '.emergencyStop == true' "$CB_STATE_FILE" &>/dev/null; then
        echo "[$(date '+%Y-%m-%d %H:%M:%S')] [${CB_SCRIPT_NAME}] 🚨 緊急停止中，跳過執行" >> "$CB_LOGS_DIR/automation.log"
        exit 0
    fi
    
    # 檢查是否啟用
    if ! jq -e ".automations.${CB_SCRIPT_NAME}.enabled == true" "$CB_STATE_FILE" &>/dev/null; then
        exit 0
    fi
    
    # 檢查錯誤次數
    local errors
    errors=$(jq -r ".automations.${CB_SCRIPT_NAME}.errors // 0" "$CB_STATE_FILE" 2>/dev/null || echo "0")
    if [ "${errors:-0}" -ge "${CB_MAX_ERRORS:-5}" ]; then
        echo "[$(date '+%Y-%m-%d %H:%M:%S')] [${CB_SCRIPT_NAME}] 🔴 連續錯誤 ${errors} 次，已熔斷" >> "$CB_LOGS_DIR/automation.log"
        exit 0
    fi
    
    # 設置退出陷阱
    trap 'cb_update_state $?' EXIT
}

# ============================================
# 更新狀態 (成功/失敗)
# ============================================
cb_update_state() {
    local exit_code="${1:-0}"
    local tmp
    tmp=$(mktemp)
    
    if [ "$exit_code" -eq 0 ]; then
        # 成功：重置錯誤計數
        jq --arg name "$CB_SCRIPT_NAME" \
           '.automations[$name] = ((.automations[$name] // {}) | .errors = 0 | .lastRun = (now | todate))' \
           "$CB_STATE_FILE" > "$tmp" 2>/dev/null && mv "$tmp" "$CB_STATE_FILE"
    else
        # 失敗：增加錯誤計數
        jq --arg name "$CB_SCRIPT_NAME" \
           '.automations[$name] = ((.automations[$name] // {}) | .errors = ((.errors // 0) + 1) | .lastRun = (now | todate))' \
           "$CB_STATE_FILE" > "$tmp" 2>/dev/null && mv "$tmp" "$CB_STATE_FILE"
    fi
}

# ============================================
# 手動設置熔斷器狀態
# ============================================
cb_enable() {
    local script_name="${1:-$CB_SCRIPT_NAME}"
    local tmp
    tmp=$(mktemp)
    jq --arg name "$script_name" '.automations[$name].enabled = true' "$CB_STATE_FILE" > "$tmp" && mv "$tmp" "$CB_STATE_FILE"
    echo "✅ 已啟用 $script_name 的熔斷器"
}

cb_disable() {
    local script_name="${1:-$CB_SCRIPT_NAME}"
    local tmp
    tmp=$(mktemp)
    jq --arg name "$script_name" '.automations[$name].enabled = false' "$CB_STATE_FILE" > "$tmp" && mv "$tmp" "$CB_STATE_FILE"
    echo "🛑 已停用 $script_name 的熔斷器"
}

cb_reset() {
    local script_name="${1:-$CB_SCRIPT_NAME}"
    local tmp
    tmp=$(mktemp)
    jq --arg name "$script_name" '.automations[$name].errors = 0' "$CB_STATE_FILE" > "$tmp" && mv "$tmp" "$CB_STATE_FILE"
    echo "🔄 已重置 $script_name 的錯誤計數"
}

cb_emergency_stop() {
    local tmp
    tmp=$(mktemp)
    jq '.emergencyStop = true' "$CB_STATE_FILE" > "$tmp" && mv "$tmp" "$CB_STATE_FILE"
    echo "🚨 已啟動全局緊急停止"
}

cb_emergency_resume() {
    local tmp
    tmp=$(mktemp)
    jq '.emergencyStop = false' "$CB_STATE_FILE" > "$tmp" && mv "$tmp" "$CB_STATE_FILE"
    echo "▶️ 已解除全局緊急停止"
}

# ============================================
# 查看熔斷器狀態
# ============================================
cb_status() {
    local script_name="${1:-}"
    
    echo "=== 熔斷器狀態 ==="
    if [ -n "$script_name" ]; then
        jq -r ".automations.\"$script_name\"" "$CB_STATE_FILE" 2>/dev/null || echo "腳本 $script_name 無狀態記錄"
    else
        jq -r '.automations | to_entries[] | "\(.key): errors=\(.value.errors // 0), enabled=\(.value.enabled // false), lastRun=\(.value.lastRun // \"never\")"' "$CB_STATE_FILE" 2>/dev/null
    fi
    
    local emergency
    emergency=$(jq -r '.emergencyStop' "$CB_STATE_FILE" 2>/dev/null || echo "false")
    echo ""
    echo "全局緊急停止: $emergency"
}

# 如果直接執行，顯示幫助或執行命令
if [[ "${BASH_SOURCE[0]}" == "${0}" ]]; then
    case "${1:-help}" in
        enable)
            init_circuit_breaker "cli" 999
            cb_enable "$2"
            ;;
        disable)
            init_circuit_breaker "cli" 999
            cb_disable "$2"
            ;;
        reset)
            init_circuit_breaker "cli" 999
            cb_reset "$2"
            ;;
        stop)
            init_circuit_breaker "cli" 999
            cb_emergency_stop
            ;;
        resume)
            init_circuit_breaker "cli" 999
            cb_emergency_resume
            ;;
        status)
            init_circuit_breaker "cli" 999
            cb_status "$2"
            ;;
        *)
            echo "Circuit Breaker CLI"
            echo ""
            echo "用法: $(basename "$0") <command> [script_name]"
            echo ""
            echo "Commands:"
            echo "  enable <name>    - 啟用指定腳本的熔斷器"
            echo "  disable <name>   - 停用指定腳本的熔斷器"
            echo "  reset <name>     - 重置錯誤計數"
            echo "  stop             - 全局緊急停止"
            echo "  resume           - 解除緊急停止"
            echo "  status [name]    - 查看狀態"
            ;;
    esac
fi
