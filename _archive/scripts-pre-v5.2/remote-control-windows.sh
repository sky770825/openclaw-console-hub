#!/bin/bash
# ============================================================
# 小蔡 Windows 遠端控制工具 (MacBook 端)
# 從 MacBook 遠端控制 Windows 桌上型
# ============================================================

# 設定
WINDOWS_IP="${WINDOWS_IP:-192.168.1.100}"  # 預設 IP，請修改
WINDOWS_PORT="${WINDOWS_PORT:-8787}"
AUTH_TOKEN="xiaocai-2026"
BASE_URL="http://$WINDOWS_IP:$WINDOWS_PORT"

# 顏色
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
CYAN='\033[0;36m'
NC='\033[0m'

# 顯示標題
echo -e "${CYAN}"
echo "╔══════════════════════════════════════════════════════════╗"
echo "║                                                          ║"
echo "║     🎮 小蔡 Windows 遠端控制工具 (MacBook 端)           ║"
echo "║                                                          ║"
echo "╚══════════════════════════════════════════════════════════╝"
echo -e "${NC}"

echo -e "🖥️  Windows 目標: ${YELLOW}$WINDOWS_IP:$WINDOWS_PORT${NC}"
echo ""

# 檢查連線
check_connection() {
    echo -e "${BLUE}測試連線...${NC}"
    response=$(curl -s "$BASE_URL/health" 2>/dev/null)
    if [ $? -eq 0 ]; then
        echo -e "${GREEN}✅ 連線成功${NC}"
        echo "$response" | jq . 2>/dev/null || echo "$response"
        return 0
    else
        echo -e "${RED}❌ 無法連線到 $WINDOWS_IP:$WINDOWS_PORT${NC}"
        echo "請確認："
        echo "  1. Windows 已啟動遠端 Agent"
        echo "  2. 兩台電腦在同一區網"
        echo "  3. Windows 防火牆允許 port $WINDOWS_PORT"
        return 1
    fi
}

# 執行指令
exec_command() {
    local cmd="$1"
    local type="${2:-powershell}"
    
    echo -e "${BLUE}在 Windows 執行: $cmd${NC}"
    
    response=$(curl -s -X POST "$BASE_URL/api/exec" \
        -H "Content-Type: application/json" \
        -d "{\"auth\":\"$AUTH_TOKEN\",\"command\":\"$cmd\",\"type\":\"$type\"}" 2>/dev/null)
    
    echo "$response" | jq -r '.stdout' 2>/dev/null || echo "$response"
}

# 執行 Ollama
exec_ollama() {
    local model="$1"
    local prompt="$2"
    
    echo -e "${BLUE}在 Windows 執行 $model...${NC}"
    echo "提示詞: $prompt"
    echo ""
    
    response=$(curl -s -X POST "$BASE_URL/api/ollama" \
        -H "Content-Type: application/json" \
        -d "{\"auth\":\"$AUTH_TOKEN\",\"model\":\"$model\",\"prompt\":\"$prompt\"}" 2>/dev/null)
    
    echo -e "${GREEN}回應:${NC}"
    echo "$response" | jq -r '.response' 2>/dev/null || echo "$response"
}

# 瀏覽檔案
list_files() {
    local path="${1:-C:\}"
    
    echo -e "${BLUE}瀏覽目錄: $path${NC}"
    
    response=$(curl -s -X POST "$BASE_URL/api/files" \
        -H "Content-Type: application/json" \
        -d "{\"auth\":\"$AUTH_TOKEN\",\"action\":\"list\",\"path\":\"$path\"}" 2>/dev/null)
    
    echo "$response" | jq '.items[] | "\(.Type) | \(.Name) | \(if .Length then .Length else "-" end)"' 2>/dev/null || echo "$response"
}

# 讀取檔案
read_file() {
    local filepath="$1"
    
    echo -e "${BLUE}讀取檔案: $filepath${NC}"
    
    response=$(curl -s -X POST "$BASE_URL/api/files" \
        -H "Content-Type: application/json" \
        -d "{\"auth\":\"$AUTH_TOKEN\",\"action\":\"read\",\"path\":\"$filepath\"}" 2>/dev/null)
    
    echo "$response" | jq -r '.content' 2>/dev/null || echo "$response"
}

# 取得系統資訊
system_info() {
    echo -e "${BLUE}取得 Windows 系統資訊...${NC}"
    
    response=$(curl -s "$BASE_URL/api/system" \
        -H "Content-Type: application/json" \
        -d "{\"auth\":\"$AUTH_TOKEN\"}" 2>/dev/null)
    
    echo "$response" | jq . 2>/dev/null || echo "$response"
}

# 取得行程列表
list_processes() {
    echo -e "${BLUE}取得行程列表 (前 50)...${NC}"
    
    response=$(curl -s "$BASE_URL/api/processes" \
        -H "Content-Type: application/json" \
        -d "{\"auth\":\"$AUTH_TOKEN\"}" 2>/dev/null)
    
    echo "$response" | jq '.processes[] | "\(.Id) | \(.Name) | \(.CPU)"' 2>/dev/null || echo "$response"
}

