#!/usr/bin/env bash
# Command: spawn - 啟動 Agent

cmd_spawn_help() {
    cat << 'EOF'
用法: oc spawn <agent-type> ["task description"] [選項]

一鍵啟動 Agent 執行任務

Agent 類型:
  coder              程式碼開發 Agent
  analyst            分析師 Agent
  research           研究 Agent
  reviewer           審查 Agent
  custom             自訂 Agent

選項:
  -m, --model <id>   指定模型
  -t, --timeout <s>  設定超時秒數
  -p, --priority     設定優先級 (high/normal/low)
  -d, --detach       背景執行
  -w, --wait         等待完成
  --dry-run          模擬執行不實際啟動
  --help             顯示此說明

範例:
  oc spawn coder "修復 login bug"
  oc spawn analyst "分析日誌檔案" -m gpt-4o
  oc spawn research "調查新技術" -t 300
  oc spawn coder "重構程式碼" -d -w
EOF
}

cmd_spawn() {
    # 檢查參數
    if [[ $# -lt 1 ]]; then
        error "請指定 Agent 類型"
        cmd_spawn_help
        return 1
    fi
    
    local agent_type="$1"
    shift
    
    local task_desc=""
    local model=""
    local timeout=""
    local priority="normal"
    local detach=false
    local wait=false
    local dry_run=false
    
    # 解析參數
    while [[ $# -gt 0 ]]; do
        case "$1" in
            -m|--model)
                model="$2"
                shift 2
                ;;
            -t|--timeout)
                timeout="$2"
                shift 2
                ;;
            -p|--priority)
                priority="$2"
                shift 2
                ;;
            -d|--detach)
                detach=true
                shift
                ;;
            -w|--wait)
                wait=true
                shift
                ;;
            --dry-run)
                dry_run=true
                shift
                ;;
            --help)
                cmd_spawn_help
                return 0
                ;;
            *)
                # 收集任務描述
                if [[ -z "$task_desc" ]]; then
                    task_desc="$1"
                else
                    task_desc="$task_desc $1"
                fi
                shift
                ;;
        esac
    done
    
    # 驗證 Agent 類型
    local valid_agents=("coder" "analyst" "research" "reviewer" "custom")
    local is_valid=false
    for valid in "${valid_agents[@]}"; do
        if [[ "$agent_type" == "$valid" ]]; then
            is_valid=true
            break
        fi
    done
    
    if [[ "$is_valid" == "false" ]]; then
        error "未知的 Agent 類型: $agent_type"
        info "有效類型: ${valid_agents[*]}"
        return 1
    fi
    
    # 預設任務描述
    if [[ -z "$task_desc" ]]; then
        task_desc="執行預設任務"
    fi
    
    # 從設定讀取預設值
    if [[ -z "$model" ]]; then
        model=$(config_get "agents.${agent_type}.model" "kimi/kimi-k2.5")
    fi
    if [[ -z "$timeout" ]]; then
        timeout=$(config_get "agents.${agent_type}.timeout" "300")
    fi
    
    # 顯示任務資訊
    echo -e "\n${BOLD}🚀 啟動 Agent${NC}\n"
    echo "Agent 類型: ${CYAN}$agent_type${NC}"
    echo "任務描述: ${YELLOW}$task_desc${NC}"
    echo "使用模型: ${GREEN}$model${NC}"
    echo "超時設定: ${timeout} 秒"
    echo "優先級別: ${priority}"
    echo ""
    
    # 乾跑模式
    if [[ "$dry_run" == "true" ]]; then
        info "【乾跑模式】不實際啟動 Agent"
        return 0
    fi
    
    # 產生任務 ID
    local task_id
    task_id="${agent_type}-$(date +%Y%m%d-%H%M%S)-$(openssl rand -hex 4 2>/dev/null || echo $$)"
    
    # 建立任務記錄
    local tasks_dir="${HOME}/.openclaw/tasks"
    mkdir -p "$tasks_dir"
    
    cat > "${tasks_dir}/${task_id}.json" << EOF
{
    "task_id": "$task_id",
    "agent": "$agent_type",
    "description": "$task_desc",
    "model": "$model",
    "timeout": $timeout,
    "priority": "$priority",
    "status": "pending",
    "created_at": "$(date -Iseconds)",
    "started_at": null,
    "completed_at": null
}
EOF
    
    info "任務 ID: $task_id"
    
    # 執行任務 (這裡需要整合實際的 openclaw spawn 邏輯)
    # 目前提供模擬實作
    
    if [[ "$detach" == "true" ]]; then
        # 背景執行
        (
            sleep 1
            # 模擬 Agent 執行
            # 實際應呼叫: openclaw sessions_spawn agent="$agent_type" task="$task_desc"
        ) &
        
        local pid=$!
        success "Agent 已在背景啟動 (PID: $pid)"
        info "使用 'oc logs $agent_type' 查看日誌"
        
        # 更新狀態
        sed -i.bak 's/"status": "pending"/"status": "running"/' "${tasks_dir}/${task_id}.json" 2>/dev/null || true
        
    else
        # 前景執行
        info "啟動 Agent..."
        
        # 更新狀態
        sed -i.bak 's/"status": "pending"/"status": "running"/' "${tasks_dir}/${task_id}.json" 2>/dev/null || true
        sed -i.bak "s/\"started_at\": null/\"started_at\": \"$(date -Iseconds)\"/" "${tasks_dir}/${task_id}.json" 2>/dev/null || true
        
        # 模擬執行 (實際應整合 openclaw)
        echo ""
        echo -e "${CYAN}[Agent $agent_type]${NC} 開始執行任務..."
        echo -e "${CYAN}[Agent $agent_type]${NC} 任務: $task_desc"
        echo ""
        
        # 這裡應該實際呼叫 openclaw
        # openclaw sessions_spawn agent="$agent_type" task="$task_desc"
        
        # 模擬輸出
        for i in {1..3}; do
            echo -e "${BLUE}[$(date +%H:%M:%S)]${NC} 處理中... (${i}/3)"
            sleep 1
        done
        
        echo ""
        success "Agent 執行完成"
        
        # 更新完成狀態
        sed -i.bak 's/"status": "running"/"status": "completed"/' "${tasks_dir}/${task_id}.json" 2>/dev/null || true
        sed -i.bak "s/\"completed_at\": null/\"completed_at\": \"$(date -Iseconds)\"/" "${tasks_dir}/${task_id}.json" 2>/dev/null || true
        
        # 清理備份檔
        rm -f "${tasks_dir}/${task_id}.json.bak"
    fi
    
    echo ""
    info "任務記錄: ${tasks_dir}/${task_id}.json"
}
