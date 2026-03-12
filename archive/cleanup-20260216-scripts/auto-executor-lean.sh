#!/bin/bash
# AutoExecutor Lean - 簡易自動執行器
# 輪詢 TaskBoard API，自動執行待處理任務

set -euo pipefail

# 配置
API_URL="http://localhost:3011"
POLL_INTERVAL=${POLL_INTERVAL:-10}  # 預設 10 秒輪詢一次
LOG_DIR="${HOME}/.openclaw/automation/logs"
STATE_FILE="${HOME}/.openclaw/automation/state.json"
RUNNING_FILE="/tmp/auto-executor-lean.pid"

# 顏色
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# 確保日誌目錄存在
mkdir -p "$LOG_DIR"

# 日誌函數
log() {
    local msg="[$(date '+%Y-%m-%d %H:%M:%S')] $1"
    echo -e "$msg"
    echo "$msg" >> "$LOG_DIR/auto-executor.log"
}

log_info() { log "${BLUE}[INFO]${NC} $1"; }
log_success() { log "${GREEN}[OK]${NC} $1"; }
log_warn() { log "${YELLOW}[WARN]${NC} $1"; }
log_error() { log "${RED}[ERROR]${NC} $1"; }

# 檢查 API 是否可用
check_api() {
    curl -sf "${API_URL}/health" > /dev/null 2>&1
}

# 獲取待執行任務（pending + running 但超時的）
get_pending_tasks() {
    curl -sf "${API_URL}/api/tasks" 2>/dev/null | jq -r '.[] | select(.status == "pending" or .status == "running") | @base64'
}

# 解碼任務
decode_task() {
    echo "$1" | base64 --decode
}

# 執行任務
execute_task() {
    local task_id="$1"
    local task_name="$2"
    local assignee="$3"
    local description="$4"
    
    log_info "開始處理任務 #$task_id: $task_name"
    
    # 根據 assignee 決定執行方式
    case "$assignee" in
        "Cursor")
            log_warn "任務 #$task_id 需要 Cursor — 請手動開啟 Cursor 執行"
            notify_user "cursor" "$task_id" "$task_name"
            ;;
        "Ollama"|"ollama")
            log_info "執行 Ollama 任務..."
            notify_user "ollama" "$task_id" "$task_name"
            ;;
        "Bash"|"bash"|"Shell"|"shell")
            log_info "執行 Bash 任務..."
            notify_user "bash" "$task_id" "$task_name"
            ;;
        *)
            log_warn "任務 #$task_id ($assignee) 需要人工處理"
            notify_user "manual" "$task_id" "$task_name" "$assignee"
            ;;
    esac
}

# 通知用戶
notify_user() {
    local type="$1"
    local task_id="$2"
    local task_name="$3"
    local assignee="${4:-}"
    
    local msg=""
    case "$type" in
        "cursor")
            msg="📝 任務 #$task_id 需要 Cursor\n任務: $task_name\n請開啟 Cursor 執行此任務"
            ;;
        "ollama")
            msg="🤖 任務 #$task_id 需要 Ollama\n任務: $task_name"
            ;;
        "bash")
            msg="⚙️ 任務 #$task_id 可以 bash 執行\n任務: $task_name"
            ;;
        "manual")
            msg="👤 任務 #$task_id ($assignee) 需要人工處理\n任務: $task_name"
            ;;
    esac
    
    # 寫入通知檔案
    echo -e "$msg" >> "$LOG_DIR/notifications.log"
    echo -e "$msg"
}

# 主循環
main_loop() {
    log_info "AutoExecutor Lean 啟動"
    log_info "API URL: $API_URL"
    log_info "輪詢間隔: ${POLL_INTERVAL} 秒"
    
    while true; do
        # 檢查 API
        if ! check_api; then
            log_error "TaskBoard API 無法連接，等待重試..."
            sleep "$POLL_INTERVAL"
            continue
        fi
        
        # 獲取待執行任務
        local tasks
        tasks=$(get_pending_tasks)
        
        if [[ -z "$tasks" ]]; then
            echo -n "."
        else
            echo ""
            log_info "發現待執行任務"
            
            while IFS= read -r task_b64; do
                [[ -z "$task_b64" ]] && continue
                
                local task_json
                task_json=$(decode_task "$task_b64")
                
                local task_id task_name assignee description
                task_id=$(echo "$task_json" | jq -r '.id')
                task_name=$(echo "$task_json" | jq -r '.name')
                assignee=$(echo "$task_json" | jq -r '.assignee // "unknown"')
                description=$(echo "$task_json" | jq -r '.description')
                
                execute_task "$task_id" "$task_name" "$assignee" "$description"
                
            done <<< "$tasks"
        fi
        
        sleep "$POLL_INTERVAL"
    done
}

# 單次執行
run_once() {
    log_info "單次執行模式"
    
    if ! check_api; then
        log_error "TaskBoard API 無法連接"
        exit 1
    fi
    
    local tasks
    tasks=$(get_pending_tasks)
    
    if [[ -z "$tasks" ]]; then
        log_info "沒有待執行任務"
        return 0
    fi
    
    log_info "發現待執行任務："
    
    while IFS= read -r task_b64; do
        [[ -z "$task_b64" ]] && continue
        
        local task_json
        task_json=$(decode_task "$task_b64")
        
        local task_id task_name assignee
        task_id=$(echo "$task_json" | jq -r '.id')
        task_name=$(echo "$task_json" | jq -r '.name')
        assignee=$(echo "$task_json" | jq -r '.assignee // "unknown"')
        
        execute_task "$task_id" "$task_name" "$assignee" ""
        
    done <<< "$tasks"
}

# 停止
cmd_stop() {
    log_info "停止 AutoExecutor"
    pkill -f "auto-executor-lean" 2>/dev/null || true
}

# 使用說明
usage() {
    cat << EOF
AutoExecutor Lean - 簡易自動執行器

用法: $0 [command]

Commands:
    start       啟動持續輪詢模式（預設）
    once        單次執行，然後退出
    stop        停止

Examples:
    $0 start
    $0 once
    $0 stop
EOF
}

# 主程式
case "${1:-start}" in
    start)
        main_loop
        ;;
    once)
        run_once
        ;;
    stop)
        cmd_stop
        ;;
    help|-h|--help)
        usage
        ;;
    *)
        usage
        exit 1
        ;;
esac