#!/bin/bash
# Cursor Agent Connector for Agent Message Bus
# 監控 Cursor 工作目錄，自動發送完成訊息

set -e

# 配置
BUS_DIR="${HOME}/.openclaw/agent-bus"
CURSOR_DIR="${HOME}/.cursor"
WATCH_DIRS=("${HOME}/Desktop/程式專案資料夾" "${HOME}/Desktop/openclaw專用")
CHECK_INTERVAL=30

# 顏色
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m'

# 顯示使用說明
show_help() {
    cat << 'EOF'
🔧 Cursor Agent Connector

使用方法:
  ./cursor-connector.sh <command> [options]

指令:
  start       啟動監控模式
  status      顯示目前狀態
  complete    手動標記任務完成
  test        發送測試訊息
  help        顯示說明

範例:
  ./cursor-connector.sh start --watch ~/project
  ./cursor-connector.sh complete --task-id 123 --summary "修復完成"
EOF
}

# 發送完成訊息到 Bus
send_completion() {
    local task_id="${1:-unknown}"
    local summary="${2:-Task completed}"
    local changes="${3:-}"
    local project_dir="${4:-}"
    
    # 取得 git diff 統計
    local git_stats=""
    if [[ -n "$project_dir" && -d "$project_dir/.git" ]]; then
        git_stats=$(cd "$project_dir" && git diff --stat 2>/dev/null || echo "")
    fi
    
    # 組合 payload
    local payload=$(cat << EOF
{
  "task_id": "${task_id}",
  "agent": "cursor-agent",
  "result": "success",
  "summary": "${summary}",
  "changes": "${changes}",
  "git_stats": $(echo "$git_stats" | jq -Rs .),
  "completed_at": "$(date -u +"%Y-%m-%dT%H:%M:%SZ")",
  "project_dir": "${project_dir}"
}
EOF
)
    
    # 發送到 Bus
    ~/.openclaw/workspace/scripts/agent-bus.sh send \
        --from "cursor-agent" \
        --to "taskboard" \
        --type "completion" \
        --payload "$payload"
    
    echo -e "${GREEN}✅ 完成訊息已發送${NC}"
}

# 偵測 Cursor 活動
detect_cursor_activity() {
    local watch_dir="$1"
    
    # 檢查最近修改的檔案（5分鐘內）
    local recent_files=$(find "$watch_dir" -type f -mmin -5 2>/dev/null | head -20)
    
    # 檢查是否有 Cursor 相關的暫存檔或日誌
    local cursor_activity=$(find "$watch_dir" -name ".cursor*" -o -name "*cursor*" 2>/dev/null | head -5)
    
    if [[ -n "$recent_files" ]]; then
        echo "activity_detected"
        return 0
    fi
    
    return 1
}

# 取得專案資訊
get_project_info() {
    local project_dir="$1"
    
    local info="{}"
    
    # Git 資訊
    if [[ -d "$project_dir/.git" ]]; then
        local branch=$(cd "$project_dir" && git branch --show-current 2>/dev/null || echo "unknown")
        local last_commit=$(cd "$project_dir" && git log -1 --pretty=format:"%h %s" 2>/dev/null || echo "")
        local uncommitted=$(cd "$project_dir" && git status --short 2>/dev/null | wc -l | tr -d ' ')
        
        info=$(echo "$info" | jq --arg branch "$branch" \
            --arg commit "$last_commit" \
            --argjson uncommitted "$uncommitted" \
            '. + {git_branch: $branch, last_commit: $commit, uncommitted_changes: $uncommitted}')
    fi
    
    # 檔案統計
    local file_count=$(find "$project_dir" -type f 2>/dev/null | wc -l | tr -d ' ')
    local recent_changes=$(find "$project_dir" -type f -mmin -30 2>/dev/null | wc -l | tr -d ' ')
    
    info=$(echo "$info" | jq --argjson total "$file_count" \
        --argjson recent "$recent_changes" \
        '. + {total_files: $total, recent_changes: $recent}')
    
    echo "$info"
}

