#!/bin/bash
set -e
# OpenClaw Agent 狀態管理器
# 用途：AI Agent 標記開始/結束工作

OPENCLAW_HOME="${OPENCLAW_HOME:-$HOME/.openclaw}"
STATUS_FILE="$OPENCLAW_HOME/.agent-status.json"
LOCK_FILE="$OPENCLAW_HOME/.agent-busy.lock"

# 開始工作
start_task() {
    local task="${1:-未知任務}"
    local tools="${2:-}"
    local timestamp=$(date "+%Y-%m-%d %H:%M:%S")
    
    # 建立鎖定檔案
    touch "$LOCK_FILE"
    
    # 寫入狀態
    cat > "$STATUS_FILE" <<EOF
{
  "status": "running",
  "task": "$task",
  "start_time": "$timestamp",
  "tools": [$(echo "$tools" | jq -R 'split(", ")' 2>/dev/null || echo "[]")],
  "session": "${OPENCLAW_SESSION:-default}"
}
EOF
    
    # 記錄到日誌
    echo "[$timestamp] START: $task" >> "$OPENCLAW_HOME/.agent-activity.log"
}

# 結束工作
end_task() {
    local result="${1:-完成}"
    local timestamp=$(date "+%Y-%m-%d %H:%M:%S")
    
    # 讀取目前任務
    local last_task="未知"
    if [[ -f "$STATUS_FILE" ]]; then
        last_task=$(jq -r '.task // "未知"' "$STATUS_FILE" 2>/dev/null) || last_task="未知"
    fi
    
    # 移除鎖定檔案
    rm -f "$LOCK_FILE"
    
    # 更新狀態為完成
    cat > "$STATUS_FILE" <<EOF
{
  "status": "idle",
  "last_task": "$last_task",
  "last_end_time": "$timestamp",
  "last_result": "$result"
}
EOF
    
    # 記錄到日誌
    echo "[$timestamp] END: $last_task ($result)" >> "$OPENCLAW_HOME/.agent-activity.log"
}

# 更新狀態（執行中）
update_status() {
    local message="${1:-}"
    
    if [[ -f "$STATUS_FILE" && -f "$LOCK_FILE" ]]; then
        local current=$(cat "$STATUS_FILE")
        local timestamp=$(date "+%Y-%m-%d %H:%M:%S")
        
        if [[ -n "$message" ]]; then
            echo "$current" | jq --arg msg "$message" --arg time "$timestamp" \
                '. + {progress: $msg, update_time: $time}' > "$STATUS_FILE.tmp"
            mv "$STATUS_FILE.tmp" "$STATUS_FILE"
        fi
    fi
}

# 強制重置（緊急情況）
force_reset() {
    rm -f "$LOCK_FILE"
    local timestamp=$(date "+%Y-%m-%d %H:%M:%S")
    cat > "$STATUS_FILE" <<EOF
{
  "status": "idle",
  "last_task": "強制重置",
  "last_end_time": "$timestamp",
  "note": "使用者強制重置"
}
EOF
    echo "[$timestamp] RESET: 使用者強制重置" >> "$OPENCLAW_HOME/.agent-activity.log"
}

# 顯示幫助
show_help() {
    cat <<EOF
Agent 狀態管理器

用法：
  $0 start "任務名稱" ["工具1, 工具2"]  - 標記開始工作
  $0 end ["結果"]                      - 標記結束工作
  $0 update "進度訊息"                 - 更新進度
  $0 reset                             - 強制重置
  $0 status                            - 顯示狀態

範例：
  $0 start "備份系統" "backup.sh, tar"
  $0 end "成功"
  $0 update "正在壓縮檔案..."
EOF
}

# 主入口
case "${1:-}" in
    start)
        start_task "$2" "$3"
        ;;
    end)
        end_task "$2"
        ;;
    update)
        update_status "$2"
        ;;
    reset)
        force_reset
        ;;
    status)
        ~/.openclaw/workspace/scripts/agent-status.sh
        ;;
    help|--help|-h)
        show_help
        ;;
    *)
        show_help
        exit 1
        ;;
esac
