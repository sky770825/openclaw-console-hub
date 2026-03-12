#!/bin/bash
# Task Board Agent Bus Listener
# 監聽 AMBP 訊息，自動更新任務板狀態

set -e

BUS_DIR="${HOME}/.openclaw/agent-bus"
MESSAGES_DIR="${BUS_DIR}/messages"
TASKBOARD_API="${OPENCLAW_TASKBOARD_URL:-http://localhost:3011}"
POLL_INTERVAL=10

# 顏色
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m'

# 顯示使用說明
show_help() {
    cat << 'EOF'
📋 Task Board AMBP Listener

使用方法:
  ./taskboard-listener.sh <command>

指令:
  start       啟動監聽模式（背景執行）
  stop        停止監聽
  status      顯示監聽狀態
  process     手動處理一次訊息
  help        顯示說明

範例:
  ./taskboard-listener.sh start    # 啟動背景監聽
  ./taskboard-listener.sh status   # 檢查狀態
EOF
}

# 更新任務狀態
update_task_status() {
    local task_id="$1"
    local status="$2"
    local result="${3:-}"
    
    echo "更新任務 $task_id → $status"
    
    # 呼叫任務板 API (使用 task-board-api.sh)
    local current_name=$(curl -s "${TASKBOARD_API}/api/tasks" 2>/dev/null | jq -r --arg id "$task_id" '.[] | select(.id == $id) | .name' 2>/dev/null)
    
    if [[ -z "$current_name" || "$current_name" == "null" ]]; then
        echo "  任務 $task_id 不存在於任務板，可能尚未建立"
        echo "  建議: 先在任務板建立此任務，或使用正確的任務 ID"
        return 1
    fi
    
    # 使用 task-board-api.sh 更新
    local desc="Agent 完成 - $result"
    ${HOME}/.openclaw/workspace/scripts/task-board-api.sh update-task "$task_id" "$current_name" "$desc" > /dev/null 2>&1
    
    echo "  更新成功: $current_name"
}

# 處理 Cursor completion 訊息
handle_cursor_completion() {
    local msg_file="$1"
    
    echo "處理 Cursor 完成訊息..."
    
    # 解析訊息
    local payload=$(cat "$msg_file" | jq -r '.payload // {}')
    local task_id=$(echo "$payload" | jq -r '.task_id // "unknown"')
    local summary=$(echo "$payload" | jq -r '.summary // "完成"')
    local changes=$(echo "$payload" | jq -r '.changes // ""')
    local project_dir=$(echo "$payload" | jq -r '.project_dir // ""')
    
    echo "  任務 ID: $task_id"
    echo "  摘要: $summary"
    echo "  變更: $changes"
    
    # 更新任務狀態
    if [[ "$task_id" != "unknown" && "$task_id" != "null" ]]; then
        local result="{\"agent\":\"cursor-agent\",\"summary\":\"${summary}\",\"changes\":\"${changes}\",\"project\":\"${project_dir}\"}"
        update_task_status "$task_id" "completed" "$result"
        
        # 發送通知給老蔡
        echo -e "${GREEN}✅ 任務 ${task_id} 已標記完成${NC}"
    else
        echo -e "${YELLOW}⚠️ 無效的任務 ID，跳過更新${NC}"
    fi
}

# 處理 CoDEX completion 訊息
handle_codex_completion() {
    local msg_file="$1"
    
    echo "處理 CoDEX 完成訊息..."
    
    local payload=$(cat "$msg_file" | jq -r '.payload // {}')
    local task_id=$(echo "$payload" | jq -r '.task_id // "unknown"')
    local summary=$(echo "$payload" | jq -r '.summary // "CoDEX 完成"')
    local output=$(echo "$payload" | jq -r '.output_preview // ""')
    
    echo "  任務 ID: $task_id"
    echo "  摘要: $summary"
    
    if [[ "$task_id" != "unknown" && "$task_id" != "null" ]]; then
        local result="{\"agent\":\"codex-agent\",\"summary\":\"${summary}\",\"output\":\"${output}\"}"
        update_task_status "$task_id" "completed" "$result"
        echo -e "${GREEN}✅ 任務 ${task_id} 已標記完成 (CoDEX)${NC}"
    else
        echo -e "${YELLOW}⚠️ 無效的任務 ID，跳過更新${NC}"
    fi
}

# 處理一般 completion 訊息
handle_completion() {
    local msg_file="$1"
    local from=$(cat "$msg_file" | jq -r '.from // "unknown"')
    
    case "$from" in
        *cursor*)
            handle_cursor_completion "$msg_file"
            ;;
        *codex*)
            handle_codex_completion "$msg_file"
            ;;
        *cellcog*)
            echo "處理 CellCog 完成訊息..."
            # TODO: 實作 CellCog 處理邏輯
            ;;
        *)
            echo "未知 Agent: $from"
            ;;
    esac
}

# 處理單一訊息
process_message() {
    local msg_file="$1"
    local msg_type=$(cat "$msg_file" | jq -r '.type // "unknown"')
    
    echo "[$msg_file] Type: $msg_type"
    
    case "$msg_type" in
        completion)
            handle_completion "$msg_file"
            ;;
        task_handoff)
            echo "收到任務交接訊息"
            # 可以自動指派給對應 Agent
            ;;
        status_update)
            echo "收到狀態更新"
            # 更新任務進度
            ;;
        blocker)
            echo -e "${YELLOW}🚨 收到阻礙通知！${NC}"
            # 通知老蔡需要介入
            ;;
        *)
            echo "未處理的訊息類型: $msg_type"
            ;;
    esac
}

