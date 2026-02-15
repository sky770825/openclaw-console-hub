#!/bin/bash
#
# 緊急終止腳本 - Emergency Stop Script
# 用法: ./emergency-stop.sh [taskId|all]
# 例如: ./emergency-stop.sh          # 終止所有任務
#       ./emergency-stop.sh t123     # 終止指定任務
#

API_BASE="${TASK_BOARD_API_BASE:-http://localhost:3011}"

show_help() {
    echo "🚨 OpenClaw 任務板 - 緊急終止工具"
    echo ""
    echo "用法:"
    echo "  ./emergency-stop.sh        # 終止所有執行中的任務"
    echo "  ./emergency-stop.sh all    # 終止所有執行中的任務"
    echo "  ./emergency-stop.sh <id>   # 終止指定任務 ID"
    echo "  ./emergency-stop.sh list   # 列出執行中的任務"
    echo ""
    echo "快捷指令:"
    echo "  /stop        → ./emergency-stop.sh"
    echo "  /stop all    → ./emergency-stop.sh all"
    echo "  /stop <id>   → ./emergency-stop.sh <id>"
}

# 列出執行中的任務
list_running() {
    echo "📋 正在查詢執行中的任務..."
    response=$(curl -s "${API_BASE}/api/emergency/running")
    
    count=$(echo "$response" | grep -o '"count":[0-9]*' | cut -d: -f2)
    
    if [ "$count" -eq 0 ]; then
        echo "✅ 目前沒有執行中的任務"
        return
    fi
    
    echo "🔄 目前有 $count 個任務執行中："
    echo "$response" | grep -o '"taskId":"[^"]*","taskName":"[^"]*"' | while read line; do
        task_id=$(echo "$line" | grep -o '"taskId":"[^"]*"' | cut -d'"' -f4)
        task_name=$(echo "$line" | grep -o '"taskName":"[^"]*"' | cut -d'"' -f4)
        echo "  - $task_name ($task_id)"
    done
}

# 終止所有任務
stop_all() {
    echo "🚨 正在終止所有執行中的任務..."
    
    response=$(curl -s -X POST "${API_BASE}/api/emergency/stop-all" \
        -H "Content-Type: application/json" \
        -d '{"reason":"用戶緊急終止(/stop all)"}')
    
    if echo "$response" | grep -q '"ok":true'; then
        stopped=$(echo "$response" | grep -o '"stopped":[0-9]*' | cut -d: -f2)
        echo "✅ 已終止 $stopped 個任務"
    else
        message=$(echo "$response" | grep -o '"message":"[^"]*"' | cut -d'"' -f4)
        echo "❌ 終止失敗: $message"
    fi
}

# 終止指定任務
stop_task() {
    local task_id="$1"
    echo "🚨 正在終止任務: $task_id..."
    
    response=$(curl -s -X POST "${API_BASE}/api/emergency/stop/${task_id}" \
        -H "Content-Type: application/json" \
        -d '{"reason":"用戶緊急終止(/stop)"}')
    
    if echo "$response" | grep -q '"ok":true'; then
        message=$(echo "$response" | grep -o '"message":"[^"]*"' | cut -d'"' -f4)
        echo "✅ $message"
    else
        message=$(echo "$response" | grep -o '"message":"[^"]*"' | cut -d'"' -f4)
        echo "❌ $message"
    fi
}

# 主邏輯
case "${1:-all}" in
    help|-h|--help)
        show_help
        ;;
    list|ls|status)
        list_running
        ;;
    all|stop)
        stop_all
        ;;
    *)
        stop_task "$1"
        ;;
esac
