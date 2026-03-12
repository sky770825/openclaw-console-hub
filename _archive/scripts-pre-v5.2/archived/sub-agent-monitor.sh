#!/bin/bash
set -e
################################################################################
# sub-agent-monitor.sh - 子 Agent Session 監控工具
# 
# 功能：
#   - 列出所有活躍的子 Agent session
#   - 顯示每個 session 的 token 使用量和狀態
#   - 檢測殭屍 session（超過 30 分鐘無回應）
#   - 提供清理建議
#
# 用法：
#   ./sub-agent-monitor.sh [選項]
#
# 選項：
#   --all                顯示所有 session（包含主 session）
#   --zombie-only        只顯示殭屍 session
#   --json               以 JSON 格式輸出
#   --cleanup            清理殭屍 session（需確認）
#   --help               顯示此說明
#
# 作者：執行員 D
# 日期：2026-02-12
################################################################################

set -euo pipefail

# === 設定 ===
ZOMBIE_THRESHOLD_MS=$((30 * 60 * 1000))  # 30 分鐘
SHOW_ALL=false
ZOMBIE_ONLY=false
JSON_OUTPUT=false
CLEANUP=false

# === 函數 ===

show_help() {
    head -n 24 "$0" | tail -n +2 | sed 's/^# //; s/^#//'
    exit 0
}

# 將毫秒轉換為可讀時間
ms_to_readable() {
    local ms=$1
    local seconds=$((ms / 1000))
    local minutes=$((seconds / 60))
    local hours=$((minutes / 60))
    local days=$((hours / 24))
    
    if [[ $days -gt 0 ]]; then
        echo "${days}d ${hours%60}h"
    elif [[ $hours -gt 0 ]]; then
        echo "${hours}h ${minutes%60}m"
    elif [[ $minutes -gt 0 ]]; then
        echo "${minutes}m ${seconds%60}s"
    else
        echo "${seconds}s"
    fi
}

# 計算 context 使用率
calc_usage() {
    local total=$1
    local context=$2
    
    if [[ "$context" == "0" || "$context" == "null" ]]; then
        echo "N/A"
        return
    fi
    
    awk "BEGIN {printf \"%.1f\", ($total / $context) * 100}"
}

# 判斷是否為殭屍 session
is_zombie() {
    local age_ms=$1
    [[ $age_ms -gt $ZOMBIE_THRESHOLD_MS ]]
}

# === 主程式 ===

# 解析參數
while [[ $# -gt 0 ]]; do
    case $1 in
        --all)
            SHOW_ALL=true
            shift
            ;;
        --zombie-only)
            ZOMBIE_ONLY=true
            shift
            ;;
        --json)
            JSON_OUTPUT=true
            shift
            ;;
        --cleanup)
            CLEANUP=true
            shift
            ;;
        --help|-h)
            show_help
            ;;
        *)
            echo "未知選項: $1"
            echo "使用 --help 查看說明"
            exit 1
            ;;
    esac
done

# 獲取 session 資訊
SESSION_DATA=$(openclaw sessions status --json 2>/dev/null || echo "{}")

if [[ "$SESSION_DATA" == "{}" ]]; then
    echo "❌ 無法獲取 session 資訊"
    exit 1
fi

# JSON 輸出模式
if [[ "$JSON_OUTPUT" == "true" ]]; then
    echo "$SESSION_DATA"
    exit 0
fi

# === 文字輸出模式 ===

echo "========================================"
echo "   子 Agent Session 監控"
echo "========================================"
echo "時間: $(date '+%Y-%m-%d %H:%M:%S')"
echo ""

# 解析並顯示 session
ZOMBIE_COUNT=0
ACTIVE_COUNT=0
TOTAL_TOKENS=0

while IFS= read -r session; do
    KEY=$(echo "$session" | jq -r '.key')
    
    # 過濾選項
    if [[ "$SHOW_ALL" == "false" && ! "$KEY" =~ subagent ]]; then
        continue
    fi
    
    AGE_MS=$(echo "$session" | jq -r '.ageMs // 0')
    TOTAL=$(echo "$session" | jq -r '.totalTokens // 0')
    CONTEXT=$(echo "$session" | jq -r '.contextTokens // 0')
    MODEL=$(echo "$session" | jq -r '.model // "unknown"')
    SESSION_ID=$(echo "$session" | jq -r '.sessionId // "unknown"')
    
    IS_ZOMBIE=false
    if is_zombie "$AGE_MS"; then
        IS_ZOMBIE=true
        ZOMBIE_COUNT=$((ZOMBIE_COUNT + 1))
    else
        ACTIVE_COUNT=$((ACTIVE_COUNT + 1))
    fi
    
    # 只顯示殭屍模式過濾
    if [[ "$ZOMBIE_ONLY" == "true" && "$IS_ZOMBIE" == "false" ]]; then
        continue
    fi
    
    TOTAL_TOKENS=$((TOTAL_TOKENS + TOTAL))
    
    # 格式化輸出
    AGE_READABLE=$(ms_to_readable "$AGE_MS")
    USAGE=$(calc_usage "$TOTAL" "$CONTEXT")
    
    if [[ "$IS_ZOMBIE" == "true" ]]; then
        echo "🧟 [ZOMBIE] $KEY"
    else
        echo "✅ [ACTIVE] $KEY"
    fi
    
    echo "   ├─ Session ID: $SESSION_ID"
    echo "   ├─ Model: $MODEL"
    echo "   ├─ 最後活動: $AGE_READABLE 前"
    echo "   ├─ Token 使用: $TOTAL / $CONTEXT"
    echo "   └─ 使用率: ${USAGE}%"
    echo ""
    
done < <(echo "$SESSION_DATA" | jq -c '.sessions[]')

# === 統計摘要 ===
echo "========================================"
echo "統計摘要"
echo "========================================"
echo "活躍 Session: $ACTIVE_COUNT"
echo "殭屍 Session: $ZOMBIE_COUNT (超過 30 分鐘無活動)"
echo "總 Token 使用: $TOTAL_TOKENS"
echo ""

# === 清理建議 ===
if [[ $ZOMBIE_COUNT -gt 0 ]]; then
    echo "⚠️  發現 $ZOMBIE_COUNT 個殭屍 session"
    echo ""
    if [[ "$CLEANUP" == "true" ]]; then
        echo "🗑️  清理殭屍 session..."
        while IFS= read -r session; do
            KEY=$(echo "$session" | jq -r '.key')
            AGE_MS=$(echo "$session" | jq -r '.ageMs // 0')
            
            if is_zombie "$AGE_MS" && [[ "$KEY" =~ subagent ]]; then
                echo "   正在清理: $KEY"
                # 這裡需要 OpenClaw 提供的清理指令
                # openclaw sessions close "$KEY" 2>/dev/null || echo "   ⚠️  無法清理"
                echo "   ℹ️  請手動執行: openclaw sessions close \"$KEY\""
            fi
        done < <(echo "$SESSION_DATA" | jq -c '.sessions[]')
    else
        echo "💡 使用 --cleanup 選項來清理殭屍 session"
        echo "   或執行: ./sub-agent-monitor.sh --zombie-only 查看詳情"
    fi
fi

echo "========================================"
