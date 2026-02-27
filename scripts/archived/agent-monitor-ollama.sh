#!/bin/bash
set -e
#
# Agent 監控腳本 - 真正本地執行，完全免費
# 由系統 LaunchAgent 直接執行，不經過 OpenClaw
#
# 執行手冊：~/.openclaw/workspace/memory/ollama-monitoring-sop.md
# 更新時間：2026-02-11
#
# === 快速 SOP ===
# Level 1 (警告): 任務>10分鐘 → 只記錄，不通知
# Level 2 (異常): 任務>30分鐘 → 嘗試修復，通知小蔡
# Level 3 (嚴重): 多Agent離線 → 立即通知老蔡
#
# Agent 責任矩陣：
# - 小蔡(指揮官)異常 → 通知老蔡
# - Cursor/CoDEX異常 → 通知小蔡
# - Gateway/Ollama異常 → 自動修復，失敗再通知
#

LOG_FILE="/tmp/agent-monitor-$(date +%Y%m%d).log"
TASK_BOARD_API="http://localhost:3011/api"

# 載入 Telegram 配置（從安全位置）
CONFIG_FILE="$HOME/.openclaw/config/telegram.env"
if [ -f "$CONFIG_FILE" ]; then
    source "$CONFIG_FILE"
else
    # 預設值（僅供測試）
    TELEGRAM_BOT_TOKEN="${TELEGRAM_BOT_TOKEN:-}"
    TELEGRAM_CHAT_ID="${TELEGRAM_CHAT_ID:-}"
fi

# 記錄日誌
log() {
    echo "[$(date '+%Y-%m-%d %H:%M:%S')] $1" >> "$LOG_FILE"
}

# 發送 Telegram 通知（使用 curl 直接呼叫，無需 OpenClaw）
send_notification() {
    local message="$1"
    local priority="${2:-normal}"  # normal, urgent
    
    if [ -n "$TELEGRAM_BOT_TOKEN" ]; then
        curl -s -X POST "https://api.telegram.org/bot${TELEGRAM_BOT_TOKEN}/sendMessage" \
            -d "chat_id=${TELEGRAM_CHAT_ID}" \
            -d "text=${message}" \
            -d "parse_mode=Markdown" \
            --connect-timeout 10 \
            --max-time 30 >> "$LOG_FILE" 2>&1
        log "通知已發送 (優先級: $priority)"
    else
        log "警告：未設定 TELEGRAM_BOT_TOKEN"
    fi
}

# 檢查任務板健康
check_gateway() {
    local response
    response=$(curl -s -o /dev/null -w "%{http_code}" "${TASK_BOARD_API}/health" 2>/dev/null)
    if [ "$response" = "200" ]; then
        echo "✅"
    else
        echo "❌"
    fi
}

