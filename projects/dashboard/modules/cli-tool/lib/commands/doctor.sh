#!/usr/bin/env bash
# Command: doctor - 系統診斷

cmd_doctor_help() {
    cat << 'EOF'
用法: oc doctor [選項]

診斷系統健康度並檢查常見問題

選項:
  -f, --fix            嘗試自動修復問題
  -v, --verbose        詳細輸出
  --help               顯示此說明

範例:
  oc doctor                    # 執行診斷
  oc doctor -f                 # 診斷並嘗試修復
EOF
}

cmd_doctor() {
    local fix_mode=false
    local verbose=false
    
    # 解析參數
    while [[ $# -gt 0 ]]; do
        case "$1" in
            -f|--fix)
                fix_mode=true
                shift
                ;;
            -v|--verbose)
                verbose=true
                shift
                ;;
            --help)
                cmd_doctor_help
                return 0
                ;;
            *)
                error "未知選項: $1"
                cmd_doctor_help
                return 1
                ;;
        esac
    done
    
    echo -e "\n${BOLD}🏥 OpenClaw 系統診斷${NC}\n"
    
    local issues=0
    local fixed=0
    
    # 檢查 1: openclaw 安裝
    echo -n "檢查 openclaw 安裝... "
    if cmd_exists "openclaw"; then
        success "已安裝"
        if [[ "$verbose" == "true" ]]; then
            local version
            version=$(openclaw --version 2>/dev/null || echo "unknown")
            info "版本: $version"
        fi
    else
        error "未安裝"
        ((issues++))
        if [[ "$fix_mode" == "true" ]]; then
            info "請手動安裝 openclaw"
        fi
    fi
    
    # 檢查 2: CLI 設定目錄
    echo -n "檢查 CLI 設定目錄... "
    if [[ -d "$CONFIG_DIR" ]]; then
        success "已存在"
    else
        warn "不存在"
        if [[ "$fix_mode" == "true" ]]; then
            mkdir -p "$CONFIG_DIR"
            success "已建立"
            ((fixed++))
        fi
        ((issues++))
    fi
    
    # 檢查 3: 設定檔
    echo -n "檢查設定檔... "
    if [[ -f "$CONFIG_FILE" ]]; then
        success "已存在"
    else
        warn "不存在"
        if [[ "$fix_mode" == "true" ]]; then
            init_config
            success "已建立預設設定"
            ((fixed++))
        fi
        ((issues++))
    fi
    
    # 檢查 4: Python
    echo -n "檢查 Python... "
    if cmd_exists "python3" || cmd_exists "python"; then
        success "已安裝"
        if [[ "$verbose" == "true" ]]; then
            python3 --version 2>/dev/null || python --version
        fi
    else
        error "未安裝"
        ((issues++))
    fi
    
    # 檢查 5: Gateway 狀態
    echo -n "檢查 Gateway 狀態... "
    if openclaw gateway status >/dev/null 2>&1; then
        success "執行中"
    else
        warn "未執行"
        if [[ "$fix_mode" == "true" ]]; then
            info "嘗試啟動 Gateway..."
            if openclaw gateway start >/dev/null 2>&1; then
                success "已啟動"
                ((fixed++))
            else
                error "啟動失敗"
            fi
        fi
        ((issues++))
    fi
    
    # 檢查 6: Web UI
    echo -n "檢查 Web UI... "
    local webui_path="${HOME}/.openclaw/workspace/projects/dashboard/modules/web-ui"
    if [[ -d "$webui_path" ]]; then
        success "已安裝"
    else
        warn "未安裝"
        ((issues++))
    fi
    
    # 檢查 7: API 金鑰
    echo -n "檢查 API 金鑰... "
    local has_key=false
    if [[ -n "${KIMI_API_KEY:-}" ]] || [[ -n "${OPENAI_API_KEY:-}" ]] || [[ -n "${ANTHROPIC_API_KEY:-}" ]]; then
        success "已設定"
        has_key=true
    else
        warn "未設定"
        ((issues++))
    fi
    
    if [[ "$verbose" == "true" && "$has_key" == "true" ]]; then
        [[ -n "${KIMI_API_KEY:-}" ]] && info "✓ KIMI_API_KEY"
        [[ -n "${OPENAI_API_KEY:-}" ]] && info "✓ OPENAI_API_KEY"
        [[ -n "${ANTHROPIC_API_KEY:-}" ]] && info "✓ ANTHROPIC_API_KEY"
    fi
    
    # 檢查 8: 任務目錄
    echo -n "檢查任務目錄... "
    local tasks_dir="${HOME}/.openclaw/tasks"
    if [[ -d "$tasks_dir" ]]; then
        success "已存在"
    else
        warn "不存在"
        if [[ "$fix_mode" == "true" ]]; then
            mkdir -p "$tasks_dir"
            success "已建立"
            ((fixed++))
        fi
        ((issues++))
    fi
    
    # 總結
    echo ""
    echo -e "${BOLD}診斷結果${NC}"
    
    if [[ $issues -eq 0 ]]; then
        success "系統健康，未發現問題"
    else
        warn "發現 $issues 個問題"
        if [[ "$fix_mode" == "true" && $fixed -gt 0 ]]; then
            success "已自動修復 $fixed 個問題"
        fi
        if [[ $((issues - fixed)) -gt 0 ]]; then
            info "尚有 $((issues - fixed)) 個問題需要手動處理"
        fi
    fi
    
    return $issues
}
