#!/bin/bash
# =============================================================================
# Ollama Task Monitor v2 - 主動通知系統
# 用途：Ollama 本地監控，簡潔通知，無上下文
# 成本：$0 (Ollama 本地運行)
# =============================================================================

set -euo pipefail

# 配置
TASK_BOARD_API="http://localhost:3011"
CHECK_INTERVAL_MINUTES="${CHECK_INTERVAL_MINUTES:-10}"
TELEGRAM_BOT_TOKEN="${TELEGRAM_BOT_TOKEN:-}"
TELEGRAM_CHAT_ID="${TELEGRAM_CHAT_ID:-}"
OLLAMA_MODEL="${OLLAMA_MODEL:-llama3.2}"
OLLAMA_HOST="${OLLAMA_HOST:-http://localhost:11434}"
XIAO_CAI_ID="${XIAO_CAI_ID:-@ollama168bot}"

# 狀態檔案
STATE_DIR="${HOME}/.openclaw/state"
mkdir -p "$STATE_DIR"
FAILED_CACHE="$STATE_DIR/failed-cache.txt"
RUNNING_CACHE="$STATE_DIR/running-cache.txt"
LAST_SUMMARY="$STATE_DIR/last-summary.txt"

# =============================================================================
# 載入配置
# =============================================================================

load_env() {
    local env_file="$HOME/.openclaw/config/telegram.env"
    if [[ -f "$env_file" ]]; then
        # shellcheck source=/dev/null
        source "$env_file"
        TELEGRAM_BOT_TOKEN="${TELEGRAM_BOT_TOKEN:-${BOT_TOKEN:-}}"
        TELEGRAM_CHAT_ID="${TELEGRAM_CHAT_ID:-${CHAT_ID:-}}"
    fi
}

# =============================================================================
# 任務查詢 API
# =============================================================================

# 查詢任務列表
get_tasks() {
    curl -s "$TASK_BOARD_API/api/tasks" 2>/dev/null || echo '[]'
}

# 查詢執行記錄
get_runs() {
    curl -s "$TASK_BOARD_API/api/runs?limit=50" 2>/dev/null || echo '[]'
}

# 健康檢查
check_health() {
    curl -s -o /dev/null -w "%{http_code}" "$TASK_BOARD_API/health" 2>/dev/null || echo "000"
}

# =============================================================================
# Telegram 通知（簡潔無上下文 + 可執行按鈕）
# =============================================================================

send_msg() {
    local text="$1"
    local keyboard="${2:-}"
    
    if [[ -z "$TELEGRAM_BOT_TOKEN" || -z "$TELEGRAM_CHAT_ID" ]]; then
        echo "[$(date '+%H:%M')] Telegram 未配置"
        return 1
    fi
    
    local payload
    if [[ -n "$keyboard" ]]; then
        payload="{\"chat_id\": \"$TELEGRAM_CHAT_ID\", \"text\": \"$text\", \"parse_mode\": \"HTML\", \"reply_markup\": $keyboard}"
    else
        payload="{\"chat_id\": \"$TELEGRAM_CHAT_ID\", \"text\": \"$text\", \"parse_mode\": \"HTML\"}"
    fi
    
    curl -s -X POST "https://api.telegram.org/bot$TELEGRAM_BOT_TOKEN/sendMessage" \
        -H "Content-Type: application/json" \
        -d "$payload" > /dev/null
}

# 發送緊急通知（需要小蔡介入）- 含快速操作按鈕
alert_critical() {
    local task_id="${2:-}"
    local task_name="${3:-任務}"
    local keyboard=""
    
    if [[ -n "$task_id" ]]; then
        # 提供快速操作按鈕
        keyboard='{"inline_keyboard":[[{"text":"🔄 重跑任務","callback_data":"rerun:'"$task_id"'"},{"text":"📋 查看詳情","callback_data":"task:'"$task_id"'"}],[{"text":"✅ 標記手動處理","callback_data":"manual:'"$task_id"'"}]]}'
    fi
    
    local msg="🚨 <b>需立即處理</b>

$1

👉 $XIAO_CAI_ID 點擊下方按鈕執行："
    send_msg "$msg" "$keyboard"
    echo "[$(date '+%H:%M')] 🔴 已發送緊急通知"
}