# 處理所有 pending 訊息
process_pending_messages() {
    local pending_dir="${MESSAGES_DIR}/pending"
    
    # 查找給 taskboard 的訊息
    local found=0
    
    local pending_files=("${pending_dir}"/*.json)
    for msg_file in "${pending_files[@]}"; do
        [[ -f "$msg_file" ]] || continue
        
        # 檢查是否給 taskboard
        if grep -q '"to": "taskboard"' "$msg_file" 2>/dev/null; then
            found=1
            echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
            process_message "$msg_file"
            
            # 移動到 completed
            local msg_id=$(basename "$msg_file" .json)
            mv "$msg_file" "${MESSAGES_DIR}/completed/${msg_id}.json"
            echo "已歸檔: ${msg_id}"
            echo ""
        fi
    done
    
    if [[ $found -eq 0 ]]; then
        return 1
    fi
    
    return 0
}

# 啟動監聽
cmd_start() {
    local log_file="${BUS_DIR}/logs/taskboard-listener.log"
    
    # 檢查是否已經在執行
    local existing_pid=$(pgrep -f "taskboard-listener.sh start" | grep -v $$ | head -1)
    if [[ -n "$existing_pid" ]]; then
        echo -e "${YELLOW}監聽器已經在執行 (PID: $existing_pid)${NC}"
        return 0
    fi
    
    echo -e "${BLUE}📋 啟動 Task Board Listener${NC}"
    echo "API: $TASKBOARD_API"
    echo "輪詢間隔: ${POLL_INTERVAL}s"
    echo "日誌: $log_file"
    echo ""
    
    # 背景執行監聽循環
    (
        while true; do
            process_pending_messages >> "$log_file" 2>&1
            sleep "$POLL_INTERVAL"
        done
    ) &
    
    local pid=$!
    echo $pid > "${BUS_DIR}/taskboard-listener.pid"
    
    echo -e "${GREEN}✅ 監聽器已啟動 (PID: $pid)${NC}"
    echo "使用 './taskboard-listener.sh status' 檢查狀態"
}

# 停止監聽
cmd_stop() {
    local pid_file="${BUS_DIR}/taskboard-listener.pid"
    
    if [[ -f "$pid_file" ]]; then
        local pid=$(cat "$pid_file")
        if kill -0 "$pid" 2>/dev/null; then
            kill "$pid" 2>/dev/null
            rm "$pid_file"
            echo -e "${GREEN}✅ 監聽器已停止${NC}"
        else
            echo -e "${YELLOW}監聽器未在執行${NC}"
            rm -f "$pid_file"
        fi
    else
        # 嘗試直接查找並終止
        local pid=$(pgrep -f "taskboard-listener.sh start" | grep -v $$ | head -1)
        if [[ -n "$pid" ]]; then
            kill "$pid" 2>/dev/null
            echo -e "${GREEN}✅ 監聽器已停止${NC}"
        else
            echo -e "${YELLOW}監聽器未在執行${NC}"
        fi
    fi
}

# 顯示狀態
cmd_status() {
    echo -e "${BLUE}📋 Task Board Listener Status${NC}"
    echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
    echo ""
    
    # 檢查監聽程序
    local pid=$(pgrep -f "taskboard-listener.sh start" | grep -v $$ | head -1)
    if [[ -n "$pid" ]]; then
        echo -e "${GREEN}✅ 監聽執行中 (PID: $pid)${NC}"
    else
        echo -e "${YELLOW}⏸️ 監聽未執行${NC}"
    fi
    
    echo ""
    echo "配置:"
    echo "  API Endpoint: $TASKBOARD_API"
    echo "  輪詢間隔: ${POLL_INTERVAL}s"
    
    echo ""
    echo "待處理訊息:"
    local pending=$(ls -1 "${MESSAGES_DIR}/pending"/*.json 2>/dev/null | wc -l)
    echo "  Pending: $pending"
    
    echo ""
    echo "最近日誌:"
    local log_file="${BUS_DIR}/logs/taskboard-listener.log"
    if [[ -f "$log_file" ]]; then
        tail -10 "$log_file" | head -5
    else
        echo "  (無日誌)"
    fi
}

# 手動處理一次
cmd_process() {
    echo -e "${BLUE}📋 手動處理訊息${NC}"
    echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
    echo ""
    
    if process_pending_messages; then
        echo -e "${GREEN}✅ 處理完成${NC}"
    else
        echo -e "${YELLOW}沒有待處理的訊息${NC}"
    fi
}

# 主程式
main() {
    local cmd="${1:-help}"
    shift || true
    
    case $cmd in
        start) cmd_start "$@" ;;
        stop) cmd_stop "$@" ;;
        status) cmd_status "$@" ;;
        process) cmd_process "$@" ;;
        help|--help|-h) show_help ;;
        *)
            echo "未知指令: $cmd"
            show_help
            exit 1
            ;;
    esac
}

main "$@"
