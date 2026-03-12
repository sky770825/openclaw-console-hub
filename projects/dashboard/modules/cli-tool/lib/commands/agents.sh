#!/usr/bin/env bash
# Command: agents - 列出所有 Agents

cmd_agents_help() {
    cat << 'EOF'
用法: oc agents [選項]

列出所有可用的 Agents

選項:
  -r, --running        只顯示執行中的 Agents
  -a, --all            顯示所有 Agents (包括系統)
  --help               顯示此說明

範例:
  oc agents                    # 列出可用 Agents
  oc agents -r                 # 只顯示執行中的
EOF
}

cmd_agents() {
    local running_only=false
    local show_all=false
    
    # 解析參數
    while [[ $# -gt 0 ]]; do
        case "$1" in
            -r|--running)
                running_only=true
                shift
                ;;
            -a|--all)
                show_all=true
                shift
                ;;
            --help)
                cmd_agents_help
                return 0
                ;;
            *)
                error "未知選項: $1"
                cmd_agents_help
                return 1
                ;;
        esac
    done
    
    echo -e "\n${BOLD}🤖 可用 Agents${NC}\n"
    
    # 定義內建 Agents
    declare -A builtin_agents
    builtin_agents=(
        ["coder"]="程式碼開發與重構"
        ["analyst"]="資料分析與處理"
        ["research"]="研究與調查"
        ["reviewer"]="程式碼審查"
        ["tester"]="測試與 QA"
        ["writer"]="文件撰寫"
    )
    
    if [[ "$running_only" == "false" ]]; then
        echo -e "${BOLD}內建 Agents${NC}"
        printf "  %-15s %s\n" "名稱" "描述"
        printf "  %-15s %s\n" "----" "----"
        
        for name in "${!builtin_agents[@]}"; do
            local desc="${builtin_agents[$name]}"
            printf "  ${CYAN}%-15s${NC} %s\n" "$name" "$desc"
        done
        echo ""
    fi
    
    # 檢查執行中的 Agents
    echo -e "${BOLD}執行狀態${NC}"
    
    local tasks_dir="${HOME}/.openclaw/tasks"
    local found_running=false
    
    if [[ -d "$tasks_dir" ]]; then
        printf "  %-20s %-15s %-12s %s\n" "任務 ID" "Agent" "狀態" "執行時間"
        printf "  %-20s %-15s %-12s %s\n" "--------------------" "---------------" "------------" "--------"
        
        while IFS= read -r -d '' task_file; do
            local task_id task_agent task_status task_started
            
            task_id=$(basename "$task_file" .json)
            task_agent=$(grep -o '"agent": *"[^"]*"' "$task_file" 2>/dev/null | head -1 | cut -d'"' -f4 || echo "unknown")
            task_status=$(grep -o '"status": *"[^"]*"' "$task_file" 2>/dev/null | head -1 | cut -d'"' -f4 || echo "unknown")
            task_started=$(grep -o '"started_at": *"[^"]*"' "$task_file" 2>/dev/null | head -1 | cut -d'"' -f4 || echo "")
            
            if [[ "$running_only" == "true" && "$task_status" != "running" ]]; then
                continue
            fi
            
            found_running=true
            
            local status_colored
            status_colored=$(color_for_status "$task_status")
            
            local runtime="-"
            if [[ -n "$task_started" && "$task_started" != "null" ]]; then
                runtime="執行中"
            fi
            
            printf "  %-20s %-15s %-12b %s\n" "$task_id" "$task_agent" "$status_colored" "$runtime"
        done < <(find "$tasks_dir" -name "*.json" -type f -print0 2>/dev/null | sort -z -r)
        
        if [[ "$found_running" == "false" ]]; then
            info "目前沒有執行中的 Agents"
        fi
    else
        info "暫無任務記錄"
    fi
    
    echo ""
    info "使用 'oc spawn <agent> <task>' 啟動 Agent"
}