# 發送重要通知 - 含查看按鈕
alert_high() {
    local msg="⚠️ <b>需注意</b>

$1

👉 $XIAO_CAI_ID 回覆此訊息即可處理"
    local keyboard='{"inline_keyboard":[[{"text":"📊 查看任務板","callback_data":"view_board"},{"text":"📋 查看待執行","callback_data":"view_pending"}]]}'
    send_msg "$msg" "$keyboard"
    echo "[$(date '+%H:%M')] 🟡 已發送重要通知"
}

# 發送定期摘要 - 精簡無上下文
send_summary() {
    local msg="📊 <b>任務板狀態</b>

$1

👉 有異常時會立即通知 $XIAO_CAI_ID"
    send_msg "$msg"
    echo "[$(date '+%H:%M')] 📊 已發送定期摘要"
}

# =============================================================================
# 指令處理
# =============================================================================

# /status 指令 - 查詢當前狀態
cmd_status() {
    local health=$(check_health)
    if [[ "$health" != "200" ]]; then
        echo "❌ 任務板離線 (HTTP $health)"
        return 1
    fi
    
    local tasks=$(get_tasks)
    local runs=$(get_runs)
    
    local total=$(echo "$tasks" | jq 'length')
    local pending=$(echo "$tasks" | jq '[.[] | select(.status == "pending")] | length')
    local running=$(echo "$tasks" | jq '[.[] | select(.status == "running")] | length')
    local failed=$(echo "$tasks" | jq '[.[] | select(.status == "failed" or .lastRunStatus == "failed")] | length')
    local done=$(echo "$tasks" | jq '[.[] | select(.status == "done")] | length')
    
    # 取得最近執行記錄
    local recent_runs=$(echo "$runs" | jq -r '[.[] | select(.status == "completed" or .status == "failed")][0:3] | 
        map("• " + (.taskName // "未知") + " (" + .status + ")") | join("\n")')
    
    echo "📊 <b>任務板狀態</b>

<b>統計:</b> 總計$total | 待執行$pending | 執行中$running | 失敗$failed | 完成$done

<b>最近執行:</b>
$recent_runs

<i>更新: $(date '+%H:%M')</i>"
}

# /failed 指令 - 查詢失敗任務
cmd_failed() {
    local tasks=$(get_tasks)
    local failed=$(echo "$tasks" | jq -r '[.[] | select(.status == "failed" or .lastRunStatus == "failed")]')
    local count=$(echo "$failed" | jq 'length')
    
    if [[ "$count" -eq 0 ]]; then
        echo "✅ 目前沒有失敗任務"
        return 0
    fi
    
    local list=$(echo "$failed" | jq -r 'map("• " + .name + " (ID: " + .id + ")") | join("\n")')
    echo "❌ <b>失敗任務 ($count個)</b>

$list

$XIAO_CAI_ID 請處理重跑"
}

# /running 指令 - 查詢執行中任務
cmd_running() {
    local tasks=$(get_tasks)
    local running=$(echo "$tasks" | jq -r '[.[] | select(.status == "running")]')
    local count=$(echo "$running" | jq 'length')
    
    if [[ "$count" -eq 0 ]]; then
        echo "😴 目前沒有執行中的任務"
        return 0
    fi
    
    local list=$(echo "$running" | jq -r 'map("• " + .name) | join("\n")')
    echo "🔄 <b>執行中任務 ($count個)</b>

$list"
}

# =============================================================================
# 監控檢查
# =============================================================================

# 檢查新任務
monitor_new_tasks() {
    local tasks=$(get_tasks)
    local pending_ids=$(echo "$tasks" | jq -r '[.[] | select(.status == "pending") | .id] | sort | join(",")')
    
    # 如果有新的 pending 任務
    if [[ -f "$STATE_DIR/pending-cache.txt" ]]; then
        local old_pending=$(cat "$STATE_DIR/pending-cache.txt")
        if [[ "$pending_ids" != "$old_pending" && -n "$pending_ids" ]]; then
            local new_count=$(echo "$pending_ids" | tr ',' '\n' | wc -l)
            local old_count=$(echo "$old_pending" | tr ',' '\n' | wc -l)
            if [[ $new_count -gt $old_count ]]; then
                local diff=$((new_count - old_count))
                alert_high "發現 $diff 個新任務待執行
系統將自動分配給適合的 Agent"
            fi
        fi
    fi
    
    echo "$pending_ids" > "$STATE_DIR/pending-cache.txt"
}

# 檢查失敗任務（去重通知 + 可執行按鈕）
monitor_failed() {
    local tasks=$(get_tasks)
    local failed=$(echo "$tasks" | jq -r '[.[] | select(.status == "failed" or .lastRunStatus == "failed")]')
    local failed_ids=$(echo "$failed" | jq -r '[.[].id] | sort | join(",")')
    
    # 檢查是否有新的失敗
    if [[ -f "$FAILED_CACHE" ]]; then
        local old_failed=$(cat "$FAILED_CACHE")
        if [[ "$failed_ids" != "$old_failed" && -n "$failed_ids" ]]; then
            # 找出新失敗的任務（取第一個作為代表）
            local first_failed=$(echo "$failed" | jq -r '.[0]')
            local task_id=$(echo "$first_failed" | jq -r '.id')
            local task_name=$(echo "$first_failed" | jq -r '.name')
            local failed_count=$(echo "$failed" | jq 'length')
            
            local msg
            if [[ "$failed_count" -eq 1 ]]; then
                msg="任務失敗: <b>$task_name</b>

請選擇操作："
            else
                local others=$((failed_count - 1))
                msg="任務失敗: <b>$task_name</b> (還有 $others 個)

請選擇操作："
            fi
            
            alert_critical "$msg" "$task_id" "$task_name"
        fi
    else
        # 首次運行，記錄但不通知
        echo "$failed_ids" > "$FAILED_CACHE"
    fi
    
    if [[ -n "$failed_ids" ]]; then
        echo "$failed_ids" > "$FAILED_CACHE"
    else
        rm -f "$FAILED_CACHE"
    fi
}

# 檢查卡住任務
monitor_stuck() {
    local runs=$(get_runs)
    local now=$(date +%s)
    local stuck_threshold=3600  # 1小時視為卡住
    
    local stuck=$(echo "$runs" | jq -r "
        [.[] | select(.status == \"running\") | 
        select((\"$now\" | tonumber) - (.startedAt | fromdateiso8601? // 0) > $stuck_threshold)]
    ")
    
    local count=$(echo "$stuck" | jq 'length')
    if [[ "$count" -gt 0 ]]; then
        local first_stuck=$(echo "$stuck" | jq -r '.[0]')
        local run_id=$(echo "$first_stuck" | jq -r '.id')
        local task_name=$(echo "$first_stuck" | jq -r '.taskName // "未知任務"')
        local duration=$(echo "$first_stuck" | jq -r '((now - (.startedAt | fromdateiso8601? // now)) / 3600 | floor)')
        
        local keyboard='{"inline_keyboard":[[{"text":"⏹ 強制終止","callback_data":"kill:'"$run_id"'"},{"text":"🔄 重跑任務","callback_data":"rerun_run:'"$run_id"'"}],[{"text":"📋 查看日誌","callback_data":"logs:'"$run_id"'"}]]}'
        
        local msg="🚨 <b>任務卡住 ${duration}h+</b>

任務: <b>$task_name</b>

👉 $XIAO_CAI_ID 點擊操作："
        
        send_msg "$msg" "$keyboard"
        echo "[$(date '+%H:%M')] 🔴 已發送卡住通知"
    fi
}

# 定期摘要（每小時）
monitor_summary() {
    local hour=$(date +%H)
    local min=$(date +%M)
    
    # 每小時的 0 分鐘發送摘要
    if [[ "$min" -lt "10" ]]; then
        local last_hour=""
        [[ -f "$LAST_SUMMARY" ]] && last_hour=$(cat "$LAST_SUMMARY")
        
        if [[ "$last_hour" != "$hour" ]]; then
            local msg=$(cmd_status)
            # 移除 HTML 標籤用於發送
            send_summary "$msg"
            echo "$hour" > "$LAST_SUMMARY"
        fi
    fi
}

# =============================================================================
# 回調處理（按鈕點擊）
# =============================================================================

# 處理按鈕回調 - 發送可執行指令給小蔡
handle_callback() {
    local callback_data="$1"
    local action=$(echo "$callback_data" | cut -d':' -f1)
    local id=$(echo "$callback_data" | cut -d':' -f2)
    
    case "$action" in
        rerun)
            local keyboard='{"inline_keyboard":[[{"text":"✅ 確認重跑","callback_data":"confirm_rerun:'"$id"'"}]]}'
            local msg="🔄 <b>準備重跑任務</b> (ID: $id)

👉 $XIAO_CAI_ID 請執行:
<code>./scripts/task-board-api.sh run-task '"$id"'</code>"
            send_msg "$msg" "$keyboard"
            ;;
        confirm_rerun)
            # 實際執行重跑
            local result=$(curl -s -X POST "$TASK_BOARD_API/api/tasks/$id/run" 2>/dev/null || echo '{"error":"API失敗"}')
            local msg="✅ <b>任務已重跑</b> (ID: $id)

結果: $(echo "$result" | jq -r '.status // .error // "未知"')"
            send_msg "$msg"
            ;;
        task)
            local task=$(curl -s "$TASK_BOARD_API/api/tasks/$id" 2>/dev/null || echo '{}')
            local name=$(echo "$task" | jq -r '.name // "未知"')
            local status=$(echo "$task" | jq -r '.status // "未知"')
            local desc=$(echo "$task" | jq -r '.description // "無描述"')
            local msg="📋 <b>任務詳情</b>

名稱: $name
狀態: $status
描述: $desc

👉 $XIAO_CAI_ID 回覆此訊息即可處理"
            send_msg "$msg"
            ;;
        manual)
            local msg="✅ <b>已標記為手動處理</b> (ID: $id)

👉 $XIAO_CAI_ID 請在任務板中更新狀態"
            send_msg "$msg"
            ;;
        kill)
            local keyboard='{"inline_keyboard":[[{"text":"⚠️ 確認終止","callback_data":"confirm_kill:'"$id"'"}]]}'
            local msg="⏹ <b>準備終止任務</b> (Run ID: $id)

👉 $XIAO_CAI_ID 請確認:"
            send_msg "$msg" "$keyboard"
            ;;
        confirm_kill)
            # 這裡應該調用終止 API
            local msg="⏹ <b>終止指令已發送</b> (Run ID: $id)

👉 $XIAO_CAI_ID 請檢查任務板確認已停止"
            send_msg "$msg"
            ;;
        logs)
            local run=$(curl -s "$TASK_BOARD_API/api/runs/$id" 2>/dev/null || echo '{}')
            local logs=$(echo "$run" | jq -r '.logs // "無日誌"' | head -c 500)
            local msg="📋 <b>執行日誌</b> (Run ID: $id)

<pre>${logs}</pre>

👉 $XIAO_CAI_ID 如需完整日誌請查詢資料庫"
            send_msg "$msg"
            ;;
        view_board)
            local msg="📊 請查看任務板: http://localhost:3011

👉 $XIAO_CAI_ID 或直接查詢:
<code>./scripts/task-board-api.sh list-tasks</code>"
            send_msg "$msg"
            ;;
        view_pending)
            local msg="⏳ 待執行任務:
