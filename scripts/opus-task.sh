#!/bin/bash
set -e
# Opus 4.6 高難度任務管理腳本
# 用法: ./scripts/opus-task.sh [start|complete|status] [任務描述]

TASK_BOARD_API="http://localhost:3011/api"
OPUS_TASK_TAG="opus46"

# 載入 API Key（如果存在）
if [ -f "$HOME/.openclaw/config/opus.env" ]; then
  export $(grep -v '^#' "$HOME/.openclaw/config/opus.env" | xargs)
fi

case "$1" in
  start)
    TASK_DESC="$2"
    if [ -z "$TASK_DESC" ]; then
      echo "❌ 請提供任務描述"
      echo "用法: ./scripts/opus-task.sh start '複雜除錯任務'"
      exit 1
    fi
    
    # 建立任務
    TASK_ID="opus-$(date +%s)"
    curl -s -X POST "$TASK_BOARD_API/tasks" \
      -H "Content-Type: application/json" \
      -d "{
        \"id\": \"$TASK_ID\",
        \"name\": \"🧠 Opus 4.6: $TASK_DESC\",
        \"description\": \"開始時間: $(date '+%Y-%m-%d %H:%M:%S')\\n模型: claude-opus-4-6\\n狀態: 進行中\",
        \"status\": \"running\",
        \"tags\": [\"$OPUS_TASK_TAG\", \"high-priority\"],
        \"priority\": 1,
        \"owner\": \"Opus 4.6\",
        \"scheduleType\": \"manual\"
      }" > /dev/null
    
    echo "✅ Opus 4.6 任務已建立: $TASK_ID"
    echo "📋 任務: $TASK_DESC"
    echo "🕐 開始: $(date '+%H:%M:%S')"
    echo ""
    echo "👉 請切換到 Opus 4.6 模型處理此任務"
    echo "📝 完成後執行: ./scripts/opus-task.sh complete $TASK_ID"
    ;;
    
  complete)
    TASK_ID="$2"
    if [ -z "$TASK_ID" ]; then
      echo "❌ 請提供任務 ID"
      echo "用法: ./scripts/opus-task.sh complete opus-1234567890"
      exit 1
    fi
    
    END_TIME=$(date '+%Y-%m-%d %H:%M:%S')
    
    # 更新任務狀態為完成
    curl -s -X PATCH "$TASK_BOARD_API/tasks/$TASK_ID/progress" \
      -H "Content-Type: application/json" \
      -d "{
        \"progress\": 100,
        \"status\": \"done\",
        \"result\": \"完成時間: $END_TIME\"
      }" > /dev/null
    
    echo "✅ 任務已完成並移至完成區"
    echo "🕐 結束: $END_TIME"
    echo ""
    echo "👉 請切換回 Kimi K2.5 繼續作業"
    ;;
    
  status)
    echo "📊 Opus 4.6 任務狀態"
    echo "====================="
    curl -s "$TASK_BOARD_API/tasks" | jq -r '.[] | select(.tags[]? == "opus46") | "\(.status): \(.name) (ID: \(.id))"' 2>/dev/null || echo "無進行中任務"
    ;;
    
  list)
    echo "🧠 Opus 4.6 歷史任務"
    echo "===================="
    curl -s "$TASK_BOARD_API/tasks" | jq -r '.[] | select(.tags[]? == "opus46") | "\(.createdAt): [\(.status)] \(.name)"' 2>/dev/null | head -20
    ;;
    
  *)
    echo "🧠 Opus 4.6 高難度任務管理"
    echo "========================="
    echo ""
    echo "用法:"
    echo "  ./scripts/opus-task.sh start '任務描述'  - 開始新任務"
    echo "  ./scripts/opus-task.sh complete <ID>     - 完成任務"
    echo "  ./scripts/opus-task.sh status            - 查看進行中任務"
    echo "  ./scripts/opus-task.sh list              - 列出歷史任務"
    echo ""
    echo "流程:"
    echo "  1. 偵測到高難度任務 → 執行 start"
    echo "  2. 切換到 Opus 4.6 → 處理任務"
    echo "  3. 完成後執行 complete → 自動切回 Kimi"
    ;;
esac