# 啟動監控
cmd_start() {
    local watch_dir="${HOME}/Desktop/程式專案資料夾"
    local task_id=""
    
    # 解析參數
    while [[ $# -gt 0 ]]; do
        case $1 in
            --watch) watch_dir="$2"; shift 2 ;;
            --task-id) task_id="$2"; shift 2 ;;
            *) shift ;;
        esac
    done
    
    echo -e "${BLUE}🔧 Cursor Connector 監控啟動${NC}"
    echo "監控目錄: $watch_dir"
    echo "檢查間隔: ${CHECK_INTERVAL}s"
    [[ -n "$task_id" ]] && echo "任務 ID: $task_id"
    echo "按 Ctrl+C 停止"
    echo ""
    
    local last_activity=0
    local idle_count=0
    
    while true; do
        clear
        echo -e "${BLUE}🔧 Cursor Connector Monitor${NC}"
        echo "$(date '+%Y-%m-%d %H:%M:%S') | 監控: $watch_dir"
        echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
        echo ""
        
        # 檢測活動
        if detect_cursor_activity "$watch_dir"; then
            echo -e "${GREEN}📝 檢測到活動${NC}"
            last_activity=$(date +%s)
            idle_count=0
            
            # 顯示最近修改的檔案
            echo "最近修改:"
            find "$watch_dir" -type f -mmin -10 2>/dev/null | head -5 | while read f; do
                echo "  • $(basename "$f")"
            done
        else
            idle_count=$((idle_count + 1))
            local idle_min=$((idle_count * CHECK_INTERVAL / 60))
            echo -e "${YELLOW}⏱️ 閒置中: ${idle_min}分鐘${NC}"
            
            # 閒置超過 10 分鐘且之前有活動，可能是完成
            if [[ $idle_count -gt 20 && $last_activity -ne 0 && -n "$task_id" ]]; then
                echo ""
                echo -e "${GREEN}🎯 檢測到任務可能完成（閒置10分鐘）${NC}"
                read -p "發送完成訊息? (y/n): " confirm
                if [[ "$confirm" == "y" ]]; then
                    local changes=$(find "$watch_dir" -type f -mmin -60 2>/dev/null | tr '\n' ', ')
                    send_completion "$task_id" "Cursor 編輯完成" "$changes" "$watch_dir"
                    task_id=""  # 重置
                fi
            fi
        fi
        
        # 顯示專案資訊
        echo ""
        echo "專案狀態:"
        local info=$(get_project_info "$watch_dir")
        echo "$info" | jq -r 'to_entries | .[] | "  \(.key): \(.value)"' 2>/dev/null || echo "  (無 git 資訊)"
        
        # 顯示最近的 Bus 訊息
        echo ""
        echo "最近 Bus 活動:"
        ~/.openclaw/workspace/scripts/agent-bus.sh history --agent "cursor-agent" --limit 3 2>/dev/null || echo "  (無訊息)"
        
        sleep "$CHECK_INTERVAL"
    done
}

# 顯示狀態
cmd_status() {
    echo -e "${BLUE}🔧 Cursor Connector Status${NC}"
    echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
    echo ""
    
    # 檢查監控程序
    local pid=$(pgrep -f "cursor-connector.sh start" | grep -v $$ | head -1)
    if [[ -n "$pid" ]]; then
        echo -e "${GREEN}✅ 監控執行中 (PID: $pid)${NC}"
    else
        echo -e "${YELLOW}⏸️ 監控未執行${NC}"
    fi
    
    echo ""
    echo "監控目錄:"
    for dir in "${WATCH_DIRS[@]}"; do
        if [[ -d "$dir" ]]; then
            local activity=$(find "$dir" -type f -mmin -30 2>/dev/null | wc -l)
            echo "  • $dir (${activity} 個檔案近期變更)"
        fi
    done
    
    echo ""
    echo "最近完成的任務:"
    ~/.openclaw/workspace/scripts/agent-bus.sh history --agent "cursor-agent" --limit 5
}

# 手動標記完成
cmd_complete() {
    local task_id=""
    local summary="任務完成"
    local project_dir=""
    
    while [[ $# -gt 0 ]]; do
        case $1 in
            --task-id) task_id="$2"; shift 2 ;;
            --summary) summary="$2"; shift 2 ;;
            --project) project_dir="$2"; shift 2 ;;
            *) shift ;;
        esac
    done
    
    if [[ -z "$task_id" ]]; then
        echo -e "${YELLOW}請提供 --task-id${NC}"
        read -p "任務 ID: " task_id
    fi
    
    if [[ -z "$project_dir" ]]; then
        project_dir="${HOME}/Desktop/程式專案資料夾"
    fi
    
    # 取得變更的檔案
    local changes=""
    if [[ -d "$project_dir/.git" ]]; then
        changes=$(cd "$project_dir" && git diff --name-only 2>/dev/null | tr '\n' ', ')
    fi
    
    send_completion "$task_id" "$summary" "$changes" "$project_dir"
}

# 發送測試訊息
cmd_test() {
    echo -e "${YELLOW}發送測試訊息...${NC}"
    
    send_completion "test-task-001" "Cursor 測試完成" "test.ts, test.tsx" "${HOME}/Desktop"
    
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