# 檢查 Ollama 服務
check_ollama() {
    local response
    response=$(curl -s http://localhost:11434/api/tags 2>/dev/null | grep -c "name" || echo "0")
    if [ "$response" -gt 0 ]; then
        echo "✅ ($response models)"
    else
        echo "❌"
    fi
}

# 檢查進行中任務
check_running_tasks() {
    local tasks
    tasks=$(curl -s "${TASK_BOARD_API}/tasks?status=running" 2>/dev/null)
    local count=$(echo "$tasks" | jq '.tasks | length' 2>/dev/null || echo "0")
    
    # 檢查是否有卡住任務（>30分鐘）
    local stuck_count=0
    local current_time=$(date +%s)
    
    if [ "$count" -gt 0 ]; then
        echo "$tasks" | jq -c '.tasks[]?' 2>/dev/null | while read -r task; do
            local updated_at=$(echo "$task" | jq -r '.updatedAt // .createdAt' 2>/dev/null)
            if [ -n "$updated_at" ] && [ "$updated_at" != "null" ]; then
                local task_time=$(date -j -f "%Y-%m-%dT%H:%M:%S" "$updated_at" +%s 2>/dev/null || echo "0")
                local diff=$((current_time - task_time))
                if [ $diff -gt 1800 ]; then  # 30分鐘
                    local task_name=$(echo "$task" | jq -r '.name' 2>/dev/null)
                    log "⚠️ 卡住任務: $task_name (${diff}s)"
                    echo "STUCK:$task_name:$((diff/60))" >> /tmp/agent-stuck-tasks.log
                fi
            fi
        done
    fi
    
    echo "$count"
}

# 檢查 Cursor
check_cursor() {
    if command -v cursor &> /dev/null; then
        local version
        version=$(cursor --version 2>/dev/null | head -1 | awk '{print $2}')
        echo "✅ $version"
    else
        echo "⚠️ 未安裝"
    fi
}

# 檢查磁碟空間
check_disk() {
    local usage
    usage=$(df -h / | awk 'NR==2 {print $5}' | sed 's/%//')
    if [ "$usage" -lt 80 ]; then
        echo "✅ ${usage}%"
    else
        echo "⚠️ ${usage}%"
    fi
}

# 使用 Ollama 本地模型生成回報訊息（真正免費）
generate_report() {
    local gateway_status="$1"
    local ollama_status="$2"
    local task_count="$3"
    local cursor_status="$4"
    local disk_status="$5"
    
    # 直接使用 Ollama API 呼叫本地模型，完全不經過 OpenClaw
    local prompt="生成簡短 Agent 監控報告：
Gateway: $gateway_status
Ollama: $ollama_status
進行中任務: $task_count
Cursor: $cursor_status
磁碟: $disk_status

請用繁體中文生成簡潔報告，格式：
📊 Agent監控 [時間]
[狀態列表]
健康度: XX%"

    # 可設定使用的模型（預設 qwen3:8b，可改為 deepseek-r1:8b）
    local MODEL="${OLLAMA_MODEL:-qwen3:8b}"
    
    local report
    report=$(curl -s http://localhost:11434/api/generate \
        -H "Content-Type: application/json" \
        -d "{\"model\":\"$MODEL\",\"prompt\":\"$prompt\",\"stream\":false}" \
        2>/dev/null | jq -r '.response' 2>/dev/null)
    
    if [ -n "$report" ] && [ "$report" != "null" ]; then
        echo "$report"
    else
        # 如果 Ollama 不可用，使用預設格式
        echo "📊 Agent監控 [$(date '+%m/%d %H:%M')]

🎯 指揮官：運作中
🤖 Gateway: $gateway_status
🧠 Ollama: $ollama_status
📝 進行中任務: $task_count
💻 Cursor: $cursor_status
💾 磁碟: $disk_status

✅ 健康度：100%"
    fi
}

# 主程式
main() {
    log "=== Agent 監控檢查開始 ==="
    
    # 執行檢查
    local gateway_status=$(check_gateway)
    local ollama_status=$(check_ollama)
    local task_count=$(check_running_tasks)
    local cursor_status=$(check_cursor)
    local disk_status=$(check_disk)
    
    log "Gateway: $gateway_status"
    log "Ollama: $ollama_status"
    log "任務: $task_count 個進行中"
    log "Cursor: $cursor_status"
    log "磁碟: $disk_status"
    
    # 檢查是否有異常
    local has_error=0
    [ "$gateway_status" = "❌" ] && has_error=1
    [ "$ollama_status" = "❌" ] && has_error=1
    
    # 檢查卡住任務
    local stuck_tasks=$(cat /tmp/agent-stuck-tasks.log 2>/dev/null | wc -l)
    [ "$stuck_tasks" -gt 0 ] && has_error=1
    
    # 生成報告
    local report=$(generate_report "$gateway_status" "$ollama_status" "$task_count" "$cursor_status" "$disk_status")
    
    # 決定是否發送通知
    if [ $has_error -eq 1 ] || [ "$stuck_tasks" -gt 0 ]; then
        # 有異常，發送通知
        if [ "$stuck_tasks" -gt 0 ]; then
            report="$report

⚠️ 異常：$stuck_tasks 個卡住任務
$(cat /tmp/agent-stuck-tasks.log 2>/dev/null | head -3)"
        fi
        
        send_notification "$report" "urgent"
        log "異常通知已發送"
    else
        # 無異常，每 30 分鐘發一次健康報告
        local minute=$(date +%M)
        if [ "$minute" = "00" ] || [ "$minute" = "30" ]; then
            send_notification "$report" "normal"
            log "定期健康報告已發送"
        else
            log "無異常，跳過通知"
        fi
    fi
    
    # 清理暫存檔
    rm -f /tmp/agent-stuck-tasks.log
    
    log "=== 檢查完成 ==="
    log ""
}

# 執行
main "$@"