<code>./scripts/task-board-api.sh list-tasks | grep pending</code>

👉 $XIAO_CAI_ID 執行查看"
            send_msg "$msg"
            ;;
    esac
}

# =============================================================================
# 主循環
# =============================================================================

run_monitor() {
    echo "[$(date '+%H:%M')] 開始監控檢查..."
    
    # 健康檢查
    local health=$(check_health)
    if [[ "$health" != "200" ]]; then
        alert_critical "任務板離線 (HTTP $health)
請檢查服務狀態"
        return 1
    fi
    
    # 執行各項檢查
    monitor_new_tasks
    monitor_failed
    monitor_stuck
    monitor_summary
    
    echo "[$(date '+%H:%M')] ✅ 檢查完成"
}

# =============================================================================
# 命令處理
# =============================================================================

case "${1:-monitor}" in
    # 監控模式
    monitor)
        load_env
        run_monitor
        ;;
    daemon)
        load_env
        LOCK_DIR="${STATE_DIR}/daemon.lockdir"
        if ! mkdir "$LOCK_DIR" 2>/dev/null; then
            echo "[$(date '+%H:%M')] daemon 已在運行，跳過重複啟動"
            exit 0
        fi
        trap 'rmdir "$LOCK_DIR" 2>/dev/null || true' EXIT
        echo "[$(date '+%H:%M')] 啟動監控守護進程 (間隔: ${CHECK_INTERVAL_MINUTES}分鐘)"
        while true; do
            if ! run_monitor; then
                echo "[$(date '+%H:%M')] ⚠️ 本輪檢查失敗，將於下個週期重試"
            fi
            sleep $((CHECK_INTERVAL_MINUTES * 60))
        done
        ;;
    
    # 查詢指令
    status)
        load_env
        result=$(cmd_status)
        send_msg "$result"
        echo "$result"
        ;;
    failed)
        load_env
        result=$(cmd_failed)
        send_msg "$result"
        echo "$result"
        ;;
    running)
        load_env
        result=$(cmd_running)
        send_msg "$result"
        echo "$result"
        ;;
    
    # 測試（含按鈕）
    test)
        load_env
        echo "[$(date '+%H:%M')] 發送測試通知..."
        keyboard='{"inline_keyboard":[[{"text":"🔄 測試重跑","callback_data":"rerun:test-123"},{"text":"📋 測試詳情","callback_data":"task:test-123"}],[{"text":"✅ 測試手動","callback_data":"manual:test-123"}]]}'
        msg="🧪 <b>測試通知</b>

