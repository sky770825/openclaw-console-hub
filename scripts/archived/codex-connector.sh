#!/bin/bash
# CoDEX Agent Connector for Agent Message Bus
# 整合 codexmonitor，自動同步 CoDEX 任務狀態到 AMBP

set -e

# 配置
BUS_DIR="${HOME}/.openclaw/agent-bus"
CODEX_DIR="${HOME}/.codex"
CHECK_INTERVAL=30

# 顏色
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
RED='\033[0;31m'
NC='\033[0m'

# 顯示使用說明
show_help() {
    cat << 'EOF'
🤖 CoDEX Agent Connector

使用方法:
  ./codex-connector.sh <command> [options]

指令:
  start       啟動監控模式
  status      顯示 CoDEX 狀態
  send        手動發送訊息
  complete    手動標記任務完成
  test        發送測試訊息
  help        顯示說明

範例:
  ./codex-connector.sh start --task-id 123
  ./codex-connector.sh complete --task-id 123 --summary "分析完成"
EOF
}

# 發送訊息到 Bus
send_to_bus() {
    local type="$1"
    local payload="$2"
    
    ~/.openclaw/workspace/scripts/agent-bus.sh send \
        --from "codex-agent" \
        --to "taskboard" \
        --type "$type" \
        --payload "$payload"
}

# 檢查 codexmonitor 是否安裝
check_codexmonitor() {
    if ! command -v codexmonitor &> /dev/null; then
        echo -e "${YELLOW}⚠️ codexmonitor 未安裝，將使用替代方法${NC}"
        return 1
    fi
    return 0
}

