#!/bin/bash
# Autopilot Context Watchdog - 自動化監控
# 由 cron 每 5 分鐘執行，檢查 Context 狀態並適時提醒

set -e

cd "$(dirname "$0")/.."

# 載入環境
export OPENCLAW_HOME="${OPENCLAW_HOME:-$HOME/.openclaw}"
export OPENCLAW_WORKSPACE="${OPENCLAW_WORKSPACE:-$OPENCLAW_HOME/workspace}"

# 取得當前 Context 使用率（嘗試多種方法）
get_context_info() {
    local context_info=""
    
    # 方法 1: 嘗試從 session API 取得
    if [[ -S "$OPENCLAW_HOME/openclaw.sock" ]] || curl -s http://localhost:3010/status &>/dev/null; then
        # 如果有 API 端點，嘗試取得
        context_info=$(curl -s --max-time 2 http://localhost:3010/status 2>/dev/null | grep -oE '"context_percent":[0-9]+' | cut -d: -f2 || true)
    fi
    
    # 方法 2: 從日誌推算（簡化處理）
    if [[ -z "$context_info" ]]; then
        # 預設保守估計，讓 watchdog 保持待命
        context_info="0"
    fi
    
    echo "$context_info"
}

# 主執行
main() {
    # 確保目錄存在
    mkdir -p "$OPENCLAW_HOME/logs"
    
    # 取得 Context 資訊
    local context_percent=$(get_context_info)
    
    # 呼叫主 watchdog 腳本
    export CONTEXT_PERCENT="$context_percent"
    ./scripts/context-watchdog.sh
    
    # 記錄執行
    echo "[$(date -Iseconds)] Autopilot watchdog executed, context=${context_percent}%" >> "$OPENCLAW_HOME/logs/autopilot-context.log"
}

main "$@"
