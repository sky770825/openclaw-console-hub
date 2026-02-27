#!/bin/bash
# Agent Message Bus CLI
# 多 Agent 訊息匯流排命令列工具

set -e

BUS_DIR="${HOME}/.openclaw/agent-bus"
MESSAGES_DIR="${BUS_DIR}/messages"
SESSIONS_DIR="${BUS_DIR}/sessions"
LOGS_DIR="${BUS_DIR}/logs"

# 顏色輸出
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# 顯示使用說明
show_help() {
    cat << 'EOF'
🚌 Agent Message Bus CLI

使用方法:
  ./agent-bus.sh <command> [options]

指令:
  send        發送訊息給其他 Agent
  receive     接收給自己的訊息
  status      顯示 Bus 狀態
  history     顯示訊息歷史
  complete    標記訊息為已完成
  monitor     監控模式（持續輪詢）
  help        顯示此說明

範例:
  # 發送任務交接訊息
  ./agent-bus.sh send --from cursor-agent --to codex-agent \
    --type task_handoff --payload '{"task_id":"123"}'

  # 檢查狀態
  ./agent-bus.sh status

  # 監控模式（自動接收新訊息）
  ./agent-bus.sh monitor --agent openclaw-agent
EOF
}

# 產生 UUID
generate_uuid() {
    uuidgen 2>/dev/null || echo "$(date +%s)-$$-$RANDOM"
}

# 取得當前時間戳
get_timestamp() {
    date -u +"%Y-%m-%dT%H:%M:%SZ"
}

# 驗證訊息格式
validate_message() {
    local msg="$1"
    # 簡單檢查必要欄位
    if ! echo "$msg" | grep -q '"from"'; then
        echo "錯誤: 缺少 'from' 欄位" >&2
        return 1
    fi
    if ! echo "$msg" | grep -q '"to"'; then
        echo "錯誤: 缺少 'to' 欄位" >&2
        return 1
    fi
    if ! echo "$msg" | grep -q '"type"'; then
        echo "錯誤: 缺少 'type' 欄位" >&2
        return 1
    fi
    return 0
}

# 發送訊息
cmd_send() {
    local from=""
    local to=""
    local type=""
    local payload="{}"
    local priority="normal"
    local metadata="{}"
    
    # 解析參數
    while [[ $# -gt 0 ]]; do
        case $1 in
            --from) from="$2"; shift 2 ;;
            --to) to="$2"; shift 2 ;;
            --type) type="$2"; shift 2 ;;
            --payload) payload="$2"; shift 2 ;;
            --priority) priority="$2"; shift 2 ;;
            --metadata) metadata="$2"; shift 2 ;;
            *) shift ;;
        esac
    done
    
    # 驗證必要參數
    if [[ -z "$from" || -z "$to" || -z "$type" ]]; then
        echo -e "${RED}錯誤: 缺少必要參數 --from, --to, 或 --type${NC}" >&2
        return 1
    fi
    
    # 產生訊息
    local msg_id=$(generate_uuid)
    local timestamp=$(get_timestamp)
    
    local message=$(cat << EOF
{
  "message_id": "${msg_id}",
  "timestamp": "${timestamp}",
  "from": "${from}",
  "to": "${to}",
  "type": "${type}",
  "priority": "${priority}",
  "payload": ${payload},
  "metadata": ${metadata},
  "status": "pending"
}
EOF
)
    
    # 驗證訊息
    if ! validate_message "$message"; then
        return 1
    fi
    
    # 儲存訊息
    local msg_file="${MESSAGES_DIR}/pending/${msg_id}.json"
    echo "$message" > "$msg_file"
    
    # 記錄日誌
    echo "[$(date '+%Y-%m-%d %H:%M:%S')] SEND: ${msg_id} from ${from} to ${to} (${type})" \
        >> "${LOGS_DIR}/bus-$(date +%Y-%m-%d).log"
    
    echo -e "${GREEN}✅ 訊息已發送${NC}"
    echo "   ID: ${msg_id}"
    echo "   From: ${from}"
    echo "   To: ${to}"
    echo "   Type: ${type}"
    
    # 如果目標是任務板，也更新任務狀態
    if [[ "$to" == *"taskboard"* ]]; then
        echo -e "${YELLOW}   📋 已通知任務板${NC}"
    fi
    
    echo "${msg_id}"
}

