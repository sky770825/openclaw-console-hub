#!/usr/bin/env bash
# Command: status - 系統總覽

cmd_status_help() {
    cat << 'EOF'
用法: oc status [選項]

顯示 OpenClaw 系統總覽

選項:
  -j, --json           以 JSON 格式輸出
  -q, --quiet          簡潔輸出
  --help               顯示此說明

範例:
  oc status                    # 完整狀態
  oc status -j                 # JSON 輸出
EOF
}

cmd_status() {
    local json_output=false
    local quiet=false
    
    # 解析參數
    while [[ $# -gt 0 ]]; do
        case "$1" in
            -j|--json)
                json_output=true
                shift
                ;;
            -q|--quiet)
                quiet=true
                shift
                ;;
            --help)
                cmd_status_help
                return 0
                ;;
            *)
                error "未知選項: $1"
                cmd_status_help
                return 1
                ;;
        esac
    done
    
    # 收集系統資訊
    local gateway_status="unknown"
    local webui_status="unknown"
    local active_agents=0
    local pending_tasks=0
    local default_model
    
    # 檢查 Gateway
    if pgrep -f "openclaw.*gateway" >/dev/null 2>&1 || openclaw gateway status >/dev/null 2>&1; then
        gateway_status="running"
    else
        gateway_status="stopped"
    fi
    
    # 檢查 Web UI
    local webui_port
    webui_port=$(config_get "webui.port" "3000")
    if lsof -i :"$webui_port" >/dev/null 2>&1; then
        webui_status="running"
    else
        webui_status="stopped"
    fi
    
    # 統計任務
    local tasks_dir="${HOME}/.openclaw/tasks"
    if [[ -d "$tasks_dir" ]]; then
        pending_tasks=$(find "$tasks_dir" -name "*.json" -exec grep -l '"status": "pending"' {} \; 2>/dev/null | wc -l)
        active_agents=$(find "$tasks_dir" -name "*.json" -exec grep -l '"status": "running"' {} \; 2>/dev/null | wc -l)
    fi
    
    # 讀取預設模型
    default_model=$(config_get "models.default" "kimi/kimi-k2.5")
    
    # JSON 輸出
    if [[ "$json_output" == "true" ]]; then
        cat << EOF
{
    "timestamp": "$(date -Iseconds)",
    "gateway": {
        "status": "$gateway_status"
    },
    "webui": {
        "status": "$webui_status",
        "port": $webui_port
    },
    "agents": {
        "active": $active_agents
    },
    "tasks": {
        "pending": $pending_tasks
    },
    "models": {
        "default": "$default_model"
    }
}
EOF
        return 0
    fi
    
    # 簡潔輸出
    if [[ "$quiet" == "true" ]]; then
        echo "Gateway: $gateway_status | WebUI: $webui_status | Agents: $active_agents | Tasks: $pending_tasks"
        return 0
    fi
    
    # 完整輸出
    echo -e "\n${BOLD}📊 OpenClaw 系統總覽${NC}\n"
    
    echo -e "${BOLD}核心服務${NC}"
    printf "  %-20s %b\n" "Gateway:" "$(color_for_status "$gateway_status")"
    printf "  %-20s %b\n" "Web UI:" "$(color_for_status "$webui_status")"
    echo ""
    
    echo -e "${BOLD}執行狀態${NC}"
    printf "  %-20s ${BOLD}%d${NC}\n" "活躍 Agents:" "$active_agents"
    printf "  %-20s ${YELLOW}%d${NC}\n" "等待任務:" "$pending_tasks"
    echo ""
    
    echo -e "${BOLD}模型設定${NC}"
    printf "  %-20s ${GREEN}%s${NC}\n" "預設模型:" "$default_model"
    echo ""
    
    echo -e "${BOLD}環境資訊${NC}"
    printf "  %-20s %s\n" "OpenClaw CLI:" "v${OC_VERSION}"
    printf "  %-20s %s\n" "設定檔:" "$CONFIG_FILE"
    printf "  %-20s %s\n" "時間:" "$(date '+%Y-%m-%d %H:%M:%S')"
    echo ""
}
