#!/usr/bin/env bash
# Color Definitions

# 檢查是否啟用顏色
if [[ -t 1 ]] || [[ "${OC_COLORS:-true}" == "true" ]]; then
    # 基本顏色
    export RED='\033[0;31m'
    export GREEN='\033[0;32m'
    export YELLOW='\033[0;33m'
    export BLUE='\033[0;34m'
    export MAGENTA='\033[0;35m'
    export CYAN='\033[0;36m'
    export NC='\033[0m' # No Color
    
    # 粗體
    export BOLD='\033[1m'
    export RED_BOLD='\033[1;31m'
    export GREEN_BOLD='\033[1;32m'
    export YELLOW_BOLD='\033[1;33m'
    export BLUE_BOLD='\033[1;34m'
    
    # 背景色
    export BG_RED='\033[41m'
    export BG_GREEN='\033[42m'
    export BG_YELLOW='\033[43m'
else
    # 無顏色模式
    export RED=''
    export GREEN=''
    export YELLOW=''
    export BLUE=''
    export MAGENTA=''
    export CYAN=''
    export NC=''
    export BOLD=''
    export RED_BOLD=''
    export GREEN_BOLD=''
    export YELLOW_BOLD=''
    export BLUE_BOLD=''
    export BG_RED=''
    export BG_GREEN=''
    export BG_YELLOW=''
fi

# 狀態顏色函數
color_for_status() {
    local status="$1"
    case "$status" in
        running|active|online|healthy|success)
            echo -e "${GREEN}$status${NC}"
            ;;
        stopped|inactive|offline|error|failed)
            echo -e "${RED}$status${NC}"
            ;;
        pending|waiting|warning)
            echo -e "${YELLOW}$status${NC}"
            ;;
        *)
            echo "$status"
            ;;
    esac
}