# 取得服務列表
list_services() {
    echo -e "${BLUE}取得服務列表 (前 50)...${NC}"
    
    response=$(curl -s "$BASE_URL/api/services" \
        -H "Content-Type: application/json" \
        -d "{\"auth\":\"$AUTH_TOKEN\"}" 2>/dev/null)
    
    echo "$response" | jq '.services[] | "\(.Name) | \(.Status) | \(.StartType)"' 2>/dev/null || echo "$response"
}

# 螢幕截圖
take_screenshot() {
    echo -e "${BLUE}擷取 Windows 螢幕...${NC}"
    
    response=$(curl -s "$BASE_URL/api/screenshot" \
        -H "Content-Type: application/json" \
        -d "{\"auth\":\"$AUTH_TOKEN\"}" 2>/dev/null)
    
    # 儲存 base64 圖片
    base64_img=$(echo "$response" | jq -r '.screenshot_base64' 2>/dev/null)
    if [ "$base64_img" != "null" ] && [ -n "$base64_img" ]; then
        output_file="/tmp/windows_screenshot_$(date +%Y%m%d_%H%M%S).png"
        echo "$base64_img" | base64 -D > "$output_file"
        echo -e "${GREEN}✅ 截圖已儲存: $output_file${NC}"
        open "$output_file" 2>/dev/null || echo "請手動開啟: $output_file"
    else
        echo "$response" | jq . 2>/dev/null || echo "$response"
    fi
}

# 互動式選單
interactive_menu() {
    while true; do
        echo ""
        echo -e "${CYAN}═══════════════════════════════════════${NC}"
        echo -e "${CYAN}  小蔡 Windows 遠端控制選單${NC}"
        echo -e "${CYAN}═══════════════════════════════════════${NC}"
        echo ""
        echo "  1. 測試連線"
        echo "  2. 執行 PowerShell 指令"
        echo "  3. 執行 CMD 指令"
        echo "  4. 執行 Ollama 模型"
        echo "  5. 瀏覽檔案目錄"
        echo "  6. 讀取檔案內容"
        echo "  7. 系統資訊"
        echo "  8. 行程列表"
        echo "  9. 服務列表"
        echo "  10. 螢幕截圖"
        echo ""
        echo "  0. 結束"
        echo ""
        read -p "請選擇操作 (0-10): " choice
        
        case $choice in
            1) check_connection ;;
            2) 
                read -p "輸入 PowerShell 指令: " cmd
                exec_command "$cmd" "powershell"
                ;;
            3) 
                read -p "輸入 CMD 指令: " cmd
                exec_command "$cmd" "cmd"
                ;;
            4) 
                read -p "輸入模型名稱 (如 qwen2.5:14b): " model
                read -p "輸入提示詞: " prompt
                exec_ollama "$model" "$prompt"
                ;;
            5) 
                read -p "輸入目錄路徑 (如 C:\\Users): " path
                list_files "$path"
                ;;
            6) 
                read -p "輸入檔案路徑: " filepath
                read_file "$filepath"
                ;;
            7) system_info ;;
            8) list_processes ;;
            9) list_services ;;
            10) take_screenshot ;;
            0) 
                echo "再見！"
                exit 0
                ;;
            *) echo -e "${RED}無效的選擇${NC}" ;;
        esac
    done
}

# 主程式
main() {
    # 檢查參數
    if [ $# -eq 0 ]; then
        interactive_menu
        exit 0
    fi
    
    case "$1" in
        check)
            check_connection
            ;;
        exec|cmd)
            shift
            exec_command "$@"
            ;;
        ollama)
            shift
            model="$1"
            shift
            prompt="$*"
            exec_ollama "$model" "$prompt"
            ;;
        ls|list)
            shift
            list_files "$@"
            ;;
        cat|read)
            shift
            read_file "$@"
            ;;
        sys|system)
            system_info
            ;;
        ps|processes)
            list_processes
            ;;
        services)
            list_services
            ;;
        screenshot)
            take_screenshot
            ;;
        *)
            echo "用法: $0 [命令] [參數]"
            echo ""
            echo "命令:"
            echo "  check         測試連線"
            echo "  exec '指令'   執行 PowerShell 指令"
            echo "  ollama 模型 '提示詞'  執行 Ollama"
            echo "  ls [路徑]     瀏覽檔案"
            echo "  cat 檔案     讀取檔案"
            echo "  sys          系統資訊"
            echo "  ps           行程列表"
            echo "  services     服務列表"
            echo "  screenshot   螢幕截圖"
            echo ""
            echo "環境變數:"
            echo "  WINDOWS_IP    Windows IP (預設: 192.168.1.100)"
            echo "  WINDOWS_PORT  Windows Port (預設: 8787)"
            echo ""
            echo "範例:"
            echo "  WINDOWS_IP=192.168.1.50 $0 check"
            echo "  $0 exec 'Get-Process | Select -First 5'"
            echo "  $0 ollama qwen2.5:14b '幫我寫 Python 程式'"
            interactive_menu
            ;;
    esac
}

main "$@"
