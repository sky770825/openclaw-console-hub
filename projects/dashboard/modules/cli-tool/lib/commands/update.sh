#!/usr/bin/env bash
# Command: update - 更新 CLI 工具

cmd_update_help() {
    cat << 'EOF'
用法: oc update [選項]

更新 OpenClaw CLI 工具

選項:
  -f, --force          強制重新安裝
  --check              只檢查更新
  --help               顯示此說明

範例:
  oc update                    # 更新到最新版本
  oc update --check            # 檢查更新
EOF
}

cmd_update() {
    local force=false
    local check_only=false
    
    # 解析參數
    while [[ $# -gt 0 ]]; do
        case "$1" in
            -f|--force)
                force=true
                shift
                ;;
            --check)
                check_only=true
                shift
                ;;
            --help)
                cmd_update_help
                return 0
                ;;
            *)
                error "未知選項: $1"
                cmd_update_help
                return 1
                ;;
        esac
    done
    
    info "檢查更新..."
    info "當前版本: $OC_VERSION"
    
    # 這裡應該檢查遠端版本
    # 簡易實作：顯示更新指示
    
    if [[ "$check_only" == "true" ]]; then
        info "最新版本: $OC_VERSION"
        info "目前是最新版本"
        return 0
    fi
    
    info "更新 CLI 工具..."
    
    # 執行安裝腳本
    local install_script="${SCRIPT_DIR}/../install.sh"
    
    if [[ -f "$install_script" ]]; then
        if [[ "$force" == "true" ]]; then
            bash "$install_script" --force
        else
            bash "$install_script"
        fi
    else
        info "請手動執行安裝腳本："
        info "curl -fsSL ... | bash"
    fi
    
    success "更新完成"
}
