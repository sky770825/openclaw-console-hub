#!/bin/bash
set -e
export PATH="/usr/local/bin:/opt/homebrew/bin:/usr/bin:/bin:/usr/sbin:/sbin:$PATH"

SANDBOX_DIR="/Users/caijunchang/.openclaw/workspace/sandbox"
SERVER_DIR="$SANDBOX_DIR/server"

echo "Checking dependencies..."
if ! command -v node &> /dev/null; then
    echo "Error: node is not found."
    exit 1
fi

if ! command -v npm &> /dev/null; then
    # 嘗試從 node 路徑推斷 npm
    NODE_DIR=$(dirname "$(which node)")
    if [ -f "$NODE_DIR/npm" ]; then
        export PATH="$NODE_DIR:$PATH"
    else
        echo "Error: npm is not found and could not be located."
        exit 127
    fi
fi

# 前往 sandbox
cd "$SANDBOX_DIR"

# 初始化 server package.json (如果不存在)
if [ ! -f "server/package.json" ]; then
    echo "Initializing package.json in server directory..."
    cd server
    npm init -y
    cd ..
fi

# 執行任務核心命令
echo "Executing: npm install playwright --prefix server"
npm install playwright --prefix server

# 安裝 Chromium 二進制檔
echo "Executing: npx playwright install chromium"
cd server
npx playwright install chromium

echo "Playwright environment setup successful."
