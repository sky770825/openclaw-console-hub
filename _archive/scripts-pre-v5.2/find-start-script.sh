#!/usr/bin/env bash
# 智能啟動腳本查找器 (find-start-script.sh)
# 根據項目目錄中的 package.json 自動推薦最佳啟動命令

set -euo pipefail

# 定義顏色
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[0;33m'
BLUE='\033[0;34m'
NC='\033[0m'

usage() {
    echo "用法: $0 [項目目錄]"
    echo "預設目錄為當前目錄"
}

TARGET_DIR="${1:-.}"

if [ ! -d "$TARGET_DIR" ]; then
    echo -e "${RED}錯誤: 目錄 $TARGET_DIR 不存在${NC}"
    exit 1
fi

# 轉換為絕對路徑
ABS_TARGET_DIR="$(cd "$TARGET_DIR" && pwd)"
PACKAGE_JSON="$ABS_TARGET_DIR/package.json"

if [ ! -f "$PACKAGE_JSON" ]; then
    echo -e "${YELLOW}警告: 在 $ABS_TARGET_DIR 中找不到 package.json${NC}"
    
    # 嘗試尋找其他常見的啟動檔案
    if [ -f "$ABS_TARGET_DIR/docker-compose.yml" ] || [ -f "$ABS_TARGET_DIR/docker-compose.yaml" ]; then
        echo -e "偵測到 Docker Compose 項目，推薦命令: ${GREEN}docker-compose up${NC}"
        echo "docker-compose up"
        exit 0
    elif [ -f "$ABS_TARGET_DIR/requirements.txt" ] || [ -f "$ABS_TARGET_DIR/main.py" ]; then
        echo -e "偵測到 Python 項目，推薦命令: ${GREEN}python3 main.py${NC}"
        echo "python3 main.py"
        exit 0
    elif [ -f "$ABS_TARGET_DIR/go.mod" ]; then
        echo -e "偵測到 Go 項目，推薦命令: ${GREEN}go run .${NC}"
        echo "go run ."
        exit 0
    fi
    
    echo -e "${RED}無法識別項目類型。${NC}"
    exit 2
fi

# 使用 jq 解析 package.json 中的 scripts
# 優先級: dev > start > serve > build
scripts=$(cat "$PACKAGE_JSON" | jq -r '.scripts | keys_unsorted[]' 2>/dev/null || true)

if [ -z "$scripts" ]; then
    echo -e "${YELLOW}項目中 package.json 沒有定義任何 scripts。${NC}"
    exit 3
fi

# 根據優先級查找最佳腳本
RECOMMENDED=""
for key in dev start serve build; do
    if echo "$scripts" | grep -qx "$key"; then
        RECOMMENDED="$key"
        break
    fi
done

# 如果沒找到預定義的，取第一個
if [ -z "$RECOMMENDED" ]; then
    RECOMMENDED=$(echo "$scripts" | head -n 1)
fi

# 偵測包管理器
LOCKFILE=""
PKG_MANAGER="npm"
if [ -f "$ABS_TARGET_DIR/pnpm-lock.yaml" ]; then
    PKG_MANAGER="pnpm"
elif [ -f "$ABS_TARGET_DIR/yarn.lock" ]; then
    PKG_MANAGER="yarn"
elif [ -f "$ABS_TARGET_DIR/bun.lockb" ]; then
    PKG_MANAGER="bun"
fi

RUN_CMD="$PKG_MANAGER run $RECOMMENDED"
if [ "$PKG_MANAGER" == "npm" ] && [ "$RECOMMENDED" == "start" ]; then
    RUN_CMD="npm start"
fi

echo -e "在 ${BLUE}$ABS_TARGET_DIR${NC} 偵測到最佳啟動命令: ${GREEN}$RUN_CMD${NC}"
echo "$RUN_CMD"
