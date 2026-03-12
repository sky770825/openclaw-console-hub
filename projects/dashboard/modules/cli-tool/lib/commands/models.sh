#!/usr/bin/env bash
# Command: models - 顯示模型狀態

cmd_models_help() {
    cat << 'EOF'
用法: oc models [選項]

顯示模型狀態與可用性

選項:
  -r, --refresh        重新整理快取
  -d, --detail         顯示詳細資訊
  -a, --available      只顯示可用模型
  --help               顯示此說明

範例:
  oc models                    # 顯示所有模型狀態
  oc models -r                 # 刷新並顯示
  oc models -a                 # 只顯示可用模型
EOF
}

cmd_models() {
    local refresh=false
    local detail=false
    local available_only=false
    
    # 解析參數
    while [[ $# -gt 0 ]]; do
        case "$1" in
            -r|--refresh)
                refresh=true
                shift
                ;;
            -d|--detail)
                detail=true
                shift
                ;;
            -a|--available)
                available_only=true
                shift
                ;;
            --help)
                cmd_models_help
                return 0
                ;;
            *)
                error "未知選項: $1"
                cmd_models_help
                return 1
                ;;
        esac
    done
    
    echo -e "\n${BOLD}🤖 模型狀態${NC}\n"
    
    # 定義模型列表
    declare -A models
    models=(
        ["kimi/kimi-k2.5"]="月之暗面 K2.5"
        ["gpt-4o"]="OpenAI GPT-4o"
        ["gpt-4o-mini"]="OpenAI GPT-4o Mini"
        ["claude-3-5-sonnet"]="Anthropic Claude 3.5"
        ["claude-3-opus"]="Anthropic Claude 3 Opus"
        ["grok/grok-4.1"]="xAI Grok 4.1"
        ["gemini-2.0-flash"]="Google Gemini Flash"
        ["ollama/llama3"]="Ollama Llama 3"
    )
    
    # 顯示表頭
    if [[ "$detail" == "true" ]]; then
        printf "%-25s %-25s %-12s %-15s %s\n" "模型 ID" "名稱" "狀態" "回應時間" "備註"
        printf "%-25s %-25s %-12s %-15s %s\n" "-------------------------" "-------------------------" "------------" "---------------" "----"
    else
        printf "%-25s %-25s %-12s %s\n" "模型 ID" "名稱" "狀態" "備註"
        printf "%-25s %-25s %-12s %s\n" "-------------------------" "-------------------------" "------------" "----"
    fi
    
    # 檢查各模型狀態
    for model_id in "${!models[@]}"; do
        local model_name="${models[$model_id]}"
        local status="unknown"
        local latency="-"
        local note=""
        
        # 檢查模型可用性
        case "$model_id" in
            "kimi/kimi-k2.5")
                if [[ -n "${KIMI_API_KEY:-}" ]]; then
                    status="available"
                    latency="~500ms"
                    note="預設"
                else
                    status="unconfigured"
                    note="需設定 KIMI_API_KEY"
                fi
                ;;
            "gpt-4o"|"gpt-4o-mini")
                if [[ -n "${OPENAI_API_KEY:-}" ]]; then
                    status="available"
                    latency="~800ms"
                else
                    status="unconfigured"
                    note="需設定 OPENAI_API_KEY"
                fi
                ;;
            "claude-3-5-sonnet"|"claude-3-opus")
                if [[ -n "${ANTHROPIC_API_KEY:-}" ]]; then
                    status="available"
                    latency="~1s"
                else
                    status="unconfigured"
                    note="需設定 ANTHROPIC_API_KEY"
                fi
                ;;
            "grok/grok-4.1")
                if [[ -n "${XAI_API_KEY:-}" ]]; then
                    status="available"
                    latency="~600ms"
                else
                    status="unconfigured"
                    note="需設定 XAI_API_KEY"
                fi
                ;;
            "gemini-2.0-flash")
                if [[ -n "${GOOGLE_API_KEY:-}" ]]; then
                    status="available"
                    latency="~400ms"
                else
                    status="unconfigured"
                    note="需設定 GOOGLE_API_KEY"
                fi
                ;;
            "ollama/llama3")
                if pgrep -x "ollama" >/dev/null 2>&1 || curl -s http://localhost:11434/api/tags >/dev/null 2>&1; then
                    status="available"
                    latency="~2s"
                    note="本地"
                else
                    status="offline"
                    note="需啟動 Ollama"
                fi
                ;;
        esac
        
        # 過濾不可用模型
        if [[ "$available_only" == "true" && "$status" != "available" ]]; then
            continue
        fi
        
        # 格式化狀態
        local status_colored
        status_colored=$(color_for_status "$status")
        
        if [[ "$detail" == "true" ]]; then
            printf "%-25s %-25s %-12b %-15s %s\n" "$model_id" "$model_name" "$status_colored" "$latency" "$note"
        else
            printf "%-25s %-25s %-12b %s\n" "$model_id" "$model_name" "$status_colored" "$note"
        fi
    done
    
    echo ""
    
    # 顯示當前預設模型
    local default_model
    default_model=$(config_get "models.default" "kimi/kimi-k2.5")
    info "當前預設模型: ${BOLD}$default_model${NC}"
}
