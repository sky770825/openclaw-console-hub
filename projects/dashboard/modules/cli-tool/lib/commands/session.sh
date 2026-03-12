#!/usr/bin/env bash
# Command: session - 當前會話狀態

cmd_session_help() {
    cat << 'EOF'
用法: oc session [選項]

顯示當前會話狀態

選項:
  -j, --json           JSON 格式輸出
  --help               顯示此說明

範例:
  oc session                   # 顯示會話資訊
  oc session -j                # JSON 輸出
EOF
}

cmd_session() {
    local json_output=false
    
    # 解析參數
    while [[ $# -gt 0 ]]; do
        case "$1" in
            -j|--json)
                json_output=true
                shift
                ;;
            --help)
                cmd_session_help
                return 0
                ;;
            *)
                error "未知選項: $1"
                cmd_session_help
                return 1
                ;;
        esac
    done
    
    # 嘗試取得會話資訊
    local session_info
    session_info=$(openclaw session_status 2>/dev/null || echo "unknown")
    
    if [[ "$json_output" == "true" ]]; then
        cat << EOF
{
    "session": {
        "status": "$session_info",
        "timestamp": "$(date -Iseconds)"
    },
    "environment": {
        "shell": "${SHELL##*/}",
        "term": "${TERM:-unknown}",
        "pwd": "$PWD"
    }
}
EOF
    else
        echo -e "\n${BOLD}📍 當前會話${NC}\n"
        echo "會話狀態: ${GREEN}$session_info${NC}"
        echo "Shell: ${SHELL##*/}"
        echo "終端: ${TERM:-unknown}"
        echo "工作目錄: $PWD"
        echo "時間: $(date '+%Y-%m-%d %H:%M:%S')"
        echo ""
    fi
}
