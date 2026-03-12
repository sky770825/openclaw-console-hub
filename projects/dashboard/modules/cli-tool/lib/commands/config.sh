#!/usr/bin/env bash
# Command: config - 編輯設定檔

cmd_config_help() {
    cat << 'EOF'
用法: oc config [command] [選項]

管理 OpenClaw CLI 設定

指令:
  (無)                 編輯設定檔
  get <key>            取得設定值
  set <key> <value>    設定值
  reset                重設為預設值
  path                 顯示設定檔路徑

選項:
  --help               顯示此說明

範例:
  oc config                    # 編輯設定檔
  oc config get models.default # 取得預設模型
  oc config set webui.port 8080 # 設定端口
  oc config reset              # 重設設定
EOF
}

cmd_config() {
    # 無參數，開啟編輯器
    if [[ $# -eq 0 ]]; then
        edit_config
        return 0
    fi
    
    local action="$1"
    shift
    
    case "$action" in
        get)
            if [[ $# -lt 1 ]]; then
                error "請指定設定鍵"
                cmd_config_help
                return 1
            fi
            local key="$1"
            local value
            value=$(config_get "$key" "(未設定)")
            echo "$key: $value"
            ;;
        set)
            if [[ $# -lt 2 ]]; then
                error "請指定設定鍵和值"
                cmd_config_help
                return 1
            fi
            local key="$1"
            local value="$2"
            
            # 簡易設定更新 (使用 sed)
            if grep -q "^${key}:" "$CONFIG_FILE" 2>/dev/null; then
                sed -i.bak "s/^${key}:.*/${key}: \"${value}\"/" "$CONFIG_FILE"
                rm -f "${CONFIG_FILE}.bak"
                success "已更新: $key = $value"
            else
                # 新增設定
                echo "${key}: \"${value}\"" >> "$CONFIG_FILE"
                success "已新增: $key = $value"
            fi
            ;;
        reset)
            if confirm "確定要重設所有設定嗎？"; then
                rm -f "$CONFIG_FILE"
                init_config
                success "設定已重設為預設值"
            else
                info "已取消"
            fi
            ;;
        path)
            echo "$CONFIG_FILE"
            ;;
        --help)
            cmd_config_help
            ;;
        *)
            error "未知指令: $action"
            cmd_config_help
            return 1
            ;;
    esac
}
