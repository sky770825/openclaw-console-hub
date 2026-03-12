#!/usr/bin/env bash
# Command: logs - 查看日誌

cmd_logs_help() {
    cat << 'EOF'
用法: oc logs [agent|service] [選項]

查看 Agent 或服務日誌

選項:
  -f, --follow         持續追蹤
  -n, --lines <num>    顯示行數 (預設: 50)
  --help               顯示此說明

範例:
  oc logs                      # 查看所有日誌
  oc logs coder                # 查看 coder agent 日誌
  oc logs gateway -f           # 追蹤 gateway 日誌
  oc logs -n 100               # 顯示最近 100 行
EOF
}

cmd_logs() {
    local target=""
    local follow=false
    local lines=50
    
    # 解析參數
    while [[ $# -gt 0 ]]; do
        case "$1" in
            -f|--follow)
                follow=true
                shift
                ;;
            -n|--lines)
                lines="$2"
                shift 2
                ;;
            --help)
                cmd_logs_help
                return 0
                ;;
            -*)
                error "未知選項: $1"
                cmd_logs_help
                return 1
                ;;
            *)
                if [[ -z "$target" ]]; then
                    target="$1"
                fi
                shift
                ;;
        esac
    done
    
    local log_file
    
    # 決定日誌來源
    case "$target" in
        "")
            # 預設系統日誌
            log_file="${CONFIG_DIR}/oc.log"
            ;;
        gateway)
            log_file="${CONFIG_DIR}/gateway.log"
            ;;
        webui|dashboard)
            log_file="${CONFIG_DIR}/webui.log"
            ;;
        *)
            # Agent 日誌
            log_file="${CONFIG_DIR}/agents/${target}.log"
            ;;
    esac
    
    # 檢查日誌檔案
    if [[ ! -f "$log_file" ]]; then
        warn "日誌檔案不存在: $log_file"
        
        # 嘗試透過 openclaw 取得
        if [[ -n "$target" ]]; then
            info "嘗試透過 openclaw 取得日誌..."
            # openclaw logs "$target" 2>/dev/null || true
        fi
        
        return 1
    fi
    
    # 顯示日誌
    info "顯示日誌: $log_file"
    echo ""
    
    if [[ "$follow" == "true" ]]; then
        tail -f -n "$lines" "$log_file"
    else
        tail -n "$lines" "$log_file"
    fi
}
