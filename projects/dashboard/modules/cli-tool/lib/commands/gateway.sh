#!/usr/bin/env bash
# Command: gateway - Gateway 控制

cmd_gateway_help() {
    cat << 'EOF'
用法: oc gateway <command> [選項]

控制 OpenClaw Gateway 服務

指令:
  status               查看狀態
  start                啟動 Gateway
  stop                 停止 Gateway
  restart              重啟 Gateway
  logs                 查看日誌

選項:
  -f, --follow         持續追蹤日誌 (logs 指令)
  --help               顯示此說明

範例:
  oc gateway status            # 查看狀態
  oc gateway start             # 啟動 Gateway
  oc gateway logs -f           # 追蹤日誌
EOF
}

cmd_gateway() {
    if [[ $# -lt 1 ]]; then
        error "請指定指令"
        cmd_gateway_help
        return 1
    fi
    
    local action="$1"
    shift
    
    local follow=false
    
    # 解析參數
    while [[ $# -gt 0 ]]; do
        case "$1" in
            -f|--follow)
                follow=true
                shift
                ;;
            --help)
                cmd_gateway_help
                return 0
                ;;
            *)
                error "未知選項: $1"
                cmd_gateway_help
                return 1
                ;;
        esac
    done
    
    case "$action" in
        status)
            info "檢查 Gateway 狀態..."
            if openclaw gateway status 2>/dev/null; then
                success "Gateway 執行中"
            else
                warn "Gateway 未執行"
            fi
            ;;
        start)
            info "啟動 Gateway..."
            if openclaw gateway start; then
                success "Gateway 已啟動"
            else
                error "Gateway 啟動失敗"
                return 1
            fi
            ;;
        stop)
            info "停止 Gateway..."
            if openclaw gateway stop; then
                success "Gateway 已停止"
            else
                error "Gateway 停止失敗"
                return 1
            fi
            ;;
        restart)
            info "重啟 Gateway..."
            if openclaw gateway restart; then
                success "Gateway 已重啟"
            else
                error "Gateway 重啟失敗"
                return 1
            fi
            ;;
        logs)
            info "查看 Gateway 日誌..."
            local log_file="${CONFIG_DIR}/gateway.log"
            if [[ -f "$log_file" ]]; then
                if [[ "$follow" == "true" ]]; then
                    tail -f "$log_file"
                else
                    tail -n 50 "$log_file"
                fi
            else
                # 嘗試透過 openclaw 查看
                openclaw gateway logs 2>/dev/null || warn "無法取得日誌"
            fi
            ;;
        *)
            error "未知指令: $action"
            cmd_gateway_help
            return 1
            ;;
    esac
}
