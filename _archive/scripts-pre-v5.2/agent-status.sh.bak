#!/bin/bash
set -e
# OpenClaw Agent 狀態追蹤器
# 用途：顯示 AI Agent 目前正在執行的工作

OPENCLAW_HOME="${OPENCLAW_HOME:-$HOME/.openclaw}"
STATUS_FILE="$OPENCLAW_HOME/.agent-status.json"
LOCK_FILE="$OPENCLAW_HOME/.agent-busy.lock"

# 顏色
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
BLUE='\033[0;34m'
CYAN='\033[0;36m'
NC='\033[0m'

# 顯示狀態
show_status() {
    echo ""
    echo -e "${CYAN}╔══════════════════════════════════════════════════════════════╗${NC}"
    echo -e "${CYAN}║${NC}                    🤖 小蔡 狀態面板                          ${CYAN}║${NC}"
    echo -e "${CYAN}╚══════════════════════════════════════════════════════════════╝${NC}"
    echo ""
    
    # 檢查是否有進行中的工作
    if [[ -f "$LOCK_FILE" ]]; then
        # 讀取狀態檔案
        if [[ -f "$STATUS_FILE" ]]; then
            TASK=$(jq -r '.task // "未知任務"' "$STATUS_FILE" 2>/dev/null) || TASK="未知任務"
            START_TIME=$(jq -r '.start_time // "未知"' "$STATUS_FILE" 2>/dev/null) || START_TIME="未知"
            TOOLS=$(jq -r '.tools // [] | join(", ")' "$STATUS_FILE" 2>/dev/null) || TOOLS=""
            
            # 計算執行時間
            START_EPOCH=$(date -j -f "%Y-%m-%d %H:%M:%S" "$START_TIME" +%s 2>/dev/null || echo 0)
            NOW_EPOCH=$(date +%s)
            ELAPSED=$((NOW_EPOCH - START_EPOCH))
            
            if [[ $ELAPSED -lt 60 ]]; then
                TIME_STR="${ELAPSED}秒"
            elif [[ $ELAPSED -lt 3600 ]]; then
                TIME_STR="$((ELAPSED / 60))分$((ELAPSED % 60))秒"
            else
                TIME_STR="$((ELAPSED / 3600))時$(((ELAPSED % 3600) / 60))分"
            fi
            
            echo -e "   ${YELLOW}⏳ 狀態：執行中${NC}"
            echo ""
            echo "   📋 目前任務：$TASK"
            echo "   ⏱️  已執行：$TIME_STR"
            [[ -n "$TOOLS" && "$TOOLS" != "null" ]] && echo "   🔧 使用工具：$TOOLS"
            echo ""
            echo -e "   ${YELLOW}⚠️  請稍候，完成後會回覆您${NC}"
        else
            echo -e "   ${YELLOW}⏳ 狀態：執行中${NC}"
            echo ""
            echo "   正在處理您的請求..."
            echo ""
        fi
    else
        # 檢查最後完成時間
        if [[ -f "$STATUS_FILE" ]]; then
            LAST_TASK=$(jq -r '.last_task // "無"' "$STATUS_FILE" 2>/dev/null) || LAST_TASK="無"
            LAST_TIME=$(jq -r '.last_end_time // "無"' "$STATUS_FILE" 2>/dev/null) || LAST_TIME="無"
            
            if [[ "$LAST_TASK" != "無" && "$LAST_TASK" != "null" ]]; then
                echo -e "   ${GREEN}✅ 狀態：待命${NC}"
                echo ""
                echo "   🕐 最後完成：$LAST_TASK"
                echo "   🕐 完成時間：$LAST_TIME"
            else
                echo -e "   ${GREEN}✅ 狀態：待命${NC}"
                echo ""
                echo "   準備好接收指令"
            fi
        else
            echo -e "   ${GREEN}✅ 狀態：待命${NC}"
            echo ""
            echo "   系統就緒"
        fi
    fi
    
    echo ""
    echo "═══════════════════════════════════════════════════════════════"
    echo ""
    echo "   指令："
    echo "   • /status 或 /狀態  - 查看此面板"
    echo "   • 停止 / 取消       - 中斷執行（如果可能）"
    echo "   • /new              - 強制重置對話"
    echo ""
}

# 顯示簡潔狀態（用於 cron 或快速查詢）
show_compact() {
    if [[ -f "$LOCK_FILE" ]]; then
        if [[ -f "$STATUS_FILE" ]]; then
            TASK=$(jq -r '.task // "工作中"' "$STATUS_FILE" 2>/dev/null)
            echo "⏳ $TASK"
        else
            echo "⏳ 執行中..."
        fi
    else
        echo "✅ 待命"
    fi
}

# 主入口
case "${1:-}" in
    --compact|-c)
        show_compact
        ;;
    *)
        show_status
        ;;
esac
