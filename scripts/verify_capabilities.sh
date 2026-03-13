#!/bin/bash

# ==========================================
# 達爾能力校驗腳本 (verify_capabilities.sh)
# 用於檢查執行環境中的核心工具可用性
# ==========================================

# 顏色定義
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

echo -e "${BLUE}==========================================${NC}"
echo -e "${BLUE}          達爾能力校驗系統啟動          ${NC}"
echo -e "${BLUE}==========================================${NC}"

FAILED_COUNT=0
TOTAL_COUNT=0

check_tool() {
    local name=$1
    local cmd_to_check=$2
    local version_cmd=$3
    
    TOTAL_COUNT=$((TOTAL_COUNT + 1))
    printf "[ ] 檢查 %-12s ... " "$name"
    
    if command -v "$cmd_to_check" > /dev/null 2>&1; then
        local version=""
        if [ -n "$version_cmd" ]; then
            # 獲取版本資訊並取第一行，過濾掉一些雜訊
            version=$(eval "$version_cmd" 2>/dev/null | head -n 1 | sed 's/version //g')
        fi
        echo -e "${GREEN}[PASS]${NC} ${version:+($version)}"
        return 0
    else
        echo -e "${RED}[FAIL]${NC} (未找到指令)"
        FAILED_COUNT=$((FAILED_COUNT + 1))
        return 1
    fi
}

# 1. 基礎 Shell 工具
check_tool "bash" "bash" "bash --version"
check_tool "curl" "curl" "curl --version"
check_tool "git" "git" "git --version"
check_tool "sed" "sed" "" # macOS sed 不支援 --version
check_tool "awk" "awk" ""
check_tool "grep" "grep" "grep --version"
check_tool "find" "find" ""

# 2. 程式語言環境
check_tool "node" "node" "node --version"
check_tool "python3" "python3" "python3 --version"

# 3. 資料處理工具
check_tool "jq" "jq" "jq --version"

# 4. 核心戰鬥工具 (Playwright)
# 優先檢查 npx 是否可用來執行 playwright
if command -v npx > /dev/null 2>&1; then
    TOTAL_COUNT=$((TOTAL_COUNT + 1))
    printf "[ ] 檢查 %-12s ... " "playwright"
    PW_VERSION=$(npx playwright --version 2>/dev/null)
    if [ $? -eq 0 ]; then
        echo -e "${GREEN}[PASS]${NC} ($PW_VERSION)"
    else
        echo -e "${RED}[FAIL]${NC} (npx 存在但 playwright 未安裝或報錯)"
        FAILED_COUNT=$((FAILED_COUNT + 1))
    fi
else
    check_tool "playwright" "playwright" "playwright --version"
fi

echo -e "${BLUE}==========================================${NC}"

if [ $FAILED_COUNT -eq 0 ]; then
    echo -e "${GREEN} 狀態確認：所有核心能力正常，達爾準備好戰鬥了！${NC}"
    exit 0
else
    echo -e "${RED} 狀態確認：發現 $FAILED_COUNT 個組件異常，能力受限！${NC}"
    exit 1
fi
