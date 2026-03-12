#!/usr/bin/env bash
# Command: dashboard - 啟動 Web UI

cmd_dashboard_help() {
    cat << 'EOF'
用法: oc dashboard [選項]

啟動 OpenClaw Web UI 控制台

選項:
  -p, --port <port>    指定端口 (預設: 3000)
  -h, --host <host>    指定主機 (預設: localhost)
  --no-open            不自動開啟瀏覽器
  -d, --detach         背景執行
  --help               顯示此說明

範例:
  oc dashboard                    # 預設啟動
  oc dashboard -p 8080           # 使用端口 8080
  oc dashboard -d                # 背景執行
EOF
}

cmd_dashboard() {
    local port=""
    local host=""
    local auto_open=true
    local detach=false
    
    # 解析參數
    while [[ $# -gt 0 ]]; do
        case "$1" in
            -p|--port)
                port="$2"
                shift 2
                ;;
            -h|--host)
                host="$2"
                shift 2
                ;;
            --no-open)
                auto_open=false
                shift
                ;;
            -d|--detach)
                detach=true
                shift
                ;;
            --help)
                cmd_dashboard_help
                return 0
                ;;
            *)
                error "未知選項: $1"
                cmd_dashboard_help
                return 1
                ;;
        esac
    done
    
    # 從設定檔讀取預設值
    port="${port:-$(config_get "webui.port" "3000")}"
    host="${host:-$(config_get "webui.host" "localhost")}"
    
    # Web UI 路徑
    local workspace="${HOME}/.openclaw/workspace"
    local webui_path="${workspace}/projects/dashboard/modules/web-ui"
    
    # 檢查 Web UI 是否存在
    if [[ ! -d "$webui_path" ]]; then
        warn "Web UI 目錄不存在: $webui_path"
        info "嘗試尋找替代路徑..."
        
        # 嘗試其他常見路徑
        local alt_paths=(
            "./projects/dashboard/modules/web-ui"
            "../web-ui"
            "../../web-ui"
        )
        
        for alt in "${alt_paths[@]}"; do
            if [[ -d "$alt" ]]; then
                webui_path="$alt"
                info "找到 Web UI: $webui_path"
                break
            fi
        done
    fi
    
    if [[ ! -d "$webui_path" ]]; then
        error "無法找到 Web UI 目錄"
        info "請確認 web-ui 已正確安裝"
        return 1
    fi
    
    info "啟動 Web UI..."
    info "路徑: $webui_path"
    info "URL: http://${host}:${port}"
    
    # 檢查端口是否被佔用
    if lsof -i :"$port" >/dev/null 2>&1; then
        warn "端口 $port 已被佔用"
        local new_port=$((port + 1))
        info "嘗試使用端口: $new_port"
        port=$new_port
    fi
    
    # 進入 Web UI 目錄
    cd "$webui_path" || exit 1
    
    # 檢查啟動方式
    if [[ -f "package.json" ]]; then
        # Node.js 專案
        if [[ ! -d "node_modules" ]]; then
            info "安裝依賴..."
            npm install
        fi
        
        local cmd="npm run dev -- --port $port --host $host"
        
        if [[ "$auto_open" == "true" ]]; then
            # 延遲開啟瀏覽器
            (sleep 3 && open "http://${host}:${port}") &
        fi
        
        if [[ "$detach" == "true" ]]; then
            nohup $cmd > "${CONFIG_DIR}/webui.log" 2>&1 &
            success "Web UI 已在背景啟動 (PID: $!)"
            info "日誌: ${CONFIG_DIR}/webui.log"
        else
            exec $cmd
        fi
        
    elif [[ -f "index.html" ]]; then
        # 靜態網頁
        if cmd_exists "python3"; then
            if [[ "$auto_open" == "true" ]]; then
                open "http://${host}:${port}"
            fi
            python3 -m http.server "$port" --bind "$host"
        else
            error "需要 Python3 來啟動靜態伺服器"
            return 1
        fi
    else
        error "未知的 Web UI 類型"
        return 1
    fi
}
