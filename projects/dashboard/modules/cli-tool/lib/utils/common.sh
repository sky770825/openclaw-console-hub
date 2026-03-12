#!/usr/bin/env bash
# Common Utilities

# ============================================
# 錯誤處理
# ============================================
error() {
    echo -e "${RED}❌ $1${NC}" >&2
}

warn() {
    echo -e "${YELLOW}⚠️  $1${NC}" >&2
}

info() {
    echo -e "${BLUE}ℹ️  $1${NC}"
}

success() {
    echo -e "${GREEN}✅ $1${NC}"
}

# ============================================
# 檢查命令是否存在
# ============================================
cmd_exists() {
    command -v "$1" >/dev/null 2>&1
}

# ============================================
# 檢查 openclaw 是否安裝
# ============================================
check_openclaw() {
    if ! cmd_exists "openclaw"; then
        error "openclaw 未安裝或不在 PATH 中"
        info "請先安裝 openclaw: https://github.com/openclaw/openclaw"
        exit 1
    fi
}

# ============================================
# 檢查 Python 是否可用
# ============================================
check_python() {
    if cmd_exists "python3"; then
        echo "python3"
    elif cmd_exists "python"; then
        echo "python"
    else
        error "Python 未安裝"
        exit 1
    fi
}

# ============================================
# 執行 Python 輔助腳本
# ============================================
run_python() {
    local script="$1"
    shift
    local py=$(check_python)
    "$py" "${LIB_DIR}/utils/${script}.py" "$@"
}

# ============================================
# 讀取設定值
# ============================================
get_config() {
    local key="$1"
    local default="${2:-}"
    
    if [[ -f "$CONFIG_FILE" ]]; then
        local value
        value=$(grep "^${key}:" "$CONFIG_FILE" 2>/dev/null | sed 's/^[^:]*: *//' | tr -d '"' || echo "")
        echo "${value:-$default}"
    else
        echo "$default"
    fi
}

# ============================================
# 格式化輸出表格
# ============================================
print_table() {
    local headers=("$1")
    shift
    local data=("$@")
    
    # 簡易表格輸出
    printf "\n"
    printf "│ %-20s │ %-30s │\n" "項目" "狀態"
    printf "├──────────────────────┼────────────────────────────────┤\n"
    
    local i=0
    while [[ $i -lt ${#data[@]} ]]; do
        printf "│ %-20s │ %-30s │\n" "${data[$i]}" "${data[$((i+1))]}"
        i=$((i+2))
    done
    printf "\n"
}

# ============================================
# 顯示進度條
# ============================================
progress_bar() {
    local current="$1"
    local total="$2"
    local width=30
    
    local percent=$((current * 100 / total))
    local filled=$((current * width / total))
    local empty=$((width - filled))
    
    printf "\r["
    printf "%${filled}s" | tr ' ' '█'
    printf "%${empty}s" | tr ' ' '░'
    printf "] %d%%" "$percent"
}

# ============================================
# 確認提示
# ============================================
confirm() {
    local message="$1"
    local response
    
    echo -n "$message [y/N] "
    read -r response
    
    case "$response" in
        [yY][eE][sS]|[yY])
            return 0
            ;;
        *)
            return 1
            ;;
    esac
}

# ============================================
# 取得當前時間戳
# ============================================
timestamp() {
    date '+%Y-%m-%d %H:%M:%S'
}

# ============================================
# 記錄日誌
# ============================================
log() {
    local level="$1"
    local message="$2"
    local log_file="${CONFIG_DIR}/oc.log"
    
    echo "[$(timestamp)] [$level] $message" >> "$log_file"
}