# 取得 CoDEX 會話狀態
get_codex_sessions() {
    # 檢查 codex sessions 目錄
    local sessions_dir="${CODEX_DIR}/sessions"
    
    if [[ ! -d "$sessions_dir" ]]; then
        echo "[]"
        return
    fi
    
    # 列出最近的會話
    local sessions="["
    local first=true
    
    for session_file in $(ls -t "${sessions_dir}"/*.json 2>/dev/null | head -5); do
        [[ -f "$session_file" ]] || continue
        
        local name=$(basename "$session_file" .json)
        local mtime=$(stat -f %m "$session_file" 2>/dev/null || stat -c %Y "$session_file" 2>/dev/null)
        local mtime_fmt=$(date -r "$mtime" '+%Y-%m-%d %H:%M:%S' 2>/dev/null || date -d @$mtime '+%Y-%m-%d %H:%M:%S' 2>/dev/null)
        
        # 嘗試解析狀態
        local status="unknown"
        if [[ -s "$session_file" ]]; then
            status=$(cat "$session_file" 2>/dev/null | jq -r '.status // "unknown"' 2>/dev/null || echo "unknown")
        fi
        
        if [[ "$first" == true ]]; then
            first=false
        else
            sessions+=","
        fi
        
        sessions+="{\"name\":\"${name}\",\"mtime\":\"${mtime_fmt}\",\"status\":\"${status}\"}"
    done
    
    sessions+="]"
    echo "$sessions"
}

# 發送完成訊息
send_completion() {
    local task_id="${1:-unknown}"
    local summary="${2:-CoDEX 任務完成}"
    local output="${3:-}"
    
    local payload=$(cat << EOF
{
  "task_id": "${task_id}",
  "agent": "codex-agent",
  "result": "success",
  "summary": "${summary}",
  "output_preview": $(echo "$output" | head -c 500 | jq -Rs .),
  "completed_at": "$(date -u +"%Y-%m-%dT%H:%M:%SZ")"
}
EOF
)
    
    send_to_bus "completion" "$payload"
    echo -e "${GREEN}✅ CoDEX 完成訊息已發送${NC}"
}

# 發送狀態更新
send_status_update() {
    local task_id="$1"
    local status="$2"
    local progress="${3:-0}"
    local message="${4:-}"
    
    local payload=$(cat << EOF
{
  "task_id": "${task_id}",
  "agent": "codex-agent",
  "status": "${status}",
  "progress": ${progress},
  "message": "${message}",
  "updated_at": "$(date -u +"%Y-%m-%dT%H:%M:%SZ")"
}
EOF
)
    
    send_to_bus "status_update" "$payload"
    echo -e "${BLUE}📊 狀態更新已發送: ${status} (${progress}%)${NC}"
}

# 啟動監控
cmd_start() {
    local task_id=""
    
    while [[ $# -gt 0 ]]; do
        case $1 in
            --task-id) task_id="$2"; shift 2 ;;
            *) shift ;;
        esac
    done
    
    echo -e "${BLUE}🤖 CoDEX Connector 監控啟動${NC}"
    echo "檢查間隔: ${CHECK_INTERVAL}s"
    [[ -n "$task_id" ]] && echo "任務 ID: $task_id"
    echo "按 Ctrl+C 停止"
    echo ""
    
    local last_status=""
    local start_time=$(date +%s)
    
    while true; do
        clear
        echo -e "${BLUE}🤖 CoDEX Connector Monitor${NC}"
        echo "$(date '+%Y-%m-%d %H:%M:%S')"
        echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
        echo ""
        
        # 顯示 CoDEX 會話
        echo "最近 CoDEX 會話:"
        local sessions=$(get_codex_sessions)
        if [[ "$sessions" != "[]" ]]; then
            echo "$sessions" | jq -r '.[] | "  • \(.name) | \(.status) | \(.mtime)"' 2>/dev/null || echo "$sessions"
        else
            echo "  (無會話)"
        fi
        
        echo ""
        
        # 如果有指定任務，模擬進度更新
        if [[ -n "$task_id" ]]; then
            local elapsed=$(( ($(date +%s) - start_time) / 60 ))
            local progress=$(( elapsed * 5 ))
            [[ $progress -gt 100 ]] && progress=100
            
            echo "任務進度:"
            echo "  ID: $task_id"
            echo "  執行時間: ${elapsed}分鐘"
            echo "  進度: ${progress}%"
            
            # 繪製進度條
            local filled=$(( progress / 5 ))
            local empty=$(( 20 - filled ))
            printf "  ["
            printf '%*s' "$filled" | tr ' ' '█'
            printf '%*s' "$empty" | tr ' ' '░'
            printf "] %d%%\n" "$progress"
            
            # 每 5 分鐘發送狀態更新
            if [[ $(( elapsed % 5 )) -eq 0 && $elapsed -ne 0 ]]; then
                if [[ "$last_status" != "progress-${elapsed}" ]]; then
                    send_status_update "$task_id" "running" "$progress" "持續處理中..."
                    last_status="progress-${elapsed}"
                fi
            fi
        fi
        
        echo ""
        echo "AMBP 活動:"
        ~/.openclaw/workspace/scripts/agent-bus.sh history --agent "codex-agent" --limit 3 2>/dev/null || echo "  (無訊息)"
        
        sleep "$CHECK_INTERVAL"
    done
}

# 顯示狀態
cmd_status() {
    echo -e "${BLUE}🤖 CoDEX Connector Status${NC}"
    echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
    echo ""
    
    # 檢查監控程序
    local pid=$(pgrep -f "codex-connector.sh start" | grep -v $$ | head -1)
    if [[ -n "$pid" ]]; then
        echo -e "${GREEN}✅ 監控執行中 (PID: $pid)${NC}"
    else
        echo -e "${YELLOW}⏸️ 監控未執行${NC}"
    fi
    
    echo ""
    echo "CoDEX 配置:"
    echo "  目錄: ${CODEX_DIR}"
    if [[ -d "${CODEX_DIR}/sessions" ]]; then
        local count=$(ls -1 "${CODEX_DIR}/sessions"/*.json 2>/dev/null | wc -l)
        echo "  會話數: $count"
    else
        echo "  會話數: 0"
    fi
    
    # 檢查 codexmonitor
    echo ""
    echo "工具狀態:"
    if check_codexmonitor; then
        echo -e "  ${GREEN}✅ codexmonitor${NC}"
    else
        echo -e "  ${YELLOW}⚠️ codexmonitor (未安裝)${NC}"
    fi
    
    echo ""
    echo "最近 CoDEX 會話:"
    local sessions=$(get_codex_sessions)
    if [[ "$sessions" != "[]" ]]; then
        echo "$sessions" | jq -r '.[] | "  • \(.name) (\(.status))"' 2>/dev/null
    else
        echo "  (無會話)"
    fi
}

# 手動發送訊息
cmd_send() {
    local type="status_update"
    local task_id=""
    local message=""
    
    while [[ $# -gt 0 ]]; do
        case $1 in
            --type) type="$2"; shift 2 ;;
            --task-id) task_id="$2"; shift 2 ;;
            --message) message="$2"; shift 2 ;;
            *) shift ;;
        esac
    done
    
    if [[ -z "$task_id" ]]; then
        read -p "任務 ID: " task_id
    fi
    
    if [[ -z "$message" ]]; then
        read -p "訊息: " message
    fi
    
    case "$type" in
        completion)
            send_completion "$task_id" "$message"
            ;;
        status_update)
            send_status_update "$task_id" "running" 50 "$message"
            ;;
        *)
            echo "未知類型: $type"
            return 1
            ;;
    esac
}

# 手動標記完成
cmd_complete() {
    local task_id=""
    local summary="CoDEX 任務完成"
    local output=""
    
    while [[ $# -gt 0 ]]; do
        case $1 in
            --task-id) task_id="$2"; shift 2 ;;
            --summary) summary="$2"; shift 2 ;;
            --output) output="$2"; shift 2 ;;
            *) shift ;;
        esac
    done
    
    if [[ -z "$task_id" ]]; then
        echo -e "${YELLOW}請提供 --task-id${NC}"
        read -p "任務 ID: " task_id
    fi
    
    send_completion "$task_id" "$summary" "$output"
}

# 發送測試訊息
cmd_test() {
    echo -e "${YELLOW}發送 CoDEX 測試訊息...${NC}"
    
    send_completion "test-codex-001" "CoDEX 分析完成" "分析結果: 找到 3 個效能瓶頸..."
    
    echo ""
    echo -e "${BLUE}檢查 Bus 狀態:${NC}"
    ~/.openclaw/workspace/scripts/agent-bus.sh status
}

# 主程式
main() {
    local cmd="${1:-help}"
    shift || true
    
    case $cmd in
        start) cmd_start "$@" ;;
        status) cmd_status "$@" ;;
        send) cmd_send "$@" ;;
        complete) cmd_complete "$@" ;;
        test) cmd_test "$@" ;;
        help|--help|-h) show_help ;;
        *)
            echo "未知指令: $cmd"
            show_help
            exit 1
            ;;
    esac
}

main "$@"
