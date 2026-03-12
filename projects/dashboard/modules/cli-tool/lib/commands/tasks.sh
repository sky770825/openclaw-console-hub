#!/usr/bin/env bash
# Command: tasks - 任務板摘要

cmd_tasks_help() {
    cat << 'EOF'
用法: oc tasks [選項]

查看任務板摘要

選項:
  -l, --limit <n>      顯示數量限制 (預設: 20)
  -s, --status <s>     按狀態過濾 (pending/running/completed/failed)
  -a, --all            顯示所有任務
  --watch              持續監控
  -h, --help           顯示此說明

範例:
  oc tasks                    # 顯示最近任務
  oc tasks -l 10             # 顯示最近 10 個
  oc tasks -s running        # 只顯示執行中
  oc tasks --watch           # 持續監控
EOF
}

cmd_tasks() {
    local limit=20
    local status_filter=""
    local show_all=false
    local watch_mode=false
    
    # 解析參數
    while [[ $# -gt 0 ]]; do
        case "$1" in
            -l|--limit)
                limit="$2"
                shift 2
                ;;
            -s|--status)
                status_filter="$2"
                shift 2
                ;;
            -a|--all)
                show_all=true
                shift
                ;;
            --watch)
                watch_mode=true
                shift
                ;;
            --help)
                cmd_tasks_help
                return 0
                ;;
            *)
                error "未知選項: $1"
                cmd_tasks_help
                return 1
                ;;
        esac
    done
    
    # 任務資料目錄
    local tasks_dir="${HOME}/.openclaw/tasks"
    
    # 顯示標題
    echo -e "\n${BOLD}📋 任務板摘要${NC}\n"
    
    # 使用 Python 輔助處理複雜邏輯
    if [[ -f "${LIB_DIR}/utils/tasks.py" ]]; then
        run_python tasks --limit "$limit" --status "$status_filter"
        return
    fi
    
    # Bash 簡易實作
    local task_files=()
    
    if [[ -d "$tasks_dir" ]]; then
        # 收集任務檔案
        while IFS= read -r -d '' file; do
            task_files+=("$file")
        done < <(find "$tasks_dir" -name "*.json" -type f -print0 2>/dev/null | head -z -n "$limit")
    fi
    
    if [[ ${#task_files[@]} -eq 0 ]]; then
        info "暫無任務記錄"
        info "任務目錄: $tasks_dir"
        return 0
    fi
    
    # 顯示任務統計
    local total=0
    local pending=0
    local running=0
    local completed=0
    local failed=0
    
    for task_file in "${task_files[@]}"; do
        ((total++))
        local task_status
        task_status=$(grep -o '"status": *"[^"]*"' "$task_file" 2>/dev/null | head -1 | cut -d'"' -f4 || echo "unknown")
        
        case "$task_status" in
            pending) ((pending++)) ;;
            running) ((running++)) ;;
            completed) ((completed++)) ;;
            failed) ((failed++)) ;;
        esac
    done
    
    # 顯示統計
    echo -e "總計: ${BOLD}$total${NC} | 等待: ${YELLOW}$pending${NC} | 執行: ${BLUE}$running${NC} | 完成: ${GREEN}$completed${NC} | 失敗: ${RED}$failed${NC}"
    echo ""
    
    # 顯示任務列表
    printf "%-24s %-15s %-12s %s\n" "時間" "Agent" "狀態" "任務"
    printf "%-24s %-15s %-12s %s\n" "------------------------" "---------------" "------------" "----"
    
    for task_file in "${task_files[@]}"; do
        local task_name task_agent task_status task_time
        
        task_name=$(basename "$task_file" .json)
        task_agent=$(grep -o '"agent": *"[^"]*"' "$task_file" 2>/dev/null | head -1 | cut -d'"' -f4 || echo "unknown")
        task_status=$(grep -o '"status": *"[^"]*"' "$task_file" 2>/dev/null | head -1 | cut -d'"' -f4 || echo "unknown")
        task_time=$(stat -c %y "$task_file" 2>/dev/null | cut -d'.' -f1 || stat -f %Sm "$task_file" 2>/dev/null || echo "unknown")
        
        # 過濾狀態
        if [[ -n "$status_filter" && "$task_status" != "$status_filter" ]]; then
            continue
        fi
        
        # 格式化狀態顯示
        local status_display
        status_display=$(color_for_status "$task_status")
        
        printf "%-24s %-15s %-12b %s\n" "$task_time" "$task_agent" "$status_display" "$task_name"
    done
    
    echo ""
    
    # 監控模式
    if [[ "$watch_mode" == "true" ]]; then
        info "按 Ctrl+C 停止監控"
        while true; do
            sleep 2
            # 清屏並重新顯示 (簡易實作)
            # clear
            # cmd_tasks
        done
    fi
}
