#!/bin/bash
# OpenClaw Common Library
# 共用函數與變數定義
# 用法: source "$(dirname "$0")/../lib/common.sh"

set -euo pipefail

# ============================================
# 顏色定義
# ============================================
readonly COLOR_RED='\033[0;31m'
readonly COLOR_GREEN='\033[0;32m'
readonly COLOR_YELLOW='\033[1;33m'
readonly COLOR_BLUE='\033[0;34m'
readonly COLOR_CYAN='\033[0;36m'
readonly COLOR_NC='\033[0m' # No Color

# ============================================
# 日誌函數
# ============================================
log_info() {
    echo -e "${COLOR_BLUE}[INFO]${COLOR_NC} $1"
}

log_success() {
    echo -e "${COLOR_GREEN}[SUCCESS]${COLOR_NC} $1"
}

log_warning() {
    echo -e "${COLOR_YELLOW}[WARNING]${COLOR_NC} $1"
}

log_error() {
    echo -e "${COLOR_RED}[ERROR]${COLOR_NC} $1" >&2
}

log_debug() {
    if [[ "${DEBUG:-false}" == "true" ]]; then
        echo -e "${COLOR_CYAN}[DEBUG]${COLOR_NC} $1"
    fi
}

# ============================================
# 路徑與配置
# ============================================
get_openclaw_home() {
    echo "${OPENCLAW_HOME:-$HOME/.openclaw}"
}

get_workspace() {
    echo "${OPENCLAW_WORKSPACE:-$(get_openclaw_home)/workspace}"
}

get_scripts_dir() {
    echo "$(get_workspace)/scripts"
}

# ============================================
# 檔案操作
# ============================================
ensure_dir() {
    local dir="$1"
    if [[ ! -d "$dir" ]]; then
        mkdir -p "$dir"
        log_info "創建目錄: $dir"
    fi
}

file_exists() {
    [[ -f "$1" ]]
}

dir_exists() {
    [[ -d "$1" ]]
}

# ============================================
# 網路檢查
# ============================================
check_http_endpoint() {
    local url="$1"
    local timeout="${2:-5}"
    
    if command -v curl &> /dev/null; then
        curl -sf --max-time "$timeout" "$url" > /dev/null 2>&1
    elif command -v wget &> /dev/null; then
        wget -q --timeout="$timeout" -O /dev/null "$url" 2>/dev/null
    else
        log_error "找不到 curl 或 wget"
        return 1
    fi
}

# ============================================
# Telegram 通知
# ============================================
send_telegram_notification() {
    local message="$1"
    local bot_token="${TELEGRAM_BOT_TOKEN:-}"
    local chat_id="${TELEGRAM_CHAT_ID:-}"
    
    if [[ -z "$bot_token" || -z "$chat_id" ]]; then
        log_warning "Telegram 配置不完整，跳過通知"
        return 1
    fi
    
    curl -s -X POST "https://api.telegram.org/bot${bot_token}/sendMessage" \
        -d "chat_id=${chat_id}" \
        -d "text=${message}" \
        -d "parse_mode=HTML" > /dev/null 2>&1 || true
}

# ============================================
# 時間與時間戳
# ============================================
get_timestamp() {
    date '+%Y-%m-%d %H:%M:%S'
}

get_date_string() {
    date '+%Y%m%d_%H%M%S'
}

# ============================================
# 檢查命令存在
# ============================================
require_command() {
    local cmd="$1"
    if ! command -v "$cmd" &> /dev/null; then
        log_error "需要命令 '$cmd' 但未安裝"
        return 1
    fi
}

# ============================================
# JSON 輔助函數 (使用 Python 如果可用)
# ============================================
json_extract() {
    local json="$1"
    local key="$2"
    
    if command -v python3 &> /dev/null; then
        python3 -c "import json,sys; print(json.loads(sys.argv[1]).get(sys.argv[2], ''))" "$json" "$key" 2>/dev/null
    elif command -v jq &> /dev/null; then
        echo "$json" | jq -r ".$key" 2>/dev/null
    else
        log_error "需要 python3 或 jq 來解析 JSON"
        return 1
    fi
}

# ============================================
# 初始化檢查
# ============================================
init_common() {
    # 確保基本目錄存在
    ensure_dir "$(get_openclaw_home)"
    ensure_dir "$(get_workspace)"
    ensure_dir "$(get_scripts_dir)"
}

# 如果直接執行此腳本，顯示幫助
if [[ "${BASH_SOURCE[0]}" == "${0}" ]]; then
    echo "OpenClaw Common Library"
    echo "用法: source \"\$(dirname \"\$0\")/../lib/common.sh\""
    echo ""
    echo "可用的函數:"
    grep -E "^[a-z_]+\(\)" "$0" | sed 's/() {/()/g' | sed 's/^/  - /'
fi
