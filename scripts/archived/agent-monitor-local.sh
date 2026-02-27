#!/bin/bash
set -e
#
# Agent 健康監控腳本 - 由 Ollama 本地執行
# 用途：每 5 分鐘檢查任務板狀態，發現異常時通知
#

TASK_BOARD_API="http://localhost:3011/api"
TELEGRAM_BOT_TOKEN="${TELEGRAM_BOT_TOKEN:-}"
TELEGRAM_CHAT_ID="${TELEGRAM_CHAT_ID:-5819565005}"
LOG_FILE="/tmp/agent-monitor.log"

# 顏色輸出
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

log() {
    echo "[$(date '+%Y-%m-%d %H:%M:%S')] $1" | tee -a "$LOG_FILE"
}

# 檢查任務板 API
health_check() {
    local response
    response=$(curl -s -o /dev/null -w "%{http_code}" "${TASK_BOARD_API}/health" 2>/dev/null)
    if [ "$response" = "200" ]; then
        echo "healthy"
    else
        echo "unhealthy"
    fi
}

# 取得進行中任務
get_running_tasks() {
    curl -s "${TASK_BOARD_API}/tasks?status=running" 2>/dev/null | jq -r '.tasks // []' 2>/dev/null
}

# 取得最近執行紀錄
get_recent_runs() {
    curl -s "${TASK_BOARD_API}/runs?limit=5" 2>/dev/null | jq -r '.runs // []' 2>/dev/null
}

# 檢查任務是否卡住（超過 10 分鐘）
check_stuck_tasks() {
    local tasks="$1"
    local stuck_count=0
    local current_time=$(date +%s)
    
    echo "$tasks" | jq -c '.[]?' 2>/dev/null | while read -r task; do
        local updated_at=$(echo "$task" | jq -r '.updatedAt // .createdAt')
        local status=$(echo "$task" | jq -r '.status')
        local task_name=$(echo "$task" | jq -r '.name')
        
        if [ "$status" = "running" ] && [ -n "$updated_at" ]; then
            local updated_ts=$(date -j -f "%Y-%m-%dT%H:%M:%S" "$updated_at" +%s 2>/dev/null || echo "0")
            local diff=$((current_time - updated_ts))
            
            if [ $diff -gt 600 ]; then  # 10 分鐘 = 600 秒
                log "${RED}⚠️ 卡住任務: $task_name (已運行 $((diff/60)) 分鐘)${NC}"
                echo "STUCK:$task_name:$((diff/60))"
                stuck_count=$((stuck_count + 1))
            fi
        fi
    done
    
    echo "$stuck_count"
}

# 發送 Telegram 通知
send_telegram() {
    local message="$1"
    
    if [ -n "$TELEGRAM_BOT_TOKEN" ]; then
        curl -s -X POST "https://api.telegram.org/bot${TELEGRAM_BOT_TOKEN}/sendMessage" \
            -d "chat_id=${TELEGRAM_CHAT_ID}" \
            -d "text=${message}" \
            -d "parse_mode=Markdown" \
            --connect-timeout 10 \
            --max-time 30 > /dev/null 2>&1
    else
        log "${YELLOW}⚠️ 未設定 TELEGRAM_BOT_TOKEN，無法發送通知${NC}"
    fi
}

# 主要監控邏輯
main() {
    log "=== Agent 監控檢查開始 ==="
    
    # 1. 檢查任務板健康
    local health
    health=$(health_check)
    
    if [ "$health" != "healthy" ]; then
        log "${RED}❌ 任務板 API 無回應${NC}"
        send_telegram "🚨 *Agent監控警報*\n\n任務板 API 無回應，請檢查服務狀態。"
        exit 1
    fi
    
    log "${GREEN}✅ 任務板 API 正常${NC}"
    
    # 2. 取得進行中任務
    local running_tasks
    running_tasks=$(get_running_tasks)
    local task_count=$(echo "$running_tasks" | jq 'length')
    
    log "📋 進行中任務: $task_count 個"
    
    # 3. 檢查卡住任務
    local stuck_info
    stuck_info=$(check_stuck_tasks "$running_tasks")
    local stuck_count=$(echo "$stuck_info" | grep -c "^STUCK:" || echo "0")
    
    # 4. 檢查最近執行紀錄
    local recent_runs
    recent_runs=$(get_recent_runs)
    local success_count=$(echo "$recent_runs" | jq '[.[]? | select(.status=="success")] | length')
    local failed_count=$(echo "$recent_runs" | jq '[.[]? | select(.status=="failed")] | length')
    
    log "📊 最近執行: $success_count 成功, $failed_count 失敗"
    
    # 5. 產生報告
    local report="📊 *Agent監控報告* [$(date '+%m/%d %H:%M')]

🎯 指揮官：運作中
🤖 進行中任務：$task_count 個
✅ 最近成功：$success_count 次
❌ 最近失敗：$failed_count 次"
    
    if [ "$stuck_count" -gt 0 ]; then
        report="$report

⚠️ *異常：$stuck_count 個卡住任務*
$(echo "$stuck_info" | grep "^STUCK:" | sed 's/STUCK:/• /' | sed 's/:/ - /')"
        
        # 有異常才發送通知
        send_telegram "$report"
        log "${RED}已發送異常通知${NC}"
    else
        log "${GREEN}✅ 無異常，健康度 100%${NC}"
        # 無異常時每 30 分鐘發一次健康報告（避免訊息疲勞）
        local minute=$(date +%M)
        if [ "$minute" = "00" ] || [ "$minute" = "30" ]; then
            send_telegram "$report

✅ 健康度：100%"
        fi
    fi
    
    log "=== 檢查完成 ==="
}

# 執行主程式
main "$@"
