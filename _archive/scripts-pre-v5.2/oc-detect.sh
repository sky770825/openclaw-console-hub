#!/bin/bash
# OpenClaw 現場偵測與即時回饋腳本 (oc-detect.sh)
# 用於收集系統狀態、服務運行情況、錯誤日誌與前端狀態

set -u

# --- 配置 ---
LOG_DIR="logs"
TASKBOARD_API_URL="http://localhost:3011"
WORKSPACE_DIR="/Users/sky770825/.openclaw/workspace"

# 燈號定義
GREEN="🟢"
YELLOW="🟡"
RED="🔴"

# --- 輔助函式 ---
log_info() { echo -e "\033[0;32m[INFO]\033[0m $1"; }
log_warn() { echo -e "\033[1;33m[WARN]\033[0m $1"; }
log_err() { echo -e "\033[0;31m[ERROR]\033[0m $1"; }

# --- 1. 系統狀態收集 ---
collect_system_status() {
    # CPU Usage (macOS)
    local cpu_usage=$(top -l 1 | grep "CPU usage" | awk '{print $3}' | sed 's/%//' | cut -d. -f1)
    
    # RAM Usage (macOS - 簡化版)
    local vm_stats=$(vm_stat)
    local page_size=4096
    
    local pages_active=$(echo "$vm_stats" | awk '/Pages active/ {print $3}' | sed 's/\.//')
    local pages_wired=$(echo "$vm_stats" | awk '/Pages wired down/ {print $4}' | sed 's/\.//')
    local pages_compressed=$(echo "$vm_stats" | awk '/Pages occupied by compressor/ {print $5}' | sed 's/\.//')
    
    [ -z "$pages_active" ] && pages_active=0
    [ -z "$pages_wired" ] && pages_wired=0
    [ -z "$pages_compressed" ] && pages_compressed=0

    local used_gb=$(awk -v p1="$pages_active" -v p2="$pages_wired" -v p3="$pages_compressed" -v ps="$page_size" 'BEGIN {printf "%.1f", (p1 + p2 + p3) * ps / 1024 / 1024 / 1024}')
    local total_gb=24  # 已知硬編碼或動態獲取失敗時的預設值
    
    # 決定系統燈號
    local sys_status=$GREEN
    [ "$cpu_usage" -gt 70 ] && sys_status=$YELLOW
    [ "$cpu_usage" -gt 90 ] && sys_status=$RED
    
    local used_int=$(echo "$used_gb" | cut -d. -f1)
    [ "$used_int" -ge 18 ] && sys_status=$YELLOW
    [ "$used_int" -ge 22 ] && sys_status=$RED

    echo "### 🖥️ 系統資源 [$sys_status]"
    echo "- **CPU 使用率**: ${cpu_usage}%"
    echo "- **RAM 使用率**: ${used_gb}GB / ${total_gb}GB (24GB 總量)"
}

# --- 2. 服務狀態收集 ---
check_port_connectivity() {
    local name=$1
    local host=$2
    local port=$3
    local url=$4
    
    local port_ok=false
    local http_ok=false

    # 1. 端口連通性檢查 (使用 nc 或 Python 腳本)
    if command -v nc >/dev/null 2>&1; then
        if nc -z -w 2 "$host" "$port" >/dev/null 2>&1; then
            port_ok=true
        fi
    elif [ -f "scripts/check_port.py" ]; then
        if python3 scripts/check_port.py "$host" "$port" --timeout 2 >/dev/null 2>&1; then
            port_ok=true
        fi
    fi

    # 2. HTTP 應用層檢查 (如果提供了 URL)
    if [ "$port_ok" = true ] && [ -n "$url" ]; then
        if curl -s --max-time 2 "$url" >/dev/null 2>&1; then
            http_ok=true
        fi
    fi

    # 輸出狀態
    if [ "$port_ok" = true ]; then
        if [ -n "$url" ]; then
            if [ "$http_ok" = true ]; then
                echo "- **$name**: $GREEN 正常 (Port $port 且 HTTP 響應正常)"
            else
                echo "- **$name**: $YELLOW 端口連通但 HTTP 無響應 (Port $port)"
            fi
        else
            echo "- **$name**: $GREEN 正常 (Port $port 連通)"
        fi
    else
        echo "- **$name**: $RED 無法連線 (Port $port 斷開)"
    fi
}

collect_service_status() {
    echo "### ⚙️ 服務運行狀態"
    
    # Docker 容器狀態
    if command -v docker >/dev/null 2>&1; then
        local docker_running=$(docker info >/dev/null 2>&1 && echo "UP" || echo "DOWN")
        if [ "$docker_running" == "UP" ]; then
            echo "- **Docker Daemon**: $GREEN 運行中"
            local containers=$(docker ps --format "{{.Names}}: {{.Status}}")
            if [ -n "$containers" ]; then
                while IFS= read -r line; do
                    echo "  - $line"
                done <<< "$containers"
            else
                echo "  - (無執行中的容器)"
            fi
        else
            echo "- **Docker Daemon**: $RED 已停止"
        fi
    else
        echo "- **Docker**: 🟡 未安裝或不在 PATH 中"
    fi

    # 任務板後端 (3011)
    check_port_connectivity "任務板後端" "localhost" 3011 "$TASKBOARD_API_URL/api/health"

    # Ollama (11434)
    check_port_connectivity "Ollama 服務" "localhost" 11434 "http://localhost:11434/api/tags"
}

# --- 3. 日誌片段提取 ---
collect_logs() {
    echo "### 📝 關鍵日誌片段 (最近 10 條錯誤)"
    local found_error=false
    
    # 搜尋 logs 目錄下的 .log 檔案
    if [ -d "$LOG_DIR" ]; then
        local error_logs=$(grep -riE "error|exception|critical|failed" "$LOG_DIR" --include="*.log" | tail -n 10)
        if [ -n "$error_logs" ]; then
            echo "\`\`\`text"
            echo "$error_logs"
            echo "\`\`\`"
            found_error=true
        fi
    fi
    
    if [ "$found_error" = false ]; then
        echo "_近期無明顯錯誤日誌。_"
    fi
}

# --- 4. 前端/網頁狀態 (選用) ---
# 注意：這部分在 CLI 環境下較難直接截圖，除非有開啟的瀏覽器 session
collect_frontend_info() {
    echo "### 🌐 前端快照"
    # 這裡提供一個佔位符，告知 Agent 現場偵測時可利用 browser 工具
    echo "- _提示：若需查看實時網頁狀態，請使用 \`browser snapshot\` 指令。_"
}

# --- 執行並輸出 Markdown ---
main() {
    echo "# 🛡️ Agent 現場偵測報告"
    echo "生成時間: $(date '+%Y-%m-%d %H:%M:%S')"
    echo ""
    
    collect_system_status
    echo ""
    collect_service_status
    echo ""
    collect_logs
    echo ""
    collect_frontend_info
}

# 如果直接執行
if [[ "${BASH_SOURCE[0]}" == "${0}" ]]; then
    main
fi