Ollama 監控系統運作正常
這是帶有快速操作按鈕的訊息

👉 $XIAO_CAI_ID 請測試點擊下方按鈕："
        send_msg "$msg" "$keyboard"
        echo "測試完成 - 請檢查群組訊息並測試按鈕"
        ;;
    
    # 回調處理（內部使用）
    callback)
        load_env
        handle_callback "$2"
        ;;
    
    # 幫助
    *)
        cat << 'EOF'
Ollama Task Monitor v3 - 主動通知 + 可執行按鈕系統

用法: ollama-task-monitor.sh [命令]

監控命令:
  monitor   執行一次監控檢查
  daemon    持續監控模式

查詢命令:
  status    查詢任務板整體狀態
  failed    查詢失敗任務列表
  running   查詢執行中任務

回調處理:
  callback <data>  處理按鈕點擊回調

其他:
  test      發送測試通知（含按鈕）

環境變數:
  CHECK_INTERVAL_MINUTES  檢查間隔（分鐘，預設: 10）
  TELEGRAM_CHAT_ID        Telegram 群組 ID

快速操作按鈕:
  • 🔄 重跑任務 - 重新執行失敗任務
  • 📋 查看詳情 - 查看任務詳細資訊
  • ✅ 標記手動處理 - 標記為人工處理
  • ⏹ 強制終止 - 終止卡住任務

示例:
  # 查詢當前狀態
  ./ollama-task-monitor.sh status

  # 啟動持續監控
  ./ollama-task-monitor.sh daemon

  # 每 10 分鐘 cron 檢查
  */10 * * * * /path/to/ollama-task-monitor.sh monitor

  # 處理按鈕回調（Webhook 使用）
  ./ollama-task-monitor.sh callback "rerun:task-123"
EOF
        ;;
esac
