#!/usr/bin/env bash
# Command: stop - 停止 Agent

cmd_stop_help() {
    cat << 'EOF'
用法: oc stop <agent|task-id> [選項]

停止執行中的 Agent 或任務

選項:
  -f, --force          強制停止
  --help               顯示此說明

範例:
  oc stop coder                # 停止 coder agent
  oc stop task-20240101        # 停止指定任務
  oc stop coder -f             # 強制停止
EOF
}

cmd_stop() {
    if [[ $# -lt 1 ]]; then
        error "請指定 Agent 名稱或任務 ID"
        cmd_stop_help
        return 1
    fi
    
    local target="$1"
    shift
    
    local force=false
    
    # 解析參數
    while [[ $# -gt 0 ]]; do
        case "$1" in
            -f|--force)
                force=true
                shift
                ;;
            --help)
                cmd_stop_help
                return 0
                ;;
            *)
                error "未知選項: $1"
                cmd_stop_help
                return 1
                ;;
        esac
    done
    
    info "停止: $target"
    
    # 嘗試尋找對應的行程
    local pid
    pid=$(pgrep -f "openclaw.*$target" | head -1)
    
    if [[ -n "$pid" ]]; then
        if [[ "$force" == "true" ]]; then
            kill -9 "$pid" 2>/dev/null
        else
            kill "$pid" 2>/dev/null
        fi
        
        # 等待確認
        sleep 1
        if pgrep -P "$pid" >/dev/null 2>&1; then
            error "無法停止行程 (PID: $pid)"
            return 1
        else
            success "已停止 (PID: $pid)"
        fi
    else
        # 更新任務狀態檔案
        local tasks_dir="${HOME}/.openclaw/tasks"
        local found=false
        
        for task_file in "$tasks_dir"/*.json; do
            if [[ -f "$task_file" ]]; then
                if grep -q "\"agent\": *\"$target\"" "$task_file" 2>/dev/null || \
                   [[ "$(basename "$task_file" .json)" == "$target" ]]; then
                    
                    # 更新狀態為 stopped
                    sed -i.bak 's/"status": "running"/"status": "stopped"/' "$task_file" 2>/dev/null || true
                    rm -f "${task_file}.bak"
                    found=true
                    success "已更新任務狀態: $(basename "$task_file" .json)"
                fi
            fi
        done
        
        if [[ "$found" == "false" ]]; then
            warn "找不到執行中的 Agent 或任務: $target"
        fi
    fi
}