# 接收訊息
cmd_receive() {
    local agent=""
    local mark_read=true
    
    while [[ $# -gt 0 ]]; do
        case $1 in
            --agent) agent="$2"; shift 2 ;;
            --no-mark) mark_read=false; shift ;;
            *) shift ;;
        esac
    done
    
    if [[ -z "$agent" ]]; then
        echo -e "${RED}錯誤: 請指定 --agent${NC}" >&2
        return 1
    fi
    
    # 查找給該 Agent 的待處理訊息
    local pending_dir="${MESSAGES_DIR}/pending"
    local found=0
    
    local msg_files=("${pending_dir}"/*.json)
    for msg_file in "${msg_files[@]}"; do
        [[ -f "$msg_file" ]] || continue
        
        if grep -q "\"to\": \"${agent}\"" "$msg_file" 2>/dev/null; then
            found=1
            echo -e "${GREEN}📨 新訊息:${NC}"
            cat "$msg_file" | python3 -m json.tool 2>/dev/null || cat "$msg_file"
            
            if [[ "$mark_read" == true ]]; then
                local msg_id=$(basename "$msg_file" .json)
                mv "$msg_file" "${MESSAGES_DIR}/processing/${msg_id}.json"
                echo -e "${YELLOW}   → 已移至 processing${NC}"
            fi
            
            echo ""
        fi
    done
    
    if [[ $found -eq 0 ]]; then
        echo -e "${BLUE}📭 沒有新訊息${NC}"
    fi
}

# 顯示狀態
cmd_status() {
    echo -e "${BLUE}🚌 Agent Message Bus Status${NC}"
    echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
    echo ""
    
    # 統計各目錄檔案數
    local pending=$(ls -1 "${MESSAGES_DIR}/pending"/*.json 2>/dev/null | wc -l)
    local processing=$(ls -1 "${MESSAGES_DIR}/processing"/*.json 2>/dev/null | wc -l)
    local completed=$(ls -1 "${MESSAGES_DIR}/completed"/*.json 2>/dev/null | wc -l)
    
    echo "Message Queue:"
    echo "  Pending:     ${pending}"
    echo "  Processing:  ${processing}"
    echo "  Completed:   ${completed}"
    echo ""
    
    # 顯示進行中的 Agent
    if [[ $processing -gt 0 ]]; then
        echo "Processing Agents:"
        local proc_files=("${MESSAGES_DIR}/processing"/*.json)
        for msg_file in "${proc_files[@]}"; do
            [[ -f "$msg_file" ]] || continue
            local type=$(grep -o '"type": "[^"]*"' "$msg_file" 2>/dev/null | head -1 | cut -d'"' -f4)
            echo "  • ${to_agent} (${type})"
        done
        echo ""
    fi
    
    # 顯示今日統計
    local today_log="${LOGS_DIR}/bus-$(date +%Y-%m-%d).log"
    if [[ -f "$today_log" ]]; then
        local today_messages=$(grep -c "SEND:" "$today_log" 2>/dev/null || echo "0")
        echo "Today's Stats:"
        echo "  Messages Sent: ${today_messages}"
    fi
}

# 標記完成
cmd_complete() {
    local msg_id=""
    
    while [[ $# -gt 0 ]]; do
        case $1 in
            --id) msg_id="$2"; shift 2 ;;
            *) shift ;;
        esac
    done
    
    if [[ -z "$msg_id" ]]; then
        echo -e "${RED}錯誤: 請指定 --id${NC}" >&2
        return 1
    fi
    
    local processing_file="${MESSAGES_DIR}/processing/${msg_id}.json"
    local completed_file="${MESSAGES_DIR}/completed/${msg_id}.json"
    
    if [[ ! -f "$processing_file" ]]; then
        echo -e "${RED}錯誤: 找不到處理中的訊息 ${msg_id}${NC}" >&2
        return 1
    fi
    
    # 更新狀態並移動
    local msg=$(cat "$processing_file")
    msg=$(echo "$msg" | sed 's/"status": *"processing"/"status": "completed"/')
    msg=$(echo "$msg" | sed "s/\"completed_at\": *null/\"completed_at\": \"$(get_timestamp)\"/" 2>/dev/null || echo "$msg")
    
    echo "$msg" > "$completed_file"
    rm "$processing_file"
    
    echo -e "${GREEN}✅ 訊息已標記完成${NC}: ${msg_id}"
}

# 顯示歷史
cmd_history() {
    local limit=10
    local agent=""
    
    while [[ $# -gt 0 ]]; do
        case $1 in
            --limit) limit="$2"; shift 2 ;;
            --agent) agent="$2"; shift 2 ;;
            *) shift ;;
        esac
    done
    
    echo -e "${BLUE}📜 最近訊息歷史${NC}"
    echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
    echo ""
    
    local count=0
    for msg_file in $(ls -t "${MESSAGES_DIR}/completed"/*.json 2>/dev/null); do
        [[ -f "$msg_file" ]] || continue
        [[ $count -lt $limit ]] || break
        
        local from=$(grep -o '"from": *"[^"]*"' "$msg_file" | head -1 | cut -d'"' -f4)
        local to=$(grep -o '"to": *"[^"]*"' "$msg_file" | head -1 | cut -d'"' -f4)
        local type=$(grep -o '"type": *"[^"]*"' "$msg_file" | head -1 | cut -d'"' -f4)
        local timestamp=$(grep -o '"timestamp": *"[^"]*"' "$msg_file" | head -1 | cut -d'"' -f4)
        
        if [[ -z "$agent" || "$from" == *"$agent"* || "$to" == *"$agent"* ]]; then
            echo "[${timestamp}] ${from} → ${to}"
            echo "  Type: ${type}"
            echo ""
            ((count++))
        fi
    done
    
    if [[ $count -eq 0 ]]; then
        echo -e "${YELLOW}沒有歷史訊息${NC}"
    fi
}

# 監控模式
cmd_monitor() {
    local agent=""
    local interval=5
    
    while [[ $# -gt 0 ]]; do
        case $1 in
            --agent) agent="$2"; shift 2 ;;
            --interval) interval="$2"; shift 2 ;;
            *) shift ;;
        esac
    done
    
    if [[ -z "$agent" ]]; then
        echo -e "${RED}錯誤: 請指定 --agent${NC}" >&2
        return 1
    fi
    
    echo -e "${GREEN}🔍 監控模式啟動${NC}: ${agent}"
    echo "按 Ctrl+C 停止"
    echo ""
    
    while true; do
        clear
        echo -e "${BLUE}🚌 Agent Message Bus Monitor${NC}"
        echo "Agent: ${agent} | $(date '+%Y-%m-%d %H:%M:%S')"
        echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
        echo ""
        
        cmd_receive --agent "$agent" --no-mark
        
        echo ""
        echo -e "${YELLOW}等待新訊息... (${interval}s)${NC}"
        sleep "$interval"
    done
}

# 主程式
main() {
    # 確保目錄存在
    mkdir -p "${MESSAGES_DIR}"/{pending,processing,completed,archive}
    mkdir -p "${SESSIONS_DIR}"
    mkdir -p "${LOGS_DIR}"
    
    local cmd="${1:-help}"
    shift || true
    
    case $cmd in
        send) cmd_send "$@" ;;
        receive) cmd_receive "$@" ;;
        status) cmd_status "$@" ;;
        complete) cmd_complete "$@" ;;
        history) cmd_history "$@" ;;
        monitor) cmd_monitor "$@" ;;
        help|--help|-h) show_help ;;
        *) 
            echo -e "${RED}未知指令: $cmd${NC}" >&2
            show_help
            exit 1
            ;;
    esac
}

main "$@"
